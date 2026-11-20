"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Loader2, Wallet } from "lucide-react";
import { encodeFunctionData } from "viem";
import { useStats } from "@/hooks/useStats";
import { fmtInt, shortAddr } from "@/lib/format";
import { EXPLORER_URL, DISCLAIMERS } from "@/lib/spec";
import { ensureDevnet, getProvider } from "../wallet";

const MINT_DATA = encodeFunctionData({
  abi: [{ type: "function", name: "mint", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "nonpayable" }],
  functionName: "mint",
});

type S = ReturnType<typeof useStats>;

export function GenesisPanels({ seatAddress }: { seatAddress: string | null }) {
  const s = useStats(3000, true);
  return (
    <div className="container-site mt-16 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <SeatCounter s={s} />
        <MintButton seatAddress={seatAddress} />
      </div>
      <SeatFeed s={s} />
    </div>
  );
}

function SeatCounter({ s }: { s: S }) {
  return (
    <div className="card p-7">
      <div className="label flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${s?.ok ? "bg-green animate-blink" : "bg-line"}`} />
        Devnet (test) seats minted · chain 11190
      </div>
      <div className="num mt-4 font-mono text-5xl text-bone md:text-6xl">
        {s?.ok && s.seats !== null ? fmtInt(s.seats) : <span className="text-2xl text-muted">{s?.ok ? "contract not found" : "connecting…"}</span>}
      </div>
      <div className="mt-3 font-mono text-[11px] text-muted">
        GenesisSeat.totalSeats() · {s?.seatAddress ? shortAddr(s.seatAddress, 6) : "address TBA"} · block{" "}
        {s?.block !== null && s?.block !== undefined ? `#${fmtInt(s.block)}` : "—"}
      </div>
    </div>
  );
}

function SeatFeed({ s }: { s: S }) {
  const events = s?.recentSeats ?? [];
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="label">Devnet (test) · Latest SeatMinted · last ~2000 blocks</span>
        <span className="font-mono text-[11px] text-muted">{events.length ? `${events.length} events` : "—"}</span>
      </div>
      <ul className="max-h-[360px] overflow-y-auto font-mono text-[12.5px]">
        <AnimatePresence initial={false}>
          {events.map((e) => (
            <motion.li
              key={e.seatId}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between gap-4 border-b border-line/60 px-5 py-2.5 last:border-0"
            >
              <span className="text-bone">
                Seat <span className="text-amber">#{e.seatId}</span> <span className="text-muted">→</span> {shortAddr(e.to, 5)}
              </span>
              <a
                href={`${EXPLORER_URL}/tx/${e.tx}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-muted hover:text-amber"
              >
                #{fmtInt(e.block)} <ArrowUpRight size={11} />
              </a>
            </motion.li>
          ))}
        </AnimatePresence>
        {!events.length && (
          <li className="px-5 py-8 text-center text-muted">
            {s?.ok ? "No SeatMinted events in the last 2000 blocks." : "connecting…"}
          </li>
        )}
      </ul>
    </div>
  );
}

function MintButton({ seatAddress }: { seatAddress: string | null }) {
  const [state, setState] = useState<{ k: "idle" | "busy" | "sent" | "err"; msg?: string; tx?: string }>({ k: "idle" });

  async function mint() {
    const p = getProvider();
    if (!p) return setState({ k: "err", msg: "No injected wallet found." });
    if (!seatAddress) return setState({ k: "err", msg: "GenesisSeat address unknown (deploy devnet first)." });
    try {
      setState({ k: "busy", msg: "Connecting…" });
      const accounts = (await p.request({ method: "eth_requestAccounts" })) as string[];
      setState({ k: "busy", msg: "Switching to chain 11190…" });
      await ensureDevnet(p);
      setState({ k: "busy", msg: "Confirm mint() in your wallet…" });
      const tx = (await p.request({
        method: "eth_sendTransaction",
        params: [{ from: accounts[0], to: seatAddress, data: MINT_DATA }],
      })) as string;
      setState({ k: "sent", tx });
    } catch (e) {
      const m = (e as { shortMessage?: string; message?: string }).shortMessage ?? (e as Error).message ?? "failed";
      setState({ k: "err", msg: m.includes("AlreadyHasSeat") ? "This address already holds a seat." : m.slice(0, 140) });
    }
  }

  return (
    <div className="card p-7">
      <div className="label">Devnet (test) · try it</div>
      <div className="mt-3 text-xl font-medium text-bone">Mint a devnet seat</div>
      <p className="mt-2 text-sm text-muted">
        Connects an injected wallet, switches or adds chain 11190, then calls <code className="font-mono text-bone">mint()</code>.
        One seat per address. {DISCLAIMERS.devnet}
      </p>
      <button type="button" onClick={mint} disabled={state.k === "busy"} className="btn-primary mt-6 disabled:opacity-60">
        {state.k === "busy" ? <Loader2 size={15} className="animate-spin" /> : <Wallet size={15} />}
        {state.k === "busy" ? state.msg : "Mint a devnet seat"}
      </button>
      {state.k === "sent" && (
        <div className="mt-3 font-mono text-[11px] text-green">
          sent ·{" "}
          <a href={`${EXPLORER_URL}/tx/${state.tx}`} target="_blank" rel="noreferrer" className="underline">
            {shortAddr(state.tx ?? "", 8)}
          </a>
        </div>
      )}
      {state.k === "err" && <div className="mt-3 font-mono text-[11px] text-red">{state.msg}</div>}
      <p className="mt-6 text-xs leading-relaxed text-muted">
        Devnet seats are test data only. Real Genesis Seats are claimed on BSC mainnet (panel above) and written into the
        genesis block.
      </p>
    </div>
  );
}
