import { formatUnits } from "viem";
import { ANT_USD_ILLUSTRATIVE, DECIMALS, SYMBOL } from "./config";

export function truncateHash(hash: string, head = 6, tail = 4): string {
  if (!hash) return "";
  if (hash.length <= head + tail + 2) return hash;
  return `${hash.slice(0, head + 2)}…${hash.slice(-tail)}`;
}

export function truncateMiddle(s: string, head = 8, tail = 6): string {
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

/** Format a wei bigint as a native-currency string with sensible precision. */
export function formatNative(wei: bigint, opts: { maxFrac?: number; symbol?: boolean } = {}): string {
  const { maxFrac = 6, symbol = true } = opts;
  const raw = formatUnits(wei, DECIMALS);
  const [intPart, fracPart = ""] = raw.split(".");
  let frac = fracPart.slice(0, maxFrac).replace(/0+$/, "");
  let text = withThousands(intPart);
  if (wei !== 0n && intPart === "0" && frac === "") {
    // smaller than 10^-maxFrac: show as exponent-ish with more digits
    frac = fracPart.slice(0, 12).replace(/0+$/, "");
    if (frac === "") text = "<0.000001";
    else text = `0.${frac}`;
  } else if (frac) {
    text = `${text}.${frac}`;
  }
  return symbol ? `${text} ${SYMBOL}` : text;
}

/** USD illustration at ANT = $97.17 (SPEC §3). */
export function nativeToUsd(wei: bigint): number {
  return Number(formatUnits(wei, DECIMALS)) * ANT_USD_ILLUSTRATIVE;
}

export function formatUsd(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.000001) return "<$0.000001";
  if (usd < 0.01) return `$${usd.toFixed(6).replace(/0+$/, "")}`;
  if (usd < 1) return `$${usd.toFixed(4)}`;
  return `$${usd.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

export function formatGwei(wei: bigint, maxFrac = 4): string {
  const g = Number(formatUnits(wei, 9));
  if (g === 0) return "0";
  if (g < 0.0001) return g.toExponential(2);
  return g.toLocaleString("en-US", { maximumFractionDigits: maxFrac });
}

export function withThousands(intStr: string): string {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatInt(n: bigint | number): string {
  return withThousands(n.toString());
}

export function formatBytes(n: number | bigint): string {
  const v = Number(n);
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(2)} KB`;
  return `${(v / 1024 / 1024).toFixed(2)} MB`;
}

export function percent(part: bigint, whole: bigint): number {
  if (whole === 0n) return 0;
  return Number((part * 10_000n) / whole) / 100;
}

/** Timestamps this far ahead of the viewer's clock are treated as clock skew, not age. */
export const FUTURE_SKEW_SEC = 5;

/**
 * "2 s ago", "3 min ago", ... Never negative: age = max(0, now − ts). A timestamp more
 * than FUTURE_SKEW_SEC in the future (chain/browser clock skew) renders as "just now".
 */
export function relativeAge(tsSec: number | bigint, nowMs: number = Date.now()): string {
  const raw = Math.floor(nowMs / 1000) - Number(tsSec);
  if (raw < -FUTURE_SKEW_SEC) return "just now";
  const diff = Math.max(0, raw);
  if (diff < 60) return `${diff} s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86400)} d ago`;
}

export function formatTimestamp(tsSec: number | bigint): string {
  const d = new Date(Number(tsSec) * 1000);
  return d.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

/** Balance/value for display: at most `maxFrac` decimals, with the exact value for a title attribute. */
export function formatNativeWithFull(wei: bigint, maxFrac = 6): { short: string; full: string } {
  return { short: formatNative(wei, { maxFrac }), full: formatNative(wei, { maxFrac: 18 }) };
}

export function isHexHash(s: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(s);
}

export function isAddress(s: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(s);
}

export function isBlockNumber(s: string): boolean {
  return /^\d+$/.test(s);
}
