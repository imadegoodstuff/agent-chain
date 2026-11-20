"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Wallet } from "lucide-react";
import { Section, SectionHeader } from "../ui/Section";
import { Reveal } from "../ui/Reveal";
import { CopyButton } from "../ui/CopyButton";
import { DEVNET, DEVNET_EXPLORER_URL, DEVNET_RPC_URL, DISCLAIMERS, EXPLORER_URL, MAINNET, RPC_URL } from "@/lib/spec";
import { addDevnet, addMainnet } from "../wallet";
import { useL } from "../LangProvider";
import { AgentSteps } from "../agent/AgentSteps";

const snippets = {
  Foundry: `# foundry.toml
[rpc_endpoints]
agentchain = "${RPC_URL}"            # mainnet · chain 1119 · gas ANTB
agentchain_devnet = "${DEVNET_RPC_URL}"  # devnet · 11190 · test data

# deploy (sender must hold a Binance Agent ID — the gateway rejects others with -32050)
forge create src/Agent.sol:Agent \\
  --rpc-url agentchain \\
  --private-key $PK

# read chain id → 1119
cast chain-id --rpc-url ${RPC_URL}`,
  Hardhat: `// hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    agentchain: {            // mainnet · gas ANTB · Agent ID required to send
      url: "${RPC_URL}",
      chainId: ${MAINNET.chainId},
      accounts: process.env.PK ? [process.env.PK] : [],
    },
    agentchainDevnet: {      // devnet · test data
      url: "${DEVNET_RPC_URL}",
      chainId: ${DEVNET.chainId},
      accounts: process.env.PK ? [process.env.PK] : [],
    },
  },
};
export default config;`,
  viem: `import { defineChain, createPublicClient, http } from "viem";

export const agentChain = defineChain({
  id: ${MAINNET.chainId},
  name: "${MAINNET.name}",
  nativeCurrency: { name: "ANTB", symbol: "${MAINNET.symbol}", decimals: 18 },
  rpcUrls: { default: { http: ["${RPC_URL}"] } },
  blockExplorers: { default: { name: "AGENT CHAIN Explorer", url: "${EXPLORER_URL}" } },
});

// Nitro on BSC: no \`finalized\` / \`safe\` tags — always use \`latest\`.
const client = createPublicClient({ chain: agentChain, transport: http() });
console.log(await client.getBlockNumber()); // 250 ms blocks`,
} as const;

type Tab = keyof typeof snippets;

export function CodeTabs() {
  const [tab, setTab] = useState<Tab>("viem");
  return (
    <div className="card min-w-0 max-w-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-2">
        <div className="flex overflow-x-auto">
          {(Object.keys(snippets) as Tab[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`relative px-4 py-3 font-mono text-xs transition-colors ${tab === k ? "text-bone" : "text-muted hover:text-bone"}`}
            >
              {k}
              {tab === k && <span className="absolute inset-x-3 -bottom-px h-px bg-amber" />}
            </button>
          ))}
        </div>
        <CopyButton value={snippets[tab]} className="mr-2" />
      </div>
      <pre className="max-w-full overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-bone/90">
        <code className="block w-max min-w-full">{snippets[tab]}</code>
      </pre>
    </div>
  );
}

export function AddChainButton({ className = "", network = "mainnet" }: { className?: string; network?: "mainnet" | "devnet" }) {
  const [state, setState] = useState<"idle" | "added" | "no-wallet" | "rejected">("idle");
  const L = useL();
  const main = network === "mainnet";
  return (
    <div className={className}>
      <button
        type="button"
        onClick={async () => setState(await (main ? addMainnet() : addDevnet()))}
        className={`${main ? "btn-primary" : "btn-ghost"} w-full whitespace-nowrap sm:w-auto`}
      >
        {state === "added" ? <Check size={15} className="shrink-0" /> : <Wallet size={15} className="shrink-0" />}
        {state === "added"
          ? main
            ? L("AGENT CHAIN added", "已添加 AGENT CHAIN")
            : L("Devnet added", "已添加 Devnet")
          : main
            ? L("Add AGENT CHAIN to wallet", "把 AGENT CHAIN 添加到钱包")
            : L("Add Devnet (test)", "添加 Devnet（测试）")}
      </button>
      {state === "no-wallet" && <div className="mt-2 font-mono text-[11px] text-red">{L("No injected wallet found.", "未检测到注入式钱包。")}</div>}
      {state === "rejected" && <div className="mt-2 font-mono text-[11px] text-muted">{L("Request rejected or chain already added.", "请求被拒绝或链已添加。")}</div>}
    </div>
  );
}

export function EndpointCards() {
  const L = useL();
  const rows: { k: string; v: string; hint?: string; dev?: boolean }[] = [
    { k: L("RPC · mainnet", "RPC · 主网"), v: RPC_URL, hint: L("Agent ID gateway · non-agents get -32050 · no finalized/safe tags", "Agent ID 网关 · 非 agent 返回 -32050 · 不支持 finalized/safe") },
    { k: L("Explorer · mainnet", "浏览器 · 主网"), v: EXPLORER_URL },
    { k: L("Chain ID · mainnet", "链 ID · 主网"), v: `${MAINNET.chainId}`, hint: `${MAINNET.chainIdHex.toUpperCase().replace("0X", "0x")} · ${MAINNET.stack}` },
    { k: L("Currency", "货币"), v: MAINNET.symbol, hint: L("18 decimals · min base fee 493,366,955 wei", "18 位小数 · 最低基础费用 493,366,955 wei") },
    { k: L("RPC · devnet (test)", "RPC · Devnet（测试）"), v: DEVNET_RPC_URL, dev: true },
    { k: L("Explorer · devnet (test)", "浏览器 · Devnet（测试）"), v: DEVNET_EXPLORER_URL, dev: true },
    { k: L("Chain ID · devnet", "链 ID · Devnet"), v: `${DEVNET.chainId}`, hint: `${DEVNET.chainIdHex.toUpperCase().replace("0X", "0x")} · tANTB · ${DISCLAIMERS.devnet}`, dev: true },
  ];
  return (
    <div className="grid grid-cols-1 min-w-0 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.k} className={`flex min-w-0 items-start justify-between gap-3 p-5 ${r.dev ? "bg-surface/60" : "bg-surface"}`}>
          <div className="min-w-0 flex-1">
            <div className={`label ${r.dev ? "text-muted/70" : ""}`}>{r.k}</div>
            <div className={`mt-2 break-all font-mono text-sm ${r.dev ? "text-bone/70" : "text-bone"}`}>{r.v}</div>
            {r.hint && <div className="mt-1 break-words font-mono text-[11px] text-muted">{r.hint}</div>}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <CopyButton value={r.v} />
            {r.v.startsWith("http") && (
              <a
                href={r.v}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-md border border-line text-muted hover:text-bone"
                aria-label={`Open ${r.k}`}
              >
                <ArrowUpRight size={12} />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Build({ compact = false }: { compact?: boolean }) {
  const L = useL();
  return (
    <Section id="build">
      {!compact && (
        <SectionHeader
          index="06"
          titleKey="s_build"
          heading={L("Point your tooling at chain 1119. Everything else is standard EVM.", "把你的工具指向链 1119。其余一切都是标准 EVM。")}
          lede={L(
            "Mainnet Beta is an Arbitrum Nitro rollup on BSC with 250 ms blocks and ANTB gas; senders must hold a Binance Agent ID. Solidity and Stylus contracts, viem/ethers, Foundry and Hardhat all work unchanged. A devnet with test tokens stays available for experiments.",
            "主网 Beta 是 BSC 上的 Arbitrum Nitro rollup，250 ms 出块、ANTB 作为 gas；发送方必须持有 Binance Agent ID。Solidity 与 Stylus 合约、viem/ethers、Foundry 和 Hardhat 均无需改动即可使用。另有测试代币的 Devnet 供实验。",
          )}
        />
      )}
      {!compact && <AgentSteps className="mb-12" />}
      <div className="grid grid-cols-1 min-w-0 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Reveal className="min-w-0">
          <CodeTabs />
        </Reveal>
        <Reveal delay={0.1} className="min-w-0 space-y-5">
          <EndpointCards />
          <div className="card flex min-w-0 flex-col gap-4 p-5">
            <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium text-bone">AGENT CHAIN · 1119 · ANTB</div>
                <div className="mt-1 font-mono text-[11px] text-muted">wallet_addEthereumChain · {L("Mainnet Beta · sending requires an Agent ID", "主网 Beta · 发送交易需要 Agent ID")}</div>
              </div>
              <AddChainButton className="shrink-0" network="mainnet" />
            </div>
            <div className="hairline flex min-w-0 flex-col gap-3 pt-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 font-mono text-[11px] text-muted">AGENT CHAIN Devnet · 11190 · {DISCLAIMERS.devnet}</div>
              <AddChainButton className="shrink-0" network="devnet" />
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}