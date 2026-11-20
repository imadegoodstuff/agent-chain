import type { ReactNode } from "react";
import { NETWORK } from "@/lib/config";

export function Card({ title, right, children, className = "", pad = true }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-3 px-4 h-11 border-b border-line">
          <div className="label">{title}</div>
          <div className="text-xs text-muted">{right}</div>
        </header>
      )}
      <div className={pad ? "p-4" : ""}>{children}</div>
    </section>
  );
}

/** Key/value row for detail pages. */
export function KV({ k, children, hint }: { k: string; children: ReactNode; hint?: string }) {
  return (
    <div className="row grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-1 sm:gap-4 py-3 px-4 items-start">
      <dt className="text-[13px] text-muted" title={hint}>
        {k}
      </dt>
      <dd className="text-[13px] min-w-0 break-words">{children}</dd>
    </div>
  );
}

export function Badge({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: "neutral" | "amber" | "green" | "red"; className?: string }) {
  const tones = {
    neutral: "border-line text-muted bg-surface-2",
    amber: "border-amber/40 text-amber bg-amber/10",
    green: "border-signal/40 text-signal bg-signal/10",
    red: "border-danger/40 text-danger bg-danger/10",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[11px] ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function MethodBadge({ label, kind }: { label: string; kind: "transfer" | "create" | "known" | "unknown" }) {
  const tone = kind === "create" ? "amber" : kind === "known" ? "green" : "neutral";
  return (
    <Badge tone={tone} className="max-w-[140px] truncate" >
      <span className="truncate" title={label}>{label}</span>
    </Badge>
  );
}

/**
 * Gas usage bar. `tone="auto"` (blocks): green → amber → red by fill level.
 * For transactions pass `tone="red"` only when the tx reverted; a transfer that uses
 * 100 % of its 21,000 gas limit is normal, so it is amber, not red.
 */
export function GasBar({ pct, className = "", tone: forced = "auto" }: { pct: number; className?: string; tone?: "auto" | "amber" | "red" | "green" }) {
  const p = Math.max(0, Math.min(100, pct));
  const auto = p > 90 ? "bg-danger" : p > 60 ? "bg-amber" : "bg-signal";
  const tone = forced === "auto" ? auto : forced === "red" ? "bg-danger" : forced === "green" ? "bg-signal" : "bg-amber";
  return (
    <div className={`h-1 w-full rounded-full bg-line overflow-hidden ${className}`} title={`${p.toFixed(2)}%`}>
      <div className={`h-full ${tone} transition-[width] duration-500`} style={{ width: `${p}%` }} />
    </div>
  );
}

export function SectionLabel({ n, children }: { n: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="label text-amber">{n}</span>
      <span className="label">{children}</span>
      <span className="flex-1 h-px bg-line" />
    </div>
  );
}

export function Unreachable({ error, retryHref }: { error?: string; retryHref?: string }) {
  return (
    <div className="card p-8 text-center">
      <div className="inline-flex items-center gap-2 label text-danger mb-3">
        <span className="h-1.5 w-1.5 rounded-full bg-danger" /> RPC unreachable
      </div>
      <p className="text-sm text-muted max-w-md mx-auto">
        The explorer could not reach the {NETWORK} RPC. The node may be restarting. Retry in a few seconds.
      </p>
      {error && <p className="num text-[11px] text-muted/70 mt-2 break-all">{error}</p>}
      {retryHref && (
        <a href={retryHref} className="btn mt-4">
          Retry
        </a>
      )}
    </div>
  );
}
