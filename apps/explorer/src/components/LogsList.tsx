"use client";

import Link from "next/link";
import { useState } from "react";
import { Copyable } from "./Copyable";
import { Badge } from "./ui";

export type LogView = {
  address: string;
  topics: string[];
  data: string;
  logIndex: number;
  known: string | null;
  /** Known event signature for topics[0], resolved server-side. */
  eventSig: string | null;
};

export function LogsList({ logs }: { logs: LogView[] }) {
  const [raw, setRaw] = useState(false);
  if (!logs.length) return <div className="p-4 text-sm text-muted">No logs emitted.</div>;
  return (
    <div>
      <div className="flex items-center justify-between px-4 h-10 border-b border-line">
        <span className="label">{logs.length} log{logs.length === 1 ? "" : "s"}</span>
        <button
          type="button"
          onClick={() => setRaw((r) => !r)}
          className={`px-2.5 h-7 rounded font-mono text-[11px] uppercase tracking-wider transition-colors ${raw ? "bg-surface-2 text-amber" : "text-muted hover:text-bone"}`}
        >
          Raw
        </button>
      </div>
      {raw ? (
        <pre className="p-4 num text-[11px] leading-5 overflow-x-auto text-bone/90">
          {JSON.stringify(
            logs.map(({ address, topics, data, logIndex }) => ({ logIndex, address, topics, data })),
            null,
            2,
          )}
        </pre>
      ) : (
        <ul>
          {logs.map((l) => {
            const sig = l.eventSig;
            return (
              <li key={l.logIndex} className="row p-4 grid sm:grid-cols-[64px_1fr] gap-3">
                <div>
                  <Badge tone="neutral">#{l.logIndex}</Badge>
                </div>
                <div className="space-y-2 min-w-0 text-[13px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-muted w-16">address</span>
                    <Link href={`/address/${l.address}`} className="link num break-all">
                      {l.address}
                    </Link>
                    <Copyable value={l.address} />
                    {l.known && <Badge tone="amber">{l.known}</Badge>}
                  </div>
                  {sig && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted w-16">event</span>
                      <span className="num text-signal">{sig}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="text-muted w-16 shrink-0">topics</span>
                    <ol className="space-y-1 min-w-0">
                      {l.topics.map((t, i) => (
                        <li key={i} className="flex items-center gap-2 min-w-0">
                          <span className="num text-[10px] text-muted/70 w-5 shrink-0">[{i}]</span>
                          <span className={`num break-all ${i === 0 ? "text-amber" : ""}`}>{t}</span>
                          <Copyable value={t} />
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted w-16 shrink-0">data</span>
                    <span className="num break-all text-bone/90 flex-1">{l.data === "0x" ? <span className="text-muted">0x (empty)</span> : l.data}</span>
                    {l.data !== "0x" && <Copyable value={l.data} />}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
