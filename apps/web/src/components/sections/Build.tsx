"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Wallet } from "lucide-react";
import { Section, SectionHeader } from "../ui/Section";
import { Reveal } from "../ui/Reveal";
import { CopyButton } from "../ui/CopyButton";
import { DEVNET, DISCLAIMERS, EXPLORER_URL, RPC_URL } from "@/lib/spec";
import { addDevnet } from "../wallet";
import { useL } from "../LangProvider";

const snippets = {
  Foundry: `# foundry.toml
[rpc_endpoints]
agentchain_devnet = "${RPC_URL}"

# deploy
forge create src/Agent.sol:Agent \\
  --rpc-url agentchain_devnet \\
  --private-key $PK \\
  --legacy

# read chain id → 11190
cast chain-id --rpc-url ${RPC_URL}`,
  Hardhat: `// hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    agentchainDevnet: {
      url: "${RPC_URL}",
      chainId: ${DEVNET.chainId},
      accounts: process.env.PK ? [process.env.PK] : [],
    },
  },
};
export default config;`,
  viem: `import { defineChain, createPublicClient, http } from "viem";

export const agentChainDevnet = defineChain({
  id: ${DEVNET.chainId},
  name: "${DEVNET.name}",
  nativeCurrency: { name: "Test ANTB", symbol: "${DEVNET.symbol}", decimals: 18 },
  rpcUrls: { default: { http: ["${RPC_URL}"] } },
  blockExplorers: { default: { name: "AGENT CHAIN Explorer", url: "${EXPLORER_URL}" } },
  testnet: true,
});

const client = createPublicClient({ chain: agentChainDevnet, transport: http() });
console.log(await client.getBlockNumber()); // +1 every 250 ms`,
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

export function AddChainButton({ className = "" }: { className?: string }) {
  const [state, setState] = useState<"idle" | "added" | "no-wallet" | "rejected">("idle");
  return (
    <div className={className}>
      <button
        type="button"
        onClick={async () => setState(await addDevnet())}
        className="btn-primary w-full whitespace-nowrap sm:w-auto"
      >
        {state === "added" ? <Check size={15} className="shrink-0" /> : <Wallet size={15} className="shrink-0" />}
        {state === "added" ? "Devnet added" : "Add Devnet to wallet"}
      </button>
      {state === "no-wallet" && <div className="mt-2 font-mono text-[11px] text-red">No injected wallet found.</div>}
      {state === "rejected" && <div className="mt-2 font-mono text-[11px] text-muted">Request rejected or chain already added.</div>}
    </div>
  );
}

export function EndpointCards() {
  const rows: { k: string; v: string; hint?: string }[] = [
    { k: "RPC", v: RPC_URL },
    { k: "Explorer", v: EXPLORER_URL },
    { k: "Chain ID", v: `${DEVNET.chainId}`, hint: DEVNET.chainIdHex.toUpperCase().replace("0X", "0x") },
    { k: "Currency", v: DEVNET.symbol, hint: "18 decimals · no value" },
  ];
  return (
    <div className="grid grid-cols-1 min-w-0 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.k} className="flex min-w-0 items-start justify-between gap-3 bg-surface p-5">
          <div className="min-w-0 flex-1">
            <div className="label">{r.k}</div>
            <div className="mt-2 break-all font-mono text-sm text-bone">{r.v}</div>
            {r.hint && <div className="mt-1 font-mono text-[11px] text-muted">{r.hint}</div>}
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
          heading={L("Point your tooling at chain 11190. Everything else is standard EVM.", "把你的工具指向链 11190。其余一切都是标准 EVM。")}
          lede={L(
            "Devnet is a single node with 250 ms interval mining, open to anyone. Solidity and Stylus contracts, viem/ethers, Foundry and Hardhat all work unchanged.",
            "Devnet 是单节点、250 ms 间隔出块，对所有人开放。Solidity 与 Stylus 合约、viem/ethers、Foundry 和 Hardhat 均无需改动即可使用。",
          )}
        />
      )}
      <div className="grid grid-cols-1 min-w-0 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Reveal className="min-w-0">
          <CodeTabs />
        </Reveal>
        <Reveal delay={0.1} className="min-w-0 space-y-5">
          <EndpointCards />
          <div className="card flex min-w-0 flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-medium text-bone">AGENT CHAIN Devnet · 11190</div>
              <div className="mt-1 font-mono text-[11px] text-muted">wallet_addEthereumChain · {DISCLAIMERS.devnet}</div>
            </div>
            <AddChainButton className="shrink-0" />
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
