"use client";

import { useState } from "react";
import type { AddressScan, TxRow } from "@/lib/types";
import { TxTable } from "./TxTable";

/**
 * Address activity list with a "Load older" button. The server renders the first
 * window (newest 500 blocks); each click fetches the previous 500 blocks via
 * /api/address/[address]/txs?before=… and appends the rows.
 */
export function AddressTxs({ address, initial, windowBlocks }: { address: string; initial: AddressScan; windowBlocks: number }) {
  const [rows, setRows] = useState<TxRow[]>(initial.rows);
  const [from, setFrom] = useState<string>(initial.scannedFrom);
  const [to] = useState<string>(initial.scannedTo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partial, setPartial] = useState(initial.partial);

  const atGenesis = from === "0";

  async function loadOlder() {
    if (loading || atGenesis) return;
    setLoading(true);
    setError(null);
    try {
      const before = (BigInt(from) - 1n).toString();
      const r = await fetch(`/api/address/${address}/txs?before=${before}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as AddressScan;
      setRows((prev) => {
        const seen = new Set(prev.map((t) => t.hash));
        return [...prev, ...j.rows.filter((t) => !seen.has(t.hash))];
      });
      setFrom(j.scannedFrom);
      setPartial(j.partial);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-line text-[11px] num text-muted">
        <span>
          scanned blocks {from} → {to}
          {partial ? " (partial, timed out)" : ""}
        </span>
        <span>{rows.length} found · cached 10 s</span>
      </div>
      <TxTable rows={rows} highlight={address} empty={`No transactions involving this address in blocks ${from} → ${to}.`} />
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-line">
        <span className="num text-[11px] text-muted">
          {atGenesis ? "Reached genesis (block 0)." : `Older activity: scan blocks ${(BigInt(from) - 1n - BigInt(windowBlocks - 1) < 0n ? 0n : BigInt(from) - 1n - BigInt(windowBlocks - 1)).toString()} → ${(BigInt(from) - 1n).toString()}`}
          {error ? <span className="text-danger ml-2">({error})</span> : null}
        </span>
        <button type="button" className="btn text-[12px]" onClick={loadOlder} disabled={loading || atGenesis}>
          {loading ? "Scanning…" : `Load older (${windowBlocks} blocks)`}
        </button>
      </div>
    </>
  );
}
