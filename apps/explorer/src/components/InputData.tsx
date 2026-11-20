"use client";

import { useState } from "react";
import type { DecodedInput } from "@/lib/selectors";
import { Copyable } from "./Copyable";

export function InputData({ input, decoded }: { input: string; decoded: DecodedInput | null }) {
  const [mode, setMode] = useState<"decoded" | "raw">(decoded ? "decoded" : "raw");
  const empty = !input || input === "0x";
  const selector = input.length >= 10 ? input.slice(0, 10) : "";
  const rest = input.length >= 10 ? input.slice(10) : input.slice(2);
  const words = rest.match(/.{1,64}/g) ?? [];

  if (empty) return <div className="p-4 text-sm text-muted">No input data (plain value transfer).</div>;

  return (
    <div>
      <div className="flex items-center justify-between px-4 h-10 border-b border-line">
        <div className="flex items-center gap-1">
          <Tab active={mode === "decoded"} onClick={() => setMode("decoded")} disabled={!decoded}>
            Decoded
          </Tab>
          <Tab active={mode === "raw"} onClick={() => setMode("raw")}>
            Raw
          </Tab>
        </div>
        <div className="flex items-center gap-2 num text-[11px] text-muted">
          {(input.length - 2) / 2} bytes <Copyable value={input} />
        </div>
      </div>

      {mode === "decoded" && decoded ? (
        <div className="p-4 space-y-3">
          <div className="num text-[13px]">
            <span className="text-amber">{decoded.name}</span>
            <span className="text-muted">(</span>
            {decoded.args.map((a, i) => (
              <span key={i}>
                <span className="text-muted">{a.type} </span>
                <span>{a.name}</span>
                {i < decoded.args.length - 1 && <span className="text-muted">, </span>}
              </span>
            ))}
            <span className="text-muted">)</span>
          </div>
          <table className="w-full text-[13px]">
            <tbody>
              <tr className="row">
                <td className="py-1.5 pr-4 text-muted w-32">selector</td>
                <td className="py-1.5 num text-amber">{selector}</td>
              </tr>
              {decoded.args.map((a, i) => (
                <tr key={i} className="row">
                  <td className="py-1.5 pr-4 text-muted align-top">
                    {a.name} <span className="text-muted/60">{a.type}</span>
                  </td>
                  <td className="py-1.5 num break-all">
                    {/^0x[0-9a-fA-F]{40}$/.test(a.value) ? (
                      <a href={`/address/${a.value}`} className="link">
                        {a.value}
                      </a>
                    ) : (
                      a.value
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 num text-[12px] leading-6 break-all">
          <span className="text-amber bg-amber/10 rounded px-1" title={decoded ? decoded.signature : "Function selector"}>
            {selector}
          </span>
          {words.length ? (
            <div className="mt-2 space-y-0.5">
              {words.map((w, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-muted/60 w-10 shrink-0 text-right">[{i}]</span>
                  <span className="text-bone/90">{w}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Tab({ active, onClick, disabled, children }: { active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 h-7 rounded font-mono text-[11px] uppercase tracking-wider transition-colors disabled:opacity-40 ${
        active ? "bg-surface-2 text-amber" : "text-muted hover:text-bone"
      }`}
    >
      {children}
    </button>
  );
}
