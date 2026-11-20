/**
 * Geometry for the hero: a hexagonal lattice of nodes (axial coords) plus the
 * particle buffers that morph between a dispersed swarm and the lattice.
 */

export type LatticeData = {
  nodeCount: number;
  nodes: Float32Array; // xyz per node
  edges: Uint32Array; // pairs of node indices
  particleCount: number;
  swarm: Float32Array; // xyz
  lattice: Float32Array; // xyz
  seed: Float32Array; // per particle random
  size: Float32Array; // per particle base size
  hue: Float32Array; // per particle hue variance (-1..1)
};

// Small deterministic PRNG so SSR/CSR and reloads look identical.
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildLattice(particleCount: number, rings = 9, spacing = 0.62): LatticeData {
  const rand = mulberry32(1119);

  // --- nodes (axial hex grid, pointy-top) with a slow dome in z ---
  const nodesArr: number[] = [];
  const index = new Map<string, number>();
  for (let q = -rings; q <= rings; q++) {
    for (let r = -rings; r <= rings; r++) {
      const s = -q - r;
      if (Math.abs(s) > rings) continue;
      const x = spacing * Math.sqrt(3) * (q + r / 2);
      const y = spacing * 1.5 * r;
      const d = Math.hypot(x, y);
      const z = -0.045 * d * d + 0.25 * Math.sin(q * 0.9) * Math.cos(r * 0.7);
      index.set(`${q},${r}`, nodesArr.length / 3);
      nodesArr.push(x, y, z);
    }
  }
  const nodeCount = nodesArr.length / 3;
  const nodes = new Float32Array(nodesArr);

  // --- edges to the three "forward" neighbours (each undirected edge once) ---
  const edgesArr: number[] = [];
  const dirs: [number, number][] = [
    [1, 0],
    [0, 1],
    [-1, 1],
  ];
  for (const [key, i] of index) {
    const [q, r] = key.split(",").map(Number);
    for (const [dq, dr] of dirs) {
      const j = index.get(`${q + dq},${r + dr}`);
      if (j !== undefined) edgesArr.push(i, j);
    }
  }
  const edges = new Uint32Array(edgesArr);

  // --- particles ---
  const swarm = new Float32Array(particleCount * 3);
  const lattice = new Float32Array(particleCount * 3);
  const seed = new Float32Array(particleCount);
  const size = new Float32Array(particleCount);
  const hue = new Float32Array(particleCount);

  const edgeCount = edges.length / 2;
  for (let i = 0; i < particleCount; i++) {
    // swarm: random point in a flattened ellipsoid, biased outward
    const u = rand();
    const v = rand();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const rad = 9 + 7 * Math.cbrt(rand());
    swarm[i * 3] = rad * Math.sin(phi) * Math.cos(theta) * 1.4;
    swarm[i * 3 + 1] = rad * Math.sin(phi) * Math.sin(theta) * 0.9;
    swarm[i * 3 + 2] = rad * Math.cos(phi) * 0.7 - 2;

    // lattice: 55% cluster on nodes, 45% distributed along edges
    let x: number, y: number, z: number;
    if (rand() < 0.55) {
      const n = Math.floor(rand() * nodeCount);
      const g = 0.075;
      // gaussian-ish via sum of uniforms
      const gx = (rand() + rand() + rand() - 1.5) * g;
      const gy = (rand() + rand() + rand() - 1.5) * g;
      const gz = (rand() + rand() + rand() - 1.5) * g;
      x = nodes[n * 3] + gx;
      y = nodes[n * 3 + 1] + gy;
      z = nodes[n * 3 + 2] + gz;
      size[i] = 1.0 + rand() * 1.4;
    } else {
      const e = Math.floor(rand() * edgeCount);
      const a = edges[e * 2];
      const b = edges[e * 2 + 1];
      const t = rand();
      const j = 0.02;
      x = nodes[a * 3] + (nodes[b * 3] - nodes[a * 3]) * t + (rand() - 0.5) * j;
      y = nodes[a * 3 + 1] + (nodes[b * 3 + 1] - nodes[a * 3 + 1]) * t + (rand() - 0.5) * j;
      z = nodes[a * 3 + 2] + (nodes[b * 3 + 2] - nodes[a * 3 + 2]) * t + (rand() - 0.5) * j;
      size[i] = 0.55 + rand() * 0.6;
    }
    lattice[i * 3] = x;
    lattice[i * 3 + 1] = y;
    lattice[i * 3 + 2] = z;

    seed[i] = rand();
    hue[i] = rand() * 2 - 1;
  }

  return { nodeCount, nodes, edges, particleCount, swarm, lattice, seed, size, hue };
}
