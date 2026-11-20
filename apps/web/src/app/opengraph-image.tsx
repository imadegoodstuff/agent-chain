import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "AGENT CHAIN — Intelligence is gas.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Hex lattice points for the background mark.
function hexPoints(rings: number, r: number, cx: number, cy: number) {
  const pts: [number, number][] = [];
  for (let q = -rings; q <= rings; q++) {
    for (let s = -rings; s <= rings; s++) {
      const rr = -q - s;
      if (Math.abs(rr) > rings) continue;
      const x = cx + r * Math.sqrt(3) * (q + s / 2);
      const y = cy + r * 1.5 * s;
      pts.push([x, y]);
    }
  }
  return pts;
}

export default function OG() {
  const pts = hexPoints(5, 38, 930, 315);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0B0C10",
          color: "#EDE6DA",
          fontFamily: "Inter, ui-sans-serif, system-ui",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(600px 400px at 78% 50%, rgba(240,179,91,0.18), transparent 70%)",
          }}
        />
        <svg width="1200" height="630" style={{ position: "absolute", inset: 0 }}>
          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 7 === 0 ? 4 : 2.2} fill="#F0B35B" opacity={0.25 + ((i * 37) % 60) / 100} />
          ))}
          <path d="M930 215 1016 265v100l-86 50-86-50V265l86-50Z" fill="none" stroke="#F0B35B" strokeWidth="2" opacity="0.9" />
          <path d="M930 265 973 290v50l-43 25-43-25v-50l43-25Z" fill="#F0B35B" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, width: 760 }}>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 18,
              letterSpacing: 4,
              color: "#9A948A",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 5, background: "#5BD39A", display: "flex" }} />
            AGENT CHAIN · AGENT-NATIVE L2 ON BNB CHAIN · MAINNET BETA LIVE · CHAIN 1119
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 92, fontWeight: 600, letterSpacing: -4, lineHeight: 1 }}>Intelligence is gas.</div>
            <div style={{ fontSize: 28, color: "#9A948A", marginTop: 26, lineHeight: 1.35 }}>
              Blockspace priced in Anthropic. Every account is a human&apos;s agent.
            </div>
          </div>
          <div style={{ display: "flex", gap: 36, fontFamily: "monospace", fontSize: 18, color: "#F0B35B", letterSpacing: 2 }}>
            <span>250 MS BLOCKS</span>
            <span>GAS = ANTB</span>
            <span>CHAIN 11190</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
