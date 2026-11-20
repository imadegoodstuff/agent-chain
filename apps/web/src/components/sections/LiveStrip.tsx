"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useStats } from "@/hooks/useStats";
import { useBsc } from "@/hooks/useBsc";
import { usePrice } from "@/hooks/usePrice";
import { fmtWei } from "@/lib/format";
import { Section } from "../ui/Section";
import { Reveal } from "../ui/Reveal";
import { useL, useLang } from "../LangProvider";
import { fmtInt, fmtPct, fmtSmall, fmtUsd } from "@/lib/format";
import { EXPLORER_URL, FEES, LINKS, RPC_URL, TRANSFER_USD } from "@/lib/spec";

function Stat({
  label,
  value,
  sub,
  href,
  live,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  href?: string;
  live?: boolean;
}) {
  const inner = (
    <>
      <div className="label flex items-center justify-between">
        <span className="flex items-center gap-2">
          {live !== undefined && <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-green animate-blink" : "bg-line"}`} />}
          {label}
        </span>
        {href && <ArrowUpRight size={12} className="text-muted" />}
      </div>
      <div className="num mt-4 break-all font-mono text-[1.6rem] leading-tight tracking-tight text-bone sm:text-3xl md:text-[2.4rem]">{value}</div>
      {sub && <div className="mt-2 break-words font-mono text-xs text-muted">{sub}</div>}
    </>
  );
  const cls = "block min-w-0 bg-surface p-5 transition-colors hover:bg-surface-2 sm:p-7";
  if (href && href.startsWith("/")) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function LiveStrip({ seatsVisible }: { seatsVisible: boolean }) {
  const { t } = useLang();
  const L = useL();
  const s = useStats(3000);
  const b = useBsc(15_000);
  const p = usePrice();
  const connecting = <span className="text-lg text-muted">{t("connecting")}</span>;
  const feeAntb = TRANSFER_USD / p.usd;
  const showSeats = seatsVisible || (s?.ok && s.seats !== null);

  return (
    <Section id="live" className="!pt-0">
      <Reveal>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="label-amber flex items-center gap-3">
            <span>{t("s_live").toUpperCase()}</span>
            <span className="text-line">/</span>
            <span>DEVNET · CHAIN 11190 · POLLED EVERY 3 S</span>
          </div>
          <div className="font-mono text-[11px] text-muted">
            {s?.ok ? "rpc ok" : s ? `rpc ${s.error ? "unreachable" : "…"}` : "…"} · {p.live ? `price ${p.source}` : "price fallback"}
          </div>
        </div>
      </Reveal>
      <Reveal delay={0.1}>
        <div className={`grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3 ${showSeats ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
          <Stat
            label={t("live_block")}
            live={!!s?.ok}
            value={s?.ok && s.block !== null ? `#${fmtInt(s.block)}` : connecting}
            sub={s?.ok ? `+1 every 250 ms` : RPC_URL}
            href={EXPLORER_URL}
          />
          <Stat
            label={t("live_bps")}
            value={s?.ok && s.blocksPerSec ? s.blocksPerSec.toFixed(2) : s?.ok ? <span className="text-lg text-muted">measuring…</span> : connecting}
            sub={s?.ok && s.blockTimeMs ? `wall-clock · ≈ ${s.blockTimeMs} ms / block` : "target 4.00 (250 ms)"}
          />
          {showSeats && (
            <Stat
              label={t("live_seats")}
              value={s?.ok && s.seats !== null ? fmtInt(s.seats) : connecting}
              sub="GenesisSeat.totalSeats()"
              href="/genesis"
            />
          )}
          <Stat
            label="ANTB · USD"
            live={p.live}
            value={fmtUsd(p.usd)}
            sub={
              p.live && p.change24h !== null ? (
                <span className={p.change24h >= 0 ? "text-green" : "text-red"}>
                  {fmtPct(p.change24h)} 24h · {p.source}
                </span>
              ) : (
                `$${FEES.antIpoClose} · IPO close`
              )
            }
            href={LINKS.dexscreener}
          />
          <Stat
            label={L("Implied fee / transfer", "每笔转账隐含费用")}
            value={`$${TRANSFER_USD.toFixed(4)}`}
            sub={`${fmtSmall(feeAntb, 3)} ANTB · 21,000 gas @ $0.045/M`}
          />
        </div>
      </Reveal>
      <Reveal delay={0.15}>
        <div className="mt-8 mb-4 flex flex-wrap items-end justify-between gap-4">
          <div className="label-amber flex items-center gap-3">
            <span>{L("MAINNET", "主网")}</span>
            <span className="text-line">/</span>
            <span>BSC · CHAIN 56 · CONTRACTS LIVE · POLLED EVERY 15 S</span>
          </div>
          <div className="font-mono text-[11px] text-muted">{b?.ok ? `bsc rpc ok · block #${fmtInt(b.block)}` : b ? "bsc rpc unreachable" : "…"}</div>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
          <Stat
            label={L("Genesis Seats claimed · BSC", "已领取创世席位 · BSC")}
            live={!!b?.ok}
            value={b?.seats ? fmtInt(b.seats.totalSeats) : connecting}
            sub="GenesisSeatClaim.totalSeats() · soulbound, one per Agent ID"
            href="/genesis"
          />
          <Stat
            label={L("Genesis Deposits · BSC", "创世存款 · BSC")}
            live={!!b?.ok}
            value={b?.bridge ? fmtInt(b.bridge.depositCount) : connecting}
            sub={b?.bridge ? `${fmtWei(b.bridge.totalDeposited, 4)} / ${fmtWei(b.bridge.globalCap, 0)} ANTB escrowed · credited 1:1 in block 0` : "Bridge.depositCount() · totalDeposited()"}
            href="/bridge"
          />
        </div>
      </Reveal>
    </Section>
  );
}
