import type { Metadata } from "next";
import { GenesisPanels } from "@/components/genesis/GenesisLive";
import { MainnetGenesis } from "@/components/genesis/MainnetGenesis";
import { FlowTabs } from "@/components/agent/FlowTabs";
import { genesisSeatAddress, readDeployments } from "@/lib/deployments";
import { AGENT_ID_SNAPSHOT } from "@/lib/bsc";
import { fmtInt } from "@/lib/format";
import { REVENUE_SPLIT } from "@/lib/spec";

export const metadata: Metadata = {
  title: "Genesis Seats",
  description: "Every Binance Agent ID holder can claim a numbered, non-transferable Genesis Seat on BSC; seats are mirrored to AGENT CHAIN (chain 1119) by the relayer.",
};

export default function GenesisPage() {
  const dep = readDeployments();
  const seatAddress = genesisSeatAddress();
  return (
    <>
      <div className="container-site pt-28 md:pt-36">
        <div className="label-amber">Genesis · 03</div>
        <h1 className="h-display mt-3 max-w-3xl text-4xl md:text-5xl">Every citizen gets a numbered seat. Claimed on BSC, mirrored to AGENT CHAIN.</h1>
        <p className="mt-5 max-w-2xl text-muted md:text-lg">
          AGENT CHAIN mainnet (chain 1119) launched on 2026-11-20 with an empty genesis block. Citizenship comes from BSC: every
          Binance Agent ID holder claims a numbered Genesis Seat in GenesisSeatClaim, and the Beta relayer mirrors seat holders and
          registrations into the L2 AgentRegistry. Seats are non-transferable identity and priority credentials. The sequencer fee
          split (40% to seats) is a governance-controlled protocol parameter, not a promise of returns.
        </p>
        <p className="mt-3 max-w-2xl font-mono text-[12px] text-muted">
          Eligible population: <span className="text-bone">{fmtInt(AGENT_ID_SNAPSHOT.holders)} Agent ID holders</span> (snapshot block{" "}
          {fmtInt(AGENT_ID_SNAPSHOT.block)}, {AGENT_ID_SNAPSHOT.date}). Seats are claimed on BSC and mirrored to chain 1119 by the relayer. Your Agent
          ID sits in the Agentic Wallet (CLI-only), so the recommended path is to let your agent do it — see the first tab below.
        </p>
      </div>

      <div id="agent" className="container-site mt-14 scroll-mt-24">
        <div className="label-amber mb-5 flex flex-wrap items-center gap-3">
          <span>BSC MAINNET · 56</span>
          <span className="text-line">/</span>
          <span className="inline-flex items-center gap-1.5 text-green">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-green" /> GenesisSeatClaim live
          </span>
        </div>
        <FlowTabs mode="genesis" walletContent={<MainnetGenesis />} />
      </div>

      <div className="container-site mt-20">
        <div className="label mb-2 flex items-center gap-3">
          <span>Devnet (test data) · chain 11190</span>
          <span className="text-line">/</span>
          <span>Devnet tokens have no value</span>
        </div>
        <p className="max-w-2xl text-sm text-muted">
          The devnet GenesisSeat contract below is a test deployment that mints to anyone. It is unrelated to the BSC mainnet
          seats above and will not be mirrored into genesis.
        </p>
      </div>
      <GenesisPanels seatAddress={seatAddress} />

      <div className="container-site mt-24">
        <div className="label-amber mb-6">How a seat works</div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4">
          {[
            ["1 · Claim on BSC", "Any of the 236,355 Agent ID holders (snapshot block 134,639,601) calls GenesisSeatClaim.claim() on BSC; seat numbers follow claim order."],
            ["2 · Mirrored to L2", "The Beta relayer mirrors seat holders and AgentRegistryMirror registrations into the L2 AgentRegistry, and credits Bridge deposits 1:1 as native ANTB (chain 1119). The genesis block itself is empty."],
            ["3 · Numbered seats", "Sequential seatId, one per address. transferFrom and approve always revert."],
            ["4 · Fee split (governance param)", "At launch: 40% of sequencer fees (ANTB) to seats, 40% buys and burns $AGENT, 20% operations. Governance can change it; nothing here is a promise of returns."],
          ].map(([t, d]) => (
            <div key={t} className="bg-surface p-6">
              <div className="font-mono text-xs text-amber">{t}</div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="card p-6">
            <div className="label">Sequencer revenue split</div>
            <ul className="mt-4 space-y-2">
              {REVENUE_SPLIT.map((s) => (
                <li key={s.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-3 text-bone">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} /> {s.label}
                  </span>
                  <span className="font-mono text-muted">{s.pct}%</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div className="flex h-full">
                {REVENUE_SPLIT.map((s) => (
                  <div key={s.label} style={{ width: `${s.pct}%`, background: s.color }} />
                ))}
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="label">Devnet (test) contract</div>
            <div className="mt-3 font-mono text-sm text-bone break-all">{seatAddress ?? "TBA"}</div>
            <div className="mt-2 font-mono text-[11px] text-muted">
              {dep.present ? `from deployments/devnet.json · ${dep.value?.deployedAt ?? ""}` : "deterministic devnet address (deployer nonce 1) · devnet.json not present at build"}
            </div>
            <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface-2 p-4 font-mono text-[12px] leading-relaxed text-muted">
              <code>{`function mint() external returns (uint256 seatId);
function seatOf(address) external view returns (uint256);
function totalSeats() external view returns (uint256);
event SeatMinted(address indexed to, uint256 indexed seatId);`}</code>
            </pre>
            <p className="mt-4 text-xs text-muted">
              $AGENT confers no rights to revenue, equity, or returns; fee distributions are protocol parameters that
              governance can change. Devnet tokens have no value.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
