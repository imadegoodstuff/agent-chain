import { ArrowRight } from "lucide-react";
import type { TxRow } from "@/lib/types";
import { formatNative, formatUsd, nativeToUsd } from "@/lib/format";
import { Age } from "./Age";
import { HashLink } from "./HashLink";
import { MethodBadge } from "./ui";

/** Shared transaction table for block and address pages. */
export function TxTable({ rows, highlight, empty = "No transactions." }: { rows: TxRow[]; highlight?: string; empty?: string }) {
  if (!rows.length) return <div className="p-8 text-center text-sm text-muted">{empty}</div>;
  const hl = highlight?.toLowerCase();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="label border-b border-line text-left">
            <th className="font-normal px-4 h-9">Tx hash</th>
            <th className="font-normal px-2 h-9">Method</th>
            <th className="font-normal px-2 h-9">Block</th>
            <th className="font-normal px-2 h-9">Age</th>
            <th className="font-normal px-2 h-9">From</th>
            <th className="font-normal px-2 h-9 w-6" />
            <th className="font-normal px-2 h-9">To</th>
            <th className="font-normal px-4 h-9 text-right">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const v = BigInt(t.value);
            const fromIsMe = hl && t.from.toLowerCase() === hl;
            const toIsMe = hl && t.to?.toLowerCase() === hl;
            return (
              <tr key={t.hash} className="row hover:bg-surface-2/60 transition-colors">
                <td className="px-4 py-2.5"><HashLink value={t.hash} kind="tx" head={8} tail={6} /></td>
                <td className="px-2 py-2.5"><MethodBadge label={t.method} kind={t.methodKind} /></td>
                <td className="px-2 py-2.5"><HashLink value={t.blockNumber} kind="block" label={t.blockNumber} copy={false} /></td>
                <td className="px-2 py-2.5 whitespace-nowrap"><Age ts={t.timestamp} className="text-[12px]" /></td>
                <td className="px-2 py-2.5">
                  {fromIsMe ? <span className="num text-[13px] text-muted">this address</span> : <HashLink value={t.from} kind="address" copy={false} />}
                </td>
                <td className="px-2 py-2.5 text-muted">
                  {hl ? (
                    <span className={`inline-flex rounded px-1 font-mono text-[10px] uppercase ${toIsMe ? "bg-signal/15 text-signal" : "bg-amber/15 text-amber"}`}>
                      {toIsMe ? "in" : "out"}
                    </span>
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" />
                  )}
                </td>
                <td className="px-2 py-2.5">
                  {t.to ? (
                    toIsMe ? <span className="num text-[13px] text-muted">this address</span> : <HashLink value={t.to} kind="address" copy={false} />
                  ) : (
                    <span className="text-amber text-[12px]">contract creation</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <div className="num" title={formatNative(v, { maxFrac: 18 })}>{formatNative(v, { maxFrac: 6 })}</div>
                  <div className="num text-[11px] text-muted">{formatUsd(nativeToUsd(v))}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
