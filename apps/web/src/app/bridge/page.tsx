import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { BridgeApp, BridgeDisclosures, DepositsTable } from "@/components/bridge/BridgeApp";
import { FlowTabs } from "@/components/agent/FlowTabs";
import { CopyButton } from "@/components/ui/CopyButton";
import { BSC_CONTRACTS, BSC_DEPLOYED_AT, bscCode } from "@/lib/bsc";
import { DISCLAIMERS, LINKS } from "@/lib/spec";

export const metadata: Metadata = {
  title: "Bridge",
  description:
    "Bridge ANTB from BSC to AGENT CHAIN (chain 1119, Mainnet Beta). Deposits are credited 1:1 as native ANTB by the Beta relayer within minutes. Agent ID required. Caps 0.1 / 100 ANTB.",
};

export default function BridgePage() {
  return (
    <>
      <div className="container-site pt-28 md:pt-36">
        <div className="label-amber flex flex-wrap items-center gap-3">
          <span>Bridge · BSC mainnet</span>
          <span className="text-line">/</span>
          <span className="inline-flex items-center gap-1.5 text-green">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-green" /> Mainnet Beta live · chain 1119
          </span>
        </div>
        <h1 className="h-display mt-3 max-w-3xl text-4xl md:text-5xl">ANTB in on BSC. Native ANTB on AGENT CHAIN, minutes later.</h1>
        <p className="mt-5 max-w-2xl text-muted md:text-lg">
          AGENT CHAIN mainnet (chain 1119) is live on BNB Smart Chain. ANTB you deposit into the Bridge contract on BSC is credited
          1:1 as <span className="text-bone">native ANTB on AGENT CHAIN</span> by the Beta relayer — usually within minutes, in
          deposit-nonce order. Agent ID (or BAB) required — and since the Agent ID lives in the CLI-only Agentic Wallet, the
          recommended path is to let your agent run the two transactions (first tab below).
        </p>
      </div>

      <div className="container-site mt-10">
        <BridgeDisclosures compact />
      </div>

      <div id="agent" className="container-site mt-8 scroll-mt-24">
        <FlowTabs
          mode="bridge"
          walletContent={
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
        <BridgeApp />

        <div className="min-w-0 space-y-8">
          <div>
            <div className="label mb-4">How a deposit works</div>
            <ol className="space-y-3 text-sm text-muted">
              {[
                "Connect a BSC wallet holding an Agent ID (or BAB). The contract checks balanceOf on both credentials; nothing else is read.",
                "Approve the exact ANTB amount to the Bridge (BEP-20 approve — never unlimited), then call deposit(amount, l2Recipient).",
                "ANTB is escrowed in the Bridge contract and a Deposited(from, l2Recipient, amount, nonce) event is emitted. Your nonce is your place in line.",
                "The Beta relayer reads Deposited events in nonce order and credits l2Recipient with the same amount of native ANTB on AGENT CHAIN (chain 1119), usually within minutes.",
                "To transact on AGENT CHAIN the recipient must hold an Agent ID (the gateway rejects others with -32050). Withdrawals L2 → BSC go through the Nitro Outbox; no self-service UI yet.",
              ].map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className="font-mono text-xs text-amber">{String(i + 1).padStart(2, "0")}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="card p-5 text-sm text-muted">
            <div className="label mb-2">Caps · Mainnet Beta</div>
            Current caps are read live from the contract (left): <span className="text-bone">0.1 ANTB per address</span> and{" "}
            <span className="text-bone">100 ANTB total</span>; the owner can raise them to 1 / 500 ANTB as Beta proves out (SPEC §4).
            Caps count cumulative deposits per address.
          </div>

          <div className="card p-5 text-sm text-muted">
            <div className="label mb-2">How to get ANTB</div>
            ANTB is a BEP-20 on BSC (<span className="font-mono text-bone">{BSC_CONTRACTS.ANTB.slice(0, 8)}…{BSC_CONTRACTS.ANTB.slice(-4)}</span>, 18
            decimals). It trades on BSC DEXes — PancakeSwap, and Flap routes to the ANTB pool. Swap from BNB or USDT in your wallet&apos;s
            swap tab, then come back here. We do not quote prices; see the trading-risk notice above.
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
              <a href={`https://pancakeswap.finance/swap?outputCurrency=${BSC_CONTRACTS.ANTB}&chain=bsc`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber hover:underline">
                PancakeSwap <ArrowUpRight size={11} />
              </a>
              <a href={LINKS.flap} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber hover:underline">
                Flap <ArrowUpRight size={11} />
              </a>
              <span className="inline-flex items-center gap-2 text-muted">
                ANTB <CopyButton value={BSC_CONTRACTS.ANTB} />
              </span>
            </div>
          </div>

          <div className="card p-5">
            <div className="label mb-3">Contract</div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <a href={bscCode(BSC_CONTRACTS.Bridge)} target="_blank" rel="noreferrer" className="break-all text-bone hover:text-amber">
                {BSC_CONTRACTS.Bridge}
              </a>
              <CopyButton value={BSC_CONTRACTS.Bridge} />
            </div>
            <div className="mt-2 font-mono text-[11px] text-muted">
              Bridge · BSC 56 · deployed {BSC_DEPLOYED_AT} · BscScan-verified · owner permissions on{" "}
              <a href="/builders#owner-permissions" className="text-amber hover:underline">
                /builders
              </a>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface-2 p-4 font-mono text-[12px] leading-relaxed text-muted">
              <code>{`function deposit(uint256 amount, address l2Recipient) returns (uint256 nonce);
function remainingFor(address) view returns (uint256);
function remainingGlobal() view returns (uint256);
event Deposited(address indexed from, address indexed l2Recipient, uint256 amount, uint256 indexed nonce);`}</code>
            </pre>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-muted">
            <p>{DISCLAIMERS.affiliation}</p>
            <p>{DISCLAIMERS.advice}</p>
            <p>{DISCLAIMERS.devnet}</p>
          </div>
        </div>
      </div>
          }
        />
      </div>

      <div className="container-site mt-16">
        <DepositsTable />
      </div>
    </>
  );
}
