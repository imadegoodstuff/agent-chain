export function shortAddr(a: string, n = 4): string {
  if (!a) return "";
  return `${a.slice(0, 2 + n)}…${a.slice(-n)}`;
}

export function fmtInt(n: number | bigint | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("en-US");
}

export function fmtUsd(n: number, digits = 2): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function fmtSmall(n: number, sig = 3): string {
  if (!isFinite(n)) return "—";
  if (n === 0) return "0";
  return n.toPrecision(sig).replace(/\.?0+$/, "");
}

/** Formats a wei amount (18 decimals) as a trimmed decimal string. */
export function fmtWei(wei: bigint | string | null | undefined, maxDigits = 4): string {
  if (wei === null || wei === undefined) return "—";
  const v = typeof wei === "string" ? BigInt(wei) : wei;
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const whole = abs / 10n ** 18n;
  const frac = (abs % 10n ** 18n).toString().padStart(18, "0").slice(0, maxDigits).replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole.toLocaleString("en-US")}${frac ? `.${frac}` : ""}`;
}

/** "3 min ago" / "2 h ago" from a unix-seconds timestamp. */
export function fmtAgo(ts: number | null | undefined, now = Date.now()): string {
  if (!ts) return "—";
  const s = Math.max(0, Math.floor(now / 1000 - ts));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function fmtPct(n: number): string {
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}
