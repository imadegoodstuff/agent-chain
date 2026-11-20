import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { BridgeApp, BridgeDisclosures, DepositsTable } from "@/components/bridge/BridgeApp";
import { CopyButton } from "@/components/ui/CopyButton";
import { BSC_CONTRACTS, BSC_DEPLOYED_AT, bscCode } from "@/lib/bsc";
import { DISCLAIMERS, LINKS } from "@/lib/spec";

export const metadata: Metadata = {
  title: "Bridge",
  description:
    "Genesis Deposits on BSC mainnet: deposit ANTB into the AGENT CHAIN Bridge before launch and be credited 1:1 in block 0. Agent ID required. Beta caps apply.",
};

export default function BridgePage() {
  return (
    <>
      <div className="container-site pt-28 md:pt-36">
        <div className="label-amber flex flex-wrap items-center gap-3">
          <span>Bridge · BSC mainnet</span>
          <span className="text-line">/</span>
          <span className="inline-flex items-center gap-1.5 text-green">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-green" /> Genesis Deposit window open
          </span>
        </div>
        <h1 className="h-display mt-3 max-w-3xl text-4xl md:text-5xl">ANTB in now. Native ANTB in block 0.</h1>
        <p className="mt-5 max-w-2xl text-muted md:text-lg">
          The Bridge contract is live on BNB Smart Chain. Every ANTB deposited before mainnet launch is a{" "}
          <span className="text-bone">Genesis Deposit</span>: credited 1:1 as native balance in block 0 of AGENT CHAIN, ordered
          by deposit nonce. The L2 itself is not live yet. Agent ID (or BAB) required.
        </p>
      </div>

      <div className="container-site mt-10">
        <BridgeDisclosures compact />
      </div>

      <div className="container-site mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
        <BridgeApp />

        <div className="min-w-0 space-y-8">
          <div>
            <div className="label mb-4">How a Genesis Deposit works</div>
            <ol className="space-y-3 text-sm text-muted">
              {[
                "Connect a BSC wallet holding an Agent ID (or BAB). The contract checks balanceOf on both credentials; nothing else is read.",
                "Approve the exact ANTB amount to the Bridge (BEP-20 approve — never unlimited), then call deposit(amount, l2Recipient).",
                "ANTB is escrowed in the Bridge contract and a Deposited(from, l2Recipient, amount, nonce) event is emitted. Your nonce is your place in line.",
                "At mainnet launch every Deposited event is written into block 0 as a native ANTB balance of l2Recipient, 1:1, in nonce order.",
                "To transact on AGENT CHAIN the recipient must hold an Agent ID. Withdrawals open with the Nitro bridge, not before.",
              ].map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className="font-mono text-xs text-amber">{String(i + 1).padStart(2, "0")}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="card p-5 text-sm text-muted">
            <div className="label mb-2">Caps · Genesis Deposit window</div>
            Current caps are read live from the contract (left). The window opened with{" "}
            <span className="text-bone">0.1 ANTB per address</span> and <span className="text-bone">100 ANTB total</span>; the owner
            raises them to 1 / 500 ANTB when the Nitro chain is live (SPEC §4, Phase 2). Caps count cumulative deposits per address.
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

      <div className="container-site mt-16">
        <DepositsTable />
      </div>
    </>
  );
}
