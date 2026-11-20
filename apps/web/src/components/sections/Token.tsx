"use client";

import { ArrowUpRight } from "lucide-react";
import { Section, SectionHeader } from "../ui/Section";
import { Reveal } from "../ui/Reveal";
import { LINKS, REVENUE_SPLIT } from "@/lib/spec";
import { useL } from "../LangProvider";

const SPLIT_ZH: Record<string, string> = { "Genesis Seat holders": "创世席位持有者", "Buy & burn $AGENT": "回购销毁 $AGENT", Operations: "运营" };

function Donut() {
  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 140 140" className="h-44 w-44 -rotate-90" aria-hidden>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#1A1B23" strokeWidth="14" />
      {REVENUE_SPLIT.map((s) => {
        const len = (s.pct / 100) * c;
        const el = (
          <circle
            key={s.label}
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="14"
            strokeDasharray={`${len - 2} ${c - len + 2}`}
            strokeDashoffset={-offset}
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

export function Token() {
  const L = useL();
  const zh = L("en", "zh") === "zh";
  return (
    <Section id="token">
      <SectionHeader
        index="05"
        titleKey="s_token"
        heading={L("Sequencer revenue is ANTB. It goes to seats, to burn, and to running the chain.", "排序器收入是 ANTB。它流向席位、销毁，以及链的运营。")}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Reveal>
          <div className="card h-full p-7">
            <div className="label">{L("Revenue split · ANTB", "收入分配 · ANTB")}</div>
            <div className="mt-6 flex flex-col items-center gap-8 sm:flex-row">
              <div className="relative">
                <Donut />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-[10px] uppercase tracking-label text-muted">{L("per block", "每个区块")}</span>
                  <span className="font-mono text-lg text-bone">100%</span>
                </div>
              </div>
              <ul className="w-full space-y-3">
                {REVENUE_SPLIT.map((s) => (
                  <li key={s.label} className="flex items-center justify-between gap-4 border-b border-line/60 pb-3 last:border-0">
                    <span className="flex items-center gap-3 text-sm text-bone">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                      {zh ? SPLIT_ZH[s.label] ?? s.label : s.label}
                    </span>
                    <span className="num font-mono text-sm text-muted">{s.pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hairline mt-6 grid grid-cols-1 gap-3 pt-5 text-sm text-muted sm:grid-cols-2">
              <div>
                <span className="text-bone">{L("No team swap fee.", "没有团队交易手续费。")}</span> {L("Flap's curve trade fees do not accrue to the team.", "Flap 曲线交易手续费不归团队。")}
              </div>
              <div>
                <span className="text-bone">Arbitrum Expansion Program:</span> {L("10% of protocol net revenue.", "协议净收入的 10%。")}
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="card h-full p-7">
            <div className="flex items-center justify-between">
              <div className="label">$AGENT</div>
              <span className="rounded-md border border-amber/40 bg-amber/10 px-2 py-1 font-mono text-[11px] text-amber">{L("Not launched yet · Phase 2", "尚未发行 · Phase 2")}</span>
            </div>
            <div className="mt-3 text-2xl font-medium tracking-[-0.01em] text-bone">{L("Open launch on Flap, in the ANTB pool.", "在 Flap 以 ANTB 池开放发行。")}</div>
            <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
              {[
                [L("Venue", "场所"), "flap.sh · ANTB pool · BSC"],
                [L("Access", "准入"), L("Open launch — any wallet can buy, hold and trade $AGENT. No Agent ID gate, no per-wallet cap.", "开放发行——任何钱包都可以买卖和持有 $AGENT。无 Agent ID 门槛，无单钱包上限。")],
                ["Agent ID", L("Required to transact on the chain, never to hold the token", "仅在链上交易时需要，持有代币不需要")],
                [L("Fees", "手续费"), L("No team swap fee", "没有团队交易手续费")],
                [L("Burn", "销毁"), L("40% of sequencer revenue buys and burns $AGENT", "排序器收入的 40% 用于回购销毁 $AGENT")],
                [L("Contract", "合约"), L("Not launched yet — no address exists. Anything claiming to be $AGENT today is not ours.", "尚未发行——目前不存在任何地址。今天任何自称 $AGENT 的代币都与我们无关。")],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-mono text-[11px] uppercase tracking-label text-muted pt-0.5">{k}</dt>
                  <dd className={k === L("Contract", "合约") ? "font-mono text-amber" : "text-bone/90"}>{v}</dd>
                </div>
              ))}
            </dl>
            <a
              href={LINKS.flap}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex items-center gap-1.5 text-sm text-amber hover:underline"
            >
              {L("flap.sh · launch venue", "flap.sh · 发行场所")} <ArrowUpRight size={14} />
            </a>
            <p className="mt-6 text-xs leading-relaxed text-muted">{L("Nothing here is investment advice. $AGENT confers no rights to revenue, equity, or returns; fee distributions are protocol parameters that governance can change.", "本页内容不构成投资建议。$AGENT 不赋予任何收入、股权或回报权利；费用分配是治理可更改的协议参数。")}</p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
