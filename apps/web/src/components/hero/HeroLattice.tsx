/**
 * Static SVG lattice: used for prefers-reduced-motion, no-WebGL, and as the
 * placeholder while the 3D canvas lazy-loads.
 */
export function HeroLattice({ className = "" }: { className?: string }) {
  const rings = 7;
  const s = 34;
  const pts: { x: number; y: number; k: string }[] = [];
  const map = new Map<string, { x: number; y: number }>();
  for (let q = -rings; q <= rings; q++) {
    for (let r = -rings; r <= rings; r++) {
      if (Math.abs(-q - r) > rings) continue;
      const x = 780 + s * Math.sqrt(3) * (q + r / 2);
      const y = 360 + s * 1.5 * r * 0.72;
      const k = `${q},${r}`;
      map.set(k, { x, y });
      pts.push({ x, y, k });
    }
  }
  const lines: string[] = [];
  for (const [k, a] of map) {
    const [q, r] = k.split(",").map(Number);
    for (const [dq, dr] of [
      [1, 0],
      [0, 1],
      [-1, 1],
    ]) {
      const b = map.get(`${q + dq},${r + dr}`);
      if (b) lines.push(`M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
    }
  }
  return (
    <svg viewBox="0 0 1200 680" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id="hl-g" cx="65%" cy="53%" r="45%">
          <stop offset="0%" stopColor="#F0B35B" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#F0B35B" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#F0B35B" stopOpacity="0" />
        </radialGradient>
        <mask id="hl-m">
          <rect width="1200" height="680" fill="url(#hl-g)" />
        </mask>
      </defs>
      <g mask="url(#hl-m)">
        <path d={lines.join("")} stroke="#F0B35B" strokeOpacity="0.28" strokeWidth="0.8" fill="none" />
        {pts.map((p) => (
          <circle key={p.k} cx={p.x} cy={p.y} r={1.6} fill="#F0B35B" />
        ))}
      </g>
    </svg>
  );
}
