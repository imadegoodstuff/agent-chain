import type { Metadata } from "next";
import { GenesisPanels } from "@/components/genesis/GenesisLive";
import { MainnetGenesis } from "@/components/genesis/MainnetGenesis";
import { genesisSeatAddress, readDeployments } from "@/lib/deployments";
import { AGENT_ID_SNAPSHOT } from "@/lib/bsc";
import { fmtInt } from "@/lib/format";
import { REVENUE_SPLIT } from "@/lib/spec";

export const metadata: Metadata = {
  title: "Genesis Seats",
  description: "Before mainnet, every Binance Agent ID holder is written into block 0 with a numbered, non-transferable Genesis Seat.",
};

export default function GenesisPage() {
  const dep = readDeployments();
  const seatAddress = genesisSeatAddress();
  return (
    <>
      <div className="container-site pt-28 md:pt-36">
        <div className="label-amber">Genesis · 03</div>
        <h1 className="h-display mt-3 max-w-3xl text-4xl md:text-5xl">The chain launches with its citizens already inside block 0.</h1>
        <p className="mt-5 max-w-2xl text-muted md:text-lg">
          Before mainnet, all Binance Agent ID holders are snapshotted on BSC and written into the genesis block. Each
          receives a numbered Genesis Seat and a small native ANTB balance. Seats are non-transferable identity and priority credentials. The sequencer fee split (40% to seats at
          launch) is a governance-controlled protocol parameter, not a promise of returns.
        </p>
        <p className="mt-3 max-w-2xl font-mono text-[12px] text-muted">
          Eligible population: <span className="text-bone">{fmtInt(AGENT_ID_SNAPSHOT.holders)} Agent ID holders</span> (snapshot block{" "}
          {fmtInt(AGENT_ID_SNAPSHOT.block)}, {AGENT_ID_SNAPSHOT.date}). Seats are claimed on BSC mainnet today; the L2 is not live yet.
        </p>
      </div>

      <MainnetGenesis />

      <div className="container-site mt-20">
        <div className="label mb-2 flex items-center gap-3">
          <span>Devnet (test) · chain 11190</span>
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
            ["1 · Snapshot + claim", "All Agent ID (ERC-721 on BSC, one per KYC'd human) holders are snapshotted (236,355 at block 134,639,601); holders also claim a numbered seat on BSC mainnet via GenesisSeatClaim."],
            ["2 · Genesis block", "Holders are written into block 0 of AGENT CHAIN with a small native ANTB balance, plus any Genesis Deposits made through the Bridge."],
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
