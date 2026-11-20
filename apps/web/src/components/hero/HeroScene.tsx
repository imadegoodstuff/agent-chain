"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildLattice } from "./lattice";

/* ------------------------------------------------------------------ */
/* Shaders                                                             */
/* ------------------------------------------------------------------ */

const vert = /* glsl */ `
  attribute vec3 aSwarm;
  attribute vec3 aLattice;
  attribute float aSeed;
  attribute float aSize;
  attribute float aHue;

  uniform float uTime;
  uniform float uProgress;   // 0 = swarm, 1 = lattice
  uniform float uPixelRatio;
  uniform float uFocus;      // z of the focal plane in view space (negative)

  varying float vAlpha;
  varying float vHue;
  varying float vBlur;

  // cheap 3D noise-ish drift
  vec3 drift(vec3 p, float s, float t) {
    return vec3(
      sin(t * 0.37 + s * 17.0 + p.y * 0.35),
      cos(t * 0.29 + s * 11.0 + p.x * 0.31),
      sin(t * 0.23 + s * 23.0 + p.z * 0.4)
    );
  }

  void main() {
    // Per-particle progress offset so the structure forms in waves, not all at once.
    float wave = clamp(uProgress * 1.35 - aSeed * 0.35, 0.0, 1.0);
    float e = wave * wave * (3.0 - 2.0 * wave); // smoothstep

    vec3 swarmPos = aSwarm + drift(aSwarm, aSeed, uTime) * 1.1;
    // tiny breathing jitter once formed
    vec3 latPos = aLattice + drift(aLattice, aSeed, uTime * 0.8) * 0.018;
    vec3 pos = mix(swarmPos, latPos, e);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    // depth-of-field-like falloff: blur + dim away from focal plane
    float dz = abs(mv.z - uFocus);
    float blur = clamp(dz / 9.0, 0.0, 1.0);
    vBlur = blur;

    float base = aSize * (1.0 + e * 0.25);
    gl_PointSize = base * uPixelRatio * (40.0 / -mv.z) * (1.0 + blur * 1.6);

    vAlpha = (0.35 + e * 0.65) * (1.0 - blur * 0.75);
    vHue = aHue;
  }
`;

const frag = /* glsl */ `
  precision mediump float;
  varying float vAlpha;
  varying float vHue;
  varying float vBlur;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    float core = smoothstep(1.0, 0.0, d);
    float soft = mix(pow(core, 2.2), pow(core, 0.9), vBlur);
    // amber #F0B35B with slight hue variance toward amber-deep / pale gold
    vec3 amber = vec3(0.941, 0.702, 0.357);
    vec3 deep  = vec3(0.788, 0.518, 0.180);
    vec3 pale  = vec3(1.000, 0.860, 0.600);
    vec3 col = vHue < 0.0 ? mix(amber, deep, -vHue * 0.8) : mix(amber, pale, vHue * 0.7);
    gl_FragColor = vec4(col * soft, soft * vAlpha);
  }
`;

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

type Props = { count: number; onReady?: () => void };

function Swarm({ count, onReady }: Props) {
  const data = useMemo(() => buildLattice(count), [count]);
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const lineMatRef = useRef<THREE.LineBasicMaterial>(null);
  const { viewport, pointer, gl } = useThree();
  const startRef = useRef<number | null>(null);

  const dpr = Math.min(gl.getPixelRatio(), 1.5);

  const pointGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(data.lattice.slice(), 3));
    g.setAttribute("aSwarm", new THREE.BufferAttribute(data.swarm, 3));
    g.setAttribute("aLattice", new THREE.BufferAttribute(data.lattice, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(data.seed, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(data.size, 1));
    g.setAttribute("aHue", new THREE.BufferAttribute(data.hue, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 30);
    return g;
  }, [data]);

  const lineGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(data.edges.length * 3);
    for (let i = 0; i < data.edges.length; i++) {
      const n = data.edges[i];
      pos[i * 3] = data.nodes[n * 3];
      pos[i * 3 + 1] = data.nodes[n * 3 + 1];
      pos[i * 3 + 2] = data.nodes[n * 3 + 2];
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 30);
    return g;
  }, [data]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uPixelRatio: { value: dpr },
      uFocus: { value: -14 },
    }),
    [dpr],
  );

  useEffect(() => {
    onReady?.();
    return () => {
      pointGeom.dispose();
      lineGeom.dispose();
    };
  }, [onReady, pointGeom, lineGeom]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (startRef.current === null) startRef.current = t;
    const local = t - startRef.current;

    // Formation curve: assemble over ~7 s, hold, breathe, partially dissolve every ~34 s and re-form.
    const cycle = 34;
    const c = local % cycle;
    let p: number;
    if (local < 7) p = Math.min(1, local / 7);
    else if (c > 26 && c < 30) p = 1 - 0.55 * Math.sin(((c - 26) / 4) * Math.PI);
    else p = 1;
    // hint of life: never perfectly static
    p = Math.min(1, p) * (0.985 + 0.015 * Math.sin(t * 0.6));

    if (matRef.current) {
      matRef.current.uniforms.uTime.value = t;
      matRef.current.uniforms.uProgress.value = p;
    }
    if (lineMatRef.current) {
      const target = Math.max(0, (p - 0.55) / 0.45);
      lineMatRef.current.opacity += (target * 0.3 - lineMatRef.current.opacity) * 0.05;
    }

    if (groupRef.current) {
      const g = groupRef.current;
      const px = pointer.x; // -1..1
      const py = pointer.y;
      // slow rotation + mouse parallax (lerped)
      g.rotation.z += 0.0009;
      g.rotation.x += ((-1.0 + py * 0.08) - g.rotation.x) * 0.04;
      g.rotation.y += ((-0.25 + px * 0.12) - g.rotation.y) * 0.04;
      g.position.x += ((offX + px * 0.25) - g.position.x) * 0.04;
      g.position.y += ((offY + py * 0.15) - g.position.y) * 0.04;
    }
  });

  // scale lattice to viewport so it reads well on narrow screens; on wide
  // screens park it to the right of the copy.
  const wide = viewport.width > 13;
  const scale = Math.min(1, viewport.width / 16) * (wide ? 1.1 : 0.95);
  const offX = wide ? viewport.width * 0.24 : 0;
  const offY = wide ? 0.9 : 1.6;

  return (
    <group ref={groupRef} rotation={[-0.95, 0, 0]} scale={scale}>
      <points ref={pointsRef} geometry={pointGeom} frustumCulled={false}>
        <shaderMaterial
          ref={matRef}
          vertexShader={vert}
          fragmentShader={frag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineSegments ref={linesRef} geometry={lineGeom} frustumCulled={false}>
        <lineBasicMaterial
          ref={lineMatRef}
          color="#F0B35B"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
}

function Rig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, -1.2, 14.5);
    camera.lookAt(0, 0.4, 0);
  }, [camera]);
  return null;
}

export default function HeroScene({ count, onReady }: Props) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance", stencil: false, depth: false }}
      camera={{ fov: 42, near: 0.1, far: 100 }}
      style={{ position: "absolute", inset: 0 }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x0b0c10, 0);
      }}
    >
      <Rig />
      <Swarm count={count} onReady={onReady} />
    </Canvas>
  );
}
