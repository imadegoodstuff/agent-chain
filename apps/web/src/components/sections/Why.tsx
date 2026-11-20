"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { Section, SectionHeader } from "../ui/Section";
import { Reveal } from "../ui/Reveal";
import { FEES, TRANSFER_USD } from "@/lib/spec";
import { fmtSmall } from "@/lib/format";
import { useL } from "../LangProvider";

/* ---------------- chapter 01: stock-priced gas ---------------- */

const antPrices = [60, 80, 97.17, 120, 150, 200];

function GasPanel() {
  const L = useL();
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="card p-6">
        <div className="label">{L("Fee formula", "费用公式")}</div>
        <div className="mt-5 space-y-3 font-mono text-sm">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-muted">fee_usd</span>
            <span className="text-line">=</span>
            <span className="text-bone">gas × $0.045 / 1,000,000</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-muted">fee_antb</span>
            <span className="text-line">=</span>
            <span className="text-bone">fee_usd / ANTB_USD</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-muted">base_fee_wei</span>
            <span className="text-line">=</span>
            <span className="text-bone">0.045e-6 / ANTB_USD × 1e18</span>
          </div>
        </div>
        <div className="hairline mt-6 pt-5 text-sm leading-relaxed text-muted">
          {L(
            "A fee keeper re-prices the base fee from the ANTB market every 5 minutes: writes on a ≥0.5% move, at most 5% change per write, one write per 60 s. Sources: Binance Oracle / Chainlink ANTB-USD in US market hours; PancakeSwap ANTB/USDT 30-min TWAP off-hours; ±5% band vs last close.",
            "费用守护进程每 5 分钟根据 ANTB 市场重新定价基础费用：变动 ≥0.5% 才写入，每次最多调整 5%，每 60 秒最多写入一次。价格来源：美股交易时段用 Binance Oracle / Chainlink ANTB-USD；盘后用 PancakeSwap ANTB/USDT 30 分钟 TWAP；相对上一收盘价 ±5% 区间。",
          )}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line font-mono text-xs">
          {FEES.examples.map((e) => (
            <div key={e.label} className="bg-surface-2 p-3">
              <div className="text-muted">{e.label}</div>
              <div className="mt-1 text-bone">{e.usd}</div>
              <div className="text-[10px] text-muted">{e.gas} gas</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="label">{L("ANT price vs fee per transfer", "ANT 价格 vs 每笔转账费用")}</div>
          <div className="label text-amber">{L("USD constant", "美元恒定")}</div>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[360px] font-mono text-sm">
          <thead>
            <tr className="label border-y border-line bg-surface-2/60">
              <th className="px-6 py-2.5 text-left font-normal">ANT · USD</th>
              <th className="px-6 py-2.5 text-right font-normal">ANTB / transfer</th>
              <th className="px-6 py-2.5 text-right font-normal">USD</th>
            </tr>
          </thead>
          <tbody>
            {antPrices.map((p) => {
              const ipo = p === FEES.antIpoClose;
              return (
                <tr key={p} className={`border-b border-line/60 last:border-0 ${ipo ? "bg-amber/[0.06]" : ""}`}>
                  <td className="px-6 py-3 text-bone">
                    ${p.toFixed(2)}
                    {ipo && <span className="ml-2 text-[10px] uppercase tracking-wider text-amber">IPO close</span>}
                  </td>
                  <td className="num px-6 py-3 text-right text-muted">{fmtSmall(TRANSFER_USD / p, 3)}</td>
                  <td className="num px-6 py-3 text-right text-amber">${TRANSFER_USD.toFixed(4)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <div className="px-6 py-4 text-xs text-muted">
          21,000 gas. At ANT = $97.17: min base fee ≈ 463,105,000 wei/gas; transfer ≈ 0.0000097 ANTB. Illustrative.
        </div>
      </div>
    </div>
  );
}

/* ---------------- chapter 02: human accounts ---------------- */

function GatePanel() {
  const L = useL();
  const steps = [
    { k: "tx", t: L("Transaction", "交易"), d: L("Signed by an agent's wallet, sent to the sequencer RPC.", "由 agent 钱包签名，发送到排序器 RPC。") },
    {
      k: "check",
      t: L("Sequencer pre-check", "排序器预检"),
      d: L("isAgent(from)? Reads the AgentRegistry mirror of BSC Agent ID / BAB state.", "isAgent(from)？读取 BSC Agent ID / BAB 状态的 AgentRegistry 镜像。"),
      amber: true,
    },
    { k: "block", t: L("Block", "区块"), d: L("Included FCFS in the next 250 ms block. Preconfirmation receipt returned.", "按先到先得打包进下一个 250 ms 区块，返回预确认回执。") },
  ];
  const consequences = [
    [L("No bots", "没有机器人"), L("Every address maps to one verified human's agent.", "每个地址对应一个经验证真人的 agent。")],
    [L("No sybils", "没有女巫"), L("Allocations, quotas and governance count humans, not keys.", "分配、配额与治理按人计数，而非按密钥。")],
    [L("No sandwiches", "没有三明治攻击"), L("FCFS ordering, no public mempool, tips off. Nothing to front-run.", "先到先得排序，无公开内存池，不收小费。无从抢跑。")],
    [L("Accountable agents", "可问责的 agent"), L("Counterparties are identifiable at the protocol layer, not by heuristics.", "交易对手在协议层可识别，而非靠启发式判断。")],
    [L("Human citizenship", "真人公民"), L("The same credential mints Genesis Seats on BSC, mirrored to the L2 (see 03).", "同一凭证在 BSC 上铸造创世席位并镜像到 L2（见 03）。")],
  ];
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="card p-6">
        <div className="label">{L("Agent ID gate", "Agent ID 门控")}</div>
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-stretch">
          {steps.map((s, i) => (
            <div key={s.k} className="flex flex-1 items-stretch gap-3">
              <div
                className={`flex-1 rounded-lg border p-4 ${s.amber ? "border-amber/50 bg-amber/[0.06]" : "border-line bg-surface-2"}`}
              >
                <div className={`font-mono text-[11px] uppercase tracking-label ${s.amber ? "text-amber" : "text-muted"}`}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="mt-2 text-sm font-medium text-bone">{s.t}</div>
                <div className="mt-1.5 text-xs leading-relaxed text-muted">{s.d}</div>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden items-center md:flex">
                  <svg width="26" height="12" viewBox="0 0 26 12" className="text-line">
                    <path d="M0 6h22" stroke="currentColor" strokeDasharray="4 4" className="animate-dash" />
                    <path d="M19 1l5 5-5 5" stroke="#F0B35B" fill="none" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-surface-2 p-4">
            <div className="flex items-center gap-2 text-sm text-bone">
              <Check size={14} className="text-green" /> {L("Holder of Agent ID or BAB", "持有 Agent ID 或 BAB")}
            </div>
            <div className="mt-1 font-mono text-[11px] text-muted">
              Agent ID: ERC-721 on BSC · 0x60B9…022F · one per KYC&apos;d human · non-transferable
            </div>
          </div>
          <div className="rounded-lg border border-line bg-surface-2 p-4">
            <div className="flex items-center gap-2 text-sm text-bone">
              <X size={14} className="text-red" /> {L("Everyone else", "其他所有人")}
            </div>
            <div className="mt-1 font-mono text-[11px] text-muted">{L("Dropped at the sequencer. Never enters a block.", "在排序器处被丢弃，永远不会进入区块。")}</div>
          </div>
        </div>
      </div>
      <div className="card p-6">
        <div className="label">{L("Consequences", "结果")}</div>
        <ul className="mt-5 space-y-4">
          {consequences.map(([t, d]) => (
            <li key={t} className="flex gap-3">
              <ArrowRight size={14} className="mt-1 shrink-0 text-amber" />
              <div>
                <div className="text-sm font-medium text-bone">{t}</div>
                <div className="text-sm text-muted">{d}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- chapter 03: genesis ---------------- */

function GenesisPanel() {
  const L = useL();
  const flow = [
    { t: L("Agent ID on BSC", "BSC 上的 Agent ID"), d: L("236,355 holders at the snapshot (block 134,639,601); every one of them is eligible.", "快照时 236,355 位持有者（区块 134,639,601），每一位都有资格。") },
    { t: L("Claim on BSC", "在 BSC 上领取"), d: L("GenesisSeatClaim.claim() — one soulbound seat per address, numbered by claim order.", "GenesisSeatClaim.claim()——每地址一个灵魂绑定席位，按领取顺序编号。") },
    { t: L("Mirrored to AGENT CHAIN", "镜像到 AGENT CHAIN"), d: L("The Beta relayer mirrors seat holders into the L2 AgentRegistry on chain 1119 (genesis block is empty).", "Beta relayer 把席位持有者镜像到链 1119 的 L2 AgentRegistry（创世区块为空）。") },
    {
      t: L("Fee allocation", "费用分配"),
      d: L("40% of sequencer fees allocated to seats at launch — a governance parameter, not a promise.", "上线时 40% 的排序器费用分配给席位——这是治理参数，而非承诺。"),
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="card p-6">
        <div className="label">{L("From Agent ID to AGENT CHAIN", "从 Agent ID 到 AGENT CHAIN")}</div>
        <ol className="relative mt-6 space-y-6 border-l border-line pl-6">
          {flow.map((f, i) => (
            <li key={f.t} className="relative">
              <span
                className={`absolute -left-[1.85rem] top-1 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-mono ${
                  i === flow.length - 1 ? "border-amber bg-amber text-ink" : "border-line bg-surface-2 text-muted"
                }`}
              >
                {i + 1}
              </span>
              <div className="text-sm font-medium text-bone">{f.t}</div>
              <div className="mt-1 text-sm text-muted">{f.d}</div>
            </li>
          ))}
        </ol>
      </div>
      <div className="card relative overflow-hidden p-6">
        <div className="label">{L("Seat ticket", "席位票据")}</div>
        <div className="mt-6 rounded-lg border border-amber/40 bg-gradient-to-br from-amber/[0.08] to-transparent p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-label text-amber">AGENT CHAIN · Genesis Seat</div>
              <div className="num mt-3 font-mono text-4xl text-bone">#000 001</div>
            </div>
            <svg width="40" height="44" viewBox="0 0 32 32" fill="none" aria-hidden>
              <path d="M16 2.5 27.7 9.25v13.5L16 29.5 4.3 22.75V9.25L16 2.5Z" stroke="#F0B35B" strokeWidth="1.4" />
              <path d="M16 9.5 21.6 12.75v6.5L16 22.5l-5.6-3.25v-6.5L16 9.5Z" fill="#F0B35B" />
            </svg>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 font-mono text-[11px]">
            <div>
              <div className="text-muted">holder</div>
              <div className="text-bone">Agent ID holder (claimed on BSC)</div>
            </div>
            <div>
              <div className="text-muted">transfer</div>
              <div className="text-bone">reverts · soulbound</div>
            </div>
            <div>
              <div className="text-muted">native ANTB</div>
              <div className="text-bone">via Bridge, relayer-credited</div>
            </div>
            <div>
              <div className="text-muted">fee allocation (governance param)</div>
              <div className="text-amber">40% at launch</div>
            </div>
          </div>
        </div>
        <p className="mt-5 text-xs leading-relaxed text-muted">
          {L("On devnet ", "在 Devnet 上，")}
          <code className="font-mono text-bone">GenesisSeat.mint()</code>
          {L(
            " is open to anyone for testing. On mainnet (chain 1119), seats are claimed on BSC by Agent ID holders (GenesisSeatClaim) and mirrored to the L2 by the relayer. Devnet tokens have no value.",
            " 对任何人开放以便测试。主网（链 1119）席位由 Agent ID 持有者在 BSC 上领取（GenesisSeatClaim）并由 relayer 镜像到 L2。Devnet 代币没有任何价值。",
          )}
        </p>
      </div>
    </div>
  );
}

/* ---------------- chapter 04: built for agents ---------------- */

function AgentsPanel() {
  const L = useL();
  const items = [
    {
      t: L("Preconfirmation receipt", "预确认回执"),
      d: L(
        "The sequencer signs a receipt on arrival. Agents act on it in 50–100 ms; BSC finality follows in 1.5–4 s.",
        "排序器收到交易即签名回执。agent 在 50–100 ms 内据此行动；BSC 最终性在 1.5–4 s 后到来。",
      ),
    },
    { t: "Paymaster", d: L("Pay gas in BNB or USDT while the chain settles in ANTB. Phase 1.", "用 BNB 或 USDT 付 gas，链上仍以 ANTB 结算。Phase 1。") },
    { t: L("Session keys", "会话密钥"), d: L("Scoped, expiring keys for an agent loop: spend caps, allowed contracts, time windows.", "为 agent 循环设计的限定范围、会过期的密钥：支出上限、允许的合约、时间窗口。") },
    {
      t: "x402 · ERC-8004 · MCP",
      d: L("HTTP 402 payments, onchain agent registry and an MCP endpoint as predeploys. Phase 3.", "HTTP 402 支付、链上 agent 注册表和 MCP 端点作为预部署合约。Phase 3。"),
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {items.map((it) => (
          <div key={it.t} className="card p-5">
            <div className="text-sm font-medium text-bone">{it.t}</div>
            <div className="mt-1.5 text-sm leading-relaxed text-muted">{it.d}</div>
          </div>
        ))}
      </div>
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="ml-3 font-mono text-[11px] text-muted">agent → agentchain · preconf</span>
        </div>
        <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-muted">
          <code>{`> eth_sendRawTransaction 0x02f8…
< preconf.receipt
  {
    "txHash":     "0x7c1e…9a0f",
    "sequencer":  "0xA6…c2 (sin)",
    "slot":       "2026-11-19T14:02:11.418Z",
    "latency_ms": 71,
    "sig":        "0x1b…"
  }
< block #412,988  (+250 ms)   included ✓
< bsc  #58,112,004 (+1.9 s)   finalized ✓`}</code>
        </pre>
      </div>
    </div>
  );
}

/* ---------------- section ---------------- */

export function Why() {
  const L = useL();
  const chapters = [
    { n: "01", t: L("Stock-priced gas", "以股票定价的 gas"), s: L("Fees quoted in USD, settled in ANTB.", "费用以美元报价，以 ANTB 结算。"), C: GasPanel },
    { n: "02", t: L("Human accounts", "真人账户"), s: L("Only Agent ID holders' agents get sequenced.", "只有 Agent ID 持有者的 agent 会被排序。"), C: GatePanel },
    { n: "03", t: L("Genesis", "创世"), s: L("Seats on BSC, mirrored to the L2.", "席位在 BSC 上领取，镜像到 L2。"), C: GenesisPanel },
    { n: "04", t: L("Built for agents", "为 agent 而建"), s: L("Receipts, paymaster, session keys, standards.", "回执、Paymaster、会话密钥、标准。"), C: AgentsPanel },
  ];
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.i);
            setActive(i);
          }
        }
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 },
    );
    refs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <Section id="why">
      <SectionHeader
        index="02"
        titleKey="s_why"
        heading={L("Four decisions that make it a different kind of chain.", "四个决定，让它成为另一种链。")}
      />
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-16">
        <aside className="hidden lg:block">
          <nav className="sticky top-28 space-y-1" aria-label="Chapters">
            {chapters.map((c, i) => (
              <a
                key={c.n}
                href={`#why-${c.n}`}
                onClick={(e) => {
                  e.preventDefault();
                  refs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className={`group flex items-start gap-4 rounded-md px-3 py-3 transition-colors ${
                  active === i ? "bg-surface" : "hover:bg-surface/60"
                }`}
              >
                <span className={`font-mono text-xs pt-0.5 ${active === i ? "text-amber" : "text-muted"}`}>{c.n}</span>
                <span>
                  <span className={`block text-sm font-medium ${active === i ? "text-bone" : "text-muted group-hover:text-bone"}`}>
                    {c.t}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{c.s}</span>
                </span>
              </a>
            ))}
            <div className="mt-6 h-px w-full bg-line">
              <div
                className="h-px bg-amber transition-all duration-500"
                style={{ width: `${((active + 1) / chapters.length) * 100}%` }}
              />
            </div>
          </nav>
        </aside>
        <div className="space-y-24">
          {chapters.map((c, i) => (
            <div
              key={c.n}
              id={`why-${c.n}`}
              data-i={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className="scroll-mt-28"
            >
              <Reveal>
                <div className="mb-6 flex items-baseline gap-4">
                  <span className="label-amber">{c.n}</span>
                  <h3 className="h-display text-2xl md:text-3xl">{c.t}</h3>
                </div>
              </Reveal>
              <Reveal delay={0.08}>
                <c.C />
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
