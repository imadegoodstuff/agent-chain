import type { Metadata } from "next";
import { readDocWithFallback } from "@/lib/docs";
import { DocShell } from "@/components/docs/DocShell";
import { PhaseCard } from "@/components/sections/RoadmapPreview";
import { ROADMAP } from "@/lib/spec";
import { getLang } from "@/lib/lang";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const lang = await getLang((await searchParams).lang);
  return lang === "zh"
    ? { title: "路线图", description: "AGENT CHAIN 路线图：Devnet（已上线）→ Testnet → Mainnet Beta → 流式预确认 → 扩容与结算。" }
    : { title: "Roadmap", description: "AGENT CHAIN roadmap: Devnet (live) → Testnet → Mainnet Beta → Streaming preconfirmations → Scale & settlement." };
}

export default async function RoadmapPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const sp = await searchParams;
  const lang = await getLang(sp.lang);
  const doc = readDocWithFallback("roadmap", lang);
  return (
    <DocShell
      doc={doc}
      base="/roadmap"
      lang={lang}
      kicker={lang === "zh" ? "路线图" : "Roadmap"}
      fallbackTitle={lang === "zh" ? "路线图 — 即将发布" : "Roadmap — publishing"}
    >
      <div className="pt-10">
        <div className="label mb-5">{lang === "zh" ? "阶段 · 来自 SPEC" : "Phases · from SPEC"}</div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {ROADMAP.map((p) => (
            <PhaseCard key={p.phase} p={p} full />
          ))}
        </div>
      </div>
    </DocShell>
  );
}
