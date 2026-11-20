"use client";

import Link from "next/link";
import { ArrowRight, Boxes, Clock3, Fuel, Armchair, ArrowLeftRight, AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { BlockRow, HeadResponse, TxRow } from "@/lib/types";
import { formatGwei, formatInt, formatNative, formatUsd, nativeToUsd, truncateHash } from "@/lib/format";
import { ANT_USD_ILLUSTRATIVE, SYMBOL, TARGET_BLOCK_MS } from "@/lib/config";
import { Age } from "./Age";
import { HashLink } from "./HashLink";
import { Copyable } from "./Copyable";
import { Badge, GasBar, MethodBadge, SectionLabel } from "./ui";

const POLL_MS = 1000;

export function LiveHome({ initial }: { initial: HeadResponse }) {
  const [head, setHead] = useState<HeadResponse>(initial);
  const [lastOkAt, setLastOkAt] = useState<number | null>(initial.status === "ok" ? Date.now() : null);
  const seenBlocks = useRef<Set<string>>(new Set(dataOf(initial)?.blocks.map((b) => b.number) ?? []));
  const seenTxs = useRef<Set<string>>(new Set(dataOf(initial)?.txs.map((t) => t.hash) ?? []));
  const firstPaint = useRef(true);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const r = await fetch("/api/head", { cache: "no-store" });
        const j = (await r.json()) as HeadResponse;
        if (!alive) return;
        setHead((prev) => {
          // devnet reset: head went backwards → forget what we've seen
          const pd = dataOf(prev);
          const nd = dataOf(j);
          if (pd && nd && BigInt(nd.stats.latestBlock) < BigInt(pd.stats.latestBlock)) {
            seenBlocks.current.clear();
            seenTxs.current.clear();
          }
          return j;
        });
        if (j.status === "ok") setLastOkAt(Date.now());
      } catch {
        if (alive)
          setHead((prev) => ({
            ok: false,
            status: "unreachable",
            chainId: prev.chainId,
            rpcUrl: prev.rpcUrl,
            rpcFallbackUrl: prev.rpcFallbackUrl,
            fetchedAt: Date.now(),
            error: "Explorer API unreachable",
            stale: dataOf(prev) ?? undefined,
          }));
      } finally {
        if (alive) timer = setTimeout(tick, document.hidden ? POLL_MS * 5 : POLL_MS);
      }
    };
    timer = setTimeout(tick, POLL_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  const data = dataOf(head);
  const unreachable = head.status === "unreachable";

  // Mark newly-seen rows for the insertion animation; after this render, they count as seen.
  const newBlocks = useMemo(() => {
    const s = new Set<string>();
    if (firstPaint.current) return s;
    for (const b of data?.blocks ?? []) if (!seenBlocks.current.has(b.number)) s.add(b.number);
    return s;
  }, [data]);
  const newTxs = useMemo(() => {
    const s = new Set<string>();
    if (firstPaint.current) return s;
    for (const t of data?.txs ?? []) if (!seenTxs.current.has(t.hash)) s.add(t.hash);
    return s;
  }, [data]);
  useEffect(() => {
    firstPaint.current = false;
    for (const b of data?.blocks ?? []) seenBlocks.current.add(b.number);
    for (const t of data?.txs ?? []) seenTxs.current.add(t.hash);
  }, [data]);

  return (
    <div className="space-y-8">
      {unreachable && (
        <div className="card border-danger/40 bg-danger/5 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
          <div className="text-sm">
            <div className="text-danger font-medium">RPC unreachable</div>
            <div className="text-muted text-[13px] mt-0.5">
              {head.error}. Retrying every second
              {lastOkAt ? ` · showing last snapshot from ${Math.round((Date.now() - lastOkAt) / 1000)} s ago` : ""}.
              <span className="num text-[12px] ml-2 text-muted/70">{head.rpcUrl}</span>
            </div>
          </div>
        </div>
      )}

      <section>
        <SectionLabel n="01">Network</SectionLabel>
        <StatsStrip head={head} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionLabel n="02">Latest blocks</SectionLabel>
          <div className="card overflow-hidden">
            <div className="grid grid-cols-[88px_1fr_1fr_80px] gap-3 px-4 h-9 items-center border-b border-line label">
              <span>Block</span>
              <span>Proposer</span>
              <span className="hidden sm:block">Gas used</span>
              <span className="text-right">Txs</span>
            </div>
            {data ? (
              <ul className={unreachable ? "opacity-60" : ""}>
                {data.blocks.map((b) => (
                  <BlockItem key={b.number} b={b} fresh={newBlocks.has(b.number)} />
                ))}
              </ul>
            ) : (
              <EmptyRows />
            )}
          </div>
        </div>

        <div>
          <SectionLabel n="03">Latest transactions</SectionLabel>
          <div className="card overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_110px] gap-3 px-4 h-9 items-center border-b border-line label">
              <span>Tx</span>
              <span>From → To</span>
              <span className="text-right">Value</span>
            </div>
            {data ? (
              data.txs.length ? (
                <ul className={unreachable ? "opacity-60" : ""}>
                  {data.txs.map((t) => (
                    <TxItem key={t.hash} t={t} fresh={newTxs.has(t.hash)} />
                  ))}
                </ul>
              ) : (
                <div className="p-8 text-center text-sm text-muted">No transactions in the last 15 blocks.</div>
              )
            ) : (
              <EmptyRows />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function dataOf(h: HeadResponse) {
  if (h.status === "ok") return h;
  return h.stale ?? null;
}

function StatsStrip({ head }: { head: HeadResponse }) {
  const d = dataOf(head);
  const s = d?.stats;
  const gas = s?.gasPriceWei ? BigInt(s.gasPriceWei) : null;
  const gasUsdPer21k = gas !== null ? nativeToUsd(gas * 21_000n) : null;
  const stats: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; hidden?: boolean }[] = [
    {
      icon: <Boxes className="h-4 w-4" />,
      label: "Latest block",
      value: s ? <Link href={`/block/${s.latestBlock}`} className="link">#{formatInt(BigInt(s.latestBlock))}</Link> : "—",
      sub: d ? <Age ts={d.blocks[0]?.timestamp ?? 0} /> : undefined,
    },
    {
      icon: <Clock3 className="h-4 w-4" />,
      label: "Avg block time",
      // Nitro seals blocks only when there are transactions; a huge observed gap just means the chain was idle.
      value: s?.avgBlockMs == null ? "—" : s.avgBlockMs > 60_000 ? "on demand" : `${s.avgBlockMs} ms`,
      sub: s?.avgBlockMs != null && s.avgBlockMs > 60_000 ? `idle · blocks sealed per tx · target ${TARGET_BLOCK_MS} ms` : `observed · target ${TARGET_BLOCK_MS} ms`,
    },
    {
      icon: <ArrowLeftRight className="h-4 w-4" />,
      label: "Txs / last 100 blocks",
      value: s ? formatInt(s.txsLast100) : "—",
      sub: s ? `${(s.txsLast100 / 100).toFixed(2)} tx per block` : undefined,
    },
    {
      icon: <Fuel className="h-4 w-4" />,
      label: "Gas price",
      value: gas !== null ? `${formatGwei(gas)} gwei` : "—",
      sub:
        gas !== null ? (
          <span title={`21,000-gas transfer at the current eth_gasPrice. USD illustrative at ANT = $${ANT_USD_ILLUSTRATIVE}.`}>
            21k tx ≈ {formatNative(gas * 21_000n, { maxFrac: 7 })}
            <br />≈ {formatUsd(gasUsdPer21k ?? 0)}
          </span>
        ) : undefined,
    },
    {
      icon: <Armchair className="h-4 w-4" />,
      label: "Genesis Seats",
      value: s?.totalSeats != null ? formatInt(BigInt(s.totalSeats)) : "—",
      sub: "GenesisSeat.totalSeats()",
      hidden: !s || s.totalSeats == null,
    },
  ];
  const visible = stats.filter((x) => !x.hidden);
  return (
    <div className={`grid gap-3 grid-cols-2 ${visible.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
      {visible.map((x) => (
        // min-w-0 + wrapping (no `truncate`) so labels/sub-lines never overlap at 390 px wide.
        <div key={x.label} className="card p-3 sm:p-4 flex flex-col gap-2 min-w-0 last:odd:col-span-2 lg:last:odd:col-span-1">
          <div className="flex items-start gap-2 text-muted min-w-0">
            <span className="text-amber shrink-0 mt-px">{x.icon}</span>
            <span className="label leading-snug break-words min-w-0">{x.label}</span>
          </div>
          <div className="num text-lg sm:text-xl text-bone break-words leading-tight">{x.value}</div>
          {x.sub && <div className="num text-[11px] text-muted break-words leading-snug">{x.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function BlockItem({ b, fresh }: { b: BlockRow; fresh: boolean }) {
  return (
    <li className={`row grid grid-cols-[88px_1fr_1fr_80px] gap-3 px-4 py-2.5 items-center hover:bg-surface-2/60 transition-colors ${fresh ? "animate-row-in" : ""}`}>
      <div className="min-w-0">
        <Link href={`/block/${b.number}`} className="link num text-[13px]">
          {b.number}
        </Link>
        <div className="text-[11px]">
          <Age ts={b.timestamp} />
        </div>
      </div>
      <div className="min-w-0">
        <HashLink value={b.miner} kind="address" copy={false} />
        <div className="num text-[11px] text-muted truncate">{truncateHash(b.hash, 8, 6)}</div>
      </div>
      <div className="hidden sm:block min-w-0">
        <div className="num text-[12px] text-bone">{b.gasUsedPct.toFixed(2)}%</div>
        <GasBar pct={b.gasUsedPct} className="mt-1.5" />
      </div>
      <div className="text-right">
        <Badge tone={b.txCount > 0 ? "amber" : "neutral"}>{b.txCount} tx</Badge>
      </div>
    </li>
  );
}

function TxItem({ t, fresh }: { t: TxRow; fresh: boolean }) {
  const v = BigInt(t.value);
  return (
    <li className={`row grid grid-cols-[1fr_1fr_110px] gap-3 px-4 py-2.5 items-center hover:bg-surface-2/60 transition-colors ${fresh ? "animate-row-in" : ""}`}>
      <div className="min-w-0">
        <HashLink value={t.hash} kind="tx" copy={false} />
        <div className="flex items-center gap-2 mt-0.5">
          <MethodBadge label={t.method} kind={t.methodKind} />
          <Age ts={t.timestamp} className="text-[11px]" />
        </div>
      </div>
      <div className="min-w-0 num text-[12px]">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-muted w-7 shrink-0">from</span>
          <HashLink value={t.from} kind="address" copy={false} />
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-muted w-7 shrink-0 inline-flex items-center">
            <ArrowRight className="h-3 w-3" />
          </span>
          {t.to ? <HashLink value={t.to} kind="address" copy={false} /> : <span className="text-amber">contract creation</span>}
        </div>
      </div>
      <div className="text-right min-w-0">
        <div className="num text-[12px] text-bone truncate" title={`${formatNative(v, { maxFrac: 18 })}`}>
          {v === 0n ? `0 ${SYMBOL}` : formatNative(v, { maxFrac: 4 })}
        </div>
        <div className="num text-[11px] text-muted">{formatUsd(nativeToUsd(v))}</div>
      </div>
    </li>
  );
}

function EmptyRows() {
  return (
    <div className="p-8 text-center">
      <div className="label text-danger mb-2">RPC unreachable</div>
      <p className="text-sm text-muted">No data yet. The explorer keeps retrying.</p>
    </div>
  );
}

export function RpcLine({ url }: { url: string }) {
  return (
    <span className="inline-flex items-center gap-1 num text-[11px] text-muted">
      {url} <Copyable value={url} />
    </span>
  );
}
