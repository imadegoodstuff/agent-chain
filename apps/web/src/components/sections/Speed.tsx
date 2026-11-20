"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Section, SectionHeader } from "../ui/Section";
import { Item, Reveal, Stagger } from "../ui/Reveal";
import { useL } from "../LangProvider";

const lines = [
  { t: 0, s: "$ agentchain send --to 0x9f…e1 --value 0.01", c: "text-bone" },
  { t: 420, s: "→ sequencer sin · tx 0x7c1e…9a0f", c: "text-muted" },
  { t: 490, s: "✓ preconf receipt  71 ms  sig 0x1b…", c: "text-amber" },
  { t: 740, s: "✓ block #412,988  +250 ms  FCFS pos 3", c: "text-green" },
  { t: 2600, s: "✓ bsc #58,112,004  +1.9 s  finalized", c: "text-green" },
  { t: 3400, s: "fee $0.0009 · 0.0000097 ANTB · 21,000 gas", c: "text-muted" },
];

function Terminal() {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? lines.length : 0);
  useEffect(() => {
    if (reduce) return;
    let alive = true;
    const run = () => {
      setN(0);
      lines.forEach((l, i) =>
        setTimeout(() => {
          if (alive) setN(i + 1);
        }, l.t + 300),
      );
      setTimeout(() => alive && run(), 7000);
    };
    run();
    return () => {
      alive = false;
    };
  }, [reduce]);
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
        </div>
        <span className="font-mono text-[11px] text-muted">preconfirmation receipt</span>
      </div>
      <div className="min-h-[210px] p-5 font-mono text-[12.5px] leading-7">
        {lines.slice(0, n).map((l) => (
          <div key={l.s} className={l.c}>
            {l.s}
          </div>
        ))}
        <span className="inline-block h-4 w-2 animate-blink bg-amber align-middle" />
      </div>
    </div>
  );
}

export function Speed() {
  const L = useL();
  const cards = [
    {
      k: L("Confirmation latency", "确认延迟"),
      v: "50–100 ms",
      d: L(
        "Perceived. The sequencer signs a preconfirmation receipt the moment a tx arrives. Phase 3 streams 50 ms sub-blocks.",
        "感知延迟。排序器在交易到达的瞬间签发预确认回执。Phase 3 流式输出 50 ms 子块。",
      ),
    },
    {
      k: L("Throughput", "吞吐"),
      v: "250 ms",
      d: L(
        "Block time, four blocks a second, FCFS. Nitro execution today; engine upgrade when demand requires it (Phase 4).",
        "出块时间，每秒四个区块，先到先得。当前为 Nitro 执行层；需求到来时升级引擎（Phase 4）。",
      ),
    },
    {
      k: L("Finality", "最终性"),
      v: "1.5–4 s",
      d: L(
        "BSC fast finality backs the sequencer's preconfirmations. Calldata is posted to BSC; BoLD proofs secure state.",
        "BSC 快速最终性为排序器的预确认背书。Calldata 发布到 BSC；BoLD 证明保护状态。",
      ),
    },
  ];
  return (
    <Section id="speed">
      <SectionHeader index="04" titleKey="s_speed" heading={L("Fast enough that an agent never waits on the chain.", "快到 agent 永远不用等链。")} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <Stagger className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-1">
          {cards.map((c) => (
            <Item key={c.k} className="bg-surface p-7">
              <div className="label">{c.k}</div>
              <div className="num mt-3 font-mono text-3xl text-bone">{c.v}</div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{c.d}</p>
            </Item>
          ))}
        </Stagger>
        <Reveal delay={0.1}>
          <Terminal />
          <p className="mt-4 text-xs leading-relaxed text-muted">
            {L(
              "Sequencer in Singapore. No public mempool, tips off. Latency figures are design targets for the sequencer path; devnet today is a single node with 250 ms interval mining.",
              "排序器位于新加坡。无公开内存池，不收小费。延迟数字是排序器路径的设计目标；当前 Devnet 是单节点、250 ms 间隔出块。",
            )}
          </p>
        </Reveal>
      </div>
    </Section>
  );
}
