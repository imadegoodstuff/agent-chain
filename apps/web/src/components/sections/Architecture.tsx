"use client";

import { Section, SectionHeader } from "../ui/Section";
import { Reveal } from "../ui/Reveal";
import { useL } from "../LangProvider";

function Layer({
  title,
  sub,
  chips,
  amber,
}: {
  title: string;
  sub: string;
  chips: string[];
  amber?: boolean;
}) {
  return (
    <div className={`card relative flex-1 p-6 ${amber ? "border-amber/40 glow-amber" : ""}`}>
      <div className={`label ${amber ? "text-amber" : ""}`}>{sub}</div>
      <div className="mt-2 text-lg font-medium tracking-[-0.01em] text-bone">{title}</div>
      <div className="mt-5 flex flex-wrap gap-2">
        {chips.map((c) => (
          <span key={c} className="rounded-md border border-line bg-surface-2 px-2.5 py-1 font-mono text-[11px] text-muted">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function Flow({ labels, vertical = false }: { labels: [string, string]; vertical?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${vertical ? "py-1" : "px-1"} lg:w-28 lg:flex-col`}>
      <svg
        viewBox="0 0 120 40"
        className={`${vertical ? "h-14 w-10 rotate-90 lg:rotate-0" : ""} lg:h-14 lg:w-full text-line`}
        aria-hidden
      >
        <path d="M4 14 H116" stroke="currentColor" strokeDasharray="5 5" className="animate-dash" />
        <path d="M110 9l6 5-6 5" stroke="#F0B35B" fill="none" />
        <path d="M116 27 H4" stroke="currentColor" strokeDasharray="5 5" className="animate-dash" />
        <path d="M10 22l-6 5 6 5" stroke="#F0B35B" fill="none" />
      </svg>
      <div className="hidden text-center font-mono text-[10px] leading-tight text-muted lg:block">
        <div>{labels[0]}</div>
        <div className="mt-1 text-line">·</div>
        <div>{labels[1]}</div>
      </div>
    </div>
  );
}

export function Architecture() {
  const L = useL();
  const facts = [
    [L("Settlement", "结算"), L("Rollup mode; calldata posted to BSC. BSC fast finality 1.5–4 s.", "Rollup 模式；calldata 发布到 BSC。BSC 快速最终性 1.5–4 s。")],
    [L("Proofs", "证明"), L("BoLD fraud proofs. Permissioned validators at launch; external validators in Phase 4.", "BoLD 欺诈证明。上线时为许可制验证者；Phase 4 引入外部验证者。")],
    [L("Ordering", "排序"), L("Single sequencer in Singapore. First-come-first-served. Tips off.", "新加坡单一排序器。先到先得。不收小费。")],
    [L("Gas", "Gas"), L("ANTB native, bridged 1:1. USD-quoted base fee from the keeper every 5 min.", "原生 ANTB，1:1 跨入。守护进程每 5 分钟更新美元报价的基础费用。")],
  ];
  return (
    <Section id="architecture">
      <SectionHeader
        index="03"
        titleKey="s_arch"
        heading={L("Nitro rollup on BSC. Nothing exotic in the trust path.", "BSC 上的 Nitro rollup。信任路径上没有任何花哨之处。")}
        lede={L(
          "Agents talk to a single-sequencer L2 that posts calldata to BSC and inherits its finality. The pieces that make it agent-native are predeploys and sequencer policy, not a new VM.",
          "agent 与一条单排序器 L2 交互，该 L2 把 calldata 发布到 BSC 并继承其最终性。让它“面向 agent”的是预部署合约和排序器策略，而不是一个新的虚拟机。",
        )}
      />
      <Reveal>
        <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
          <Layer
            sub={L("Clients", "客户端")}
            title="Agents · Agentic Wallet"
            chips={["viem / ethers", "session keys", "x402 client", "MCP tools", "Binance Agentic Wallet"]}
          />
          <Flow labels={["txs · preconf", "receipts"]} vertical />
          <Layer
            amber
            sub={L("Layer 2", "第二层")}
            title="AGENT CHAIN"
            chips={[
              "Arbitrum Nitro",
              "250 ms blocks",
              "FCFS · no mempool",
              "Stylus (Rust/WASM)",
              "AgentRegistry",
              "FeeKeeper",
              "Paymaster",
              "GenesisSeat",
            ]}
          />
          <Flow labels={["calldata · roots", "deposits · Agent ID"]} vertical />
          <Layer
            sub={L("Layer 1", "第一层")}
            title="BNB Smart Chain"
            chips={["Rollup contracts", "Inbox / outbox", "ANTB escrow", "Agent ID (ERC-721)", "BoLD proofs", "Flap · $AGENT"]}
          />
        </div>
      </Reveal>
      <Reveal delay={0.1}>
        <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line text-sm sm:grid-cols-2 lg:grid-cols-4">
          {facts.map(([k, v]) => (
            <div key={k} className="bg-surface p-5">
              <div className="label">{k}</div>
              <div className="mt-2 text-muted">{v}</div>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
