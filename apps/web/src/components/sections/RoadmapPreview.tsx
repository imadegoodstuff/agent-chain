"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Section, SectionHeader } from "../ui/Section";
import { Item, Reveal, Stagger } from "../ui/Reveal";
import { ROADMAP, roadmapItemDone, roadmapItemText } from "@/lib/spec";
import { useL } from "../LangProvider";

export function PhaseCard({ p, full = false }: { p: (typeof ROADMAP)[number]; full?: boolean }) {
  return (
    <div className={`relative flex h-full flex-col bg-surface p-6 ${p.live ? "ring-1 ring-inset ring-amber/40" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="label">{p.phase}</span>
        {p.live ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-green/40 bg-green/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-green">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-green" />
            Live
          </span>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{p.when}</span>
        )}
      </div>
      <div className="mt-3 text-lg font-medium leading-snug text-bone">{p.title}</div>
      {p.live && <div className="mt-1 font-mono text-[11px] text-muted">{p.when}</div>}
      <ul className={`mt-4 space-y-1.5 text-sm text-muted ${full ? "" : "line-clamp-[8]"}`}>
        {p.items.map((it) => {
          const text = roadmapItemText(it);
          const done = roadmapItemDone(it);
          return (
            <li key={text} className="flex gap-2">
              {done ? (
                <Check size={12} className="mt-[5px] shrink-0 text-green" />
              ) : (
                <span className={`mt-[9px] h-1 w-1 shrink-0 rounded-full ${p.live ? "bg-green" : "bg-line"}`} />
              )}
              <span className={done ? "text-bone" : ""}>
                {text}
                {done && <span className="ml-1.5 font-mono text-[10px] uppercase tracking-wider text-green">done</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function RoadmapPreview() {
  const L = useL();
  return (
    <Section id="roadmap">
      <SectionHeader
        index="08"
        titleKey="s_roadmap"
        heading={L("Devnet now. Testnet and Mainnet Beta in December. Streaming in Q1.", "现在是 Devnet。12 月 Testnet 与 Mainnet Beta。Q1 流式预确认。")}
      />
      <Stagger className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-5" gap={0.06}>
        {ROADMAP.map((p) => (
          <Item key={p.phase} className="h-full">
            <PhaseCard p={p} />
          </Item>
        ))}
      </Stagger>
      <Reveal delay={0.1}>
        <Link href="/roadmap" className="mt-8 inline-flex items-center gap-2 text-sm text-amber hover:underline">
          {L("Full roadmap", "完整路线图")} <ArrowRight size={14} />
        </Link>
      </Reveal>
    </Section>
  );
}
