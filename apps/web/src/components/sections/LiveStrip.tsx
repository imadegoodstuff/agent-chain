"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useStats } from "@/hooks/useStats";
import { useBsc } from "@/hooks/useBsc";
import { useL2 } from "@/hooks/useL2";
import { useToken } from "@/hooks/useToken";
import { usePrice } from "@/hooks/usePrice";
import { Section } from "../ui/Section";
import { Reveal } from "../ui/Reveal";
import { useL, useLang } from "../LangProvider";
import { fmtAgo, fmtInt, fmtPct, fmtSmall, fmtUsd, fmtWei, shortAddr } from "@/lib/format";
import { bscAddr } from "@/lib/bsc";
import { NITRO } from "@/lib/l2";
import { AGENT_TOKEN, DEVNET, EXPLORER_URL, FEES, LINKS, MAINNET, TRANSFER_USD } from "@/lib/spec";

/** Tiny ANTB amounts (≈1e-8) without scientific notation. */
const tiny = (n: number) => n.toFixed(12).replace(/0+$/, "").replace(/\.$/, "");

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
      <div className="num mt-4 break-words font-mono text-[1.6rem] leading-tight tracking-tight text-bone sm:text-3xl md:text-[2.4rem]">{value}</div>
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

export function LiveStrip({ seatsVisible: _seatsVisible }: { seatsVisible: boolean }) {
  const { t } = useLang();
  const L = useL();
  const l2 = useL2(5_000);
  const b = useBsc(15_000);
  const s = useStats(5_000);
  const tk = useToken(10_000);
  const p = usePrice();
  const agentPriceAntb = tk?.priceWei ? Number(BigInt(tk.priceWei)) / 1e18 : null;
  const connecting = <span className="text-lg text-muted">{t("connecting")}</span>;

  const gasWei = l2?.l2 ? BigInt(l2.l2.gasPriceWei) : null;
  const transferAntb = gasWei !== null ? Number(gasWei * 21_000n) / 1e18 : TRANSFER_USD / p.usd;
  const antbPerBnb = l2?.parent?.antbPerBnbWei ? Number(BigInt(l2.parent.antbPerBnbWei)) / 1e18 : null;


  return (
    <Section id="live" className="!pt-0">
      <Reveal>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="label-amber flex flex-wrap items-center gap-3">
            <span>{t("s_live").toUpperCase()}</span>
            <span className="text-line">/</span>
            <span>{L("MAINNET BETA · CHAIN 1119 · NITRO ON BSC · POLLED EVERY 5 S", "主网 BETA · 链 1119 · BSC 上的 NITRO · 每 5 秒轮询")}</span>
          </div>
          <div className="font-mono text-[11px] text-muted">
            {l2?.ok ? `l2 rpc ok · ${new URL(l2.l2!.rpc).host}` : l2 ? `l2 rpc ${l2.error ?? "unreachable"}` : "…"} · {b?.ok ? "bsc ok" : "bsc …"} ·{" "}
            {p.live ? `price ${p.source}` : "price fallback"}
          </div>
        </div>
      </Reveal>
      <Reveal delay={0.1}>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3 lg:grid-cols-5">
          <Stat
            label={L("L2 head block", "L2 最新区块")}
            live={!!l2?.ok}
            value={l2?.l2 ? `#${fmtInt(l2.l2.block)}` : connecting}
            sub={l2?.l2 ? `${L("head", "最新块")} ${fmtAgo(l2.l2.blockTimestamp)} · ${l2.l2.txCountLatest} tx · ${L("blocks only when there are txs", "有交易才出块")}` : `${MAINNET.rpc} · 1119`}
            href={EXPLORER_URL}
          />
          <Stat
            label={L("L2 gas price", "L2 gas 价格")}
            live={!!l2?.ok}
            value={gasWei !== null ? `${fmtSmall(Number(gasWei) / 1e9, 3)} gwei` : connecting}
            sub={gasWei !== null ? `${fmtInt(Number(gasWei))} wei/gas · transfer ≈ ${tiny(transferAntb)} ANTB` : `min base fee ${fmtInt(MAINNET.minBaseFeeWei)} wei`}
          />
          <Stat
            label={L("Batches posted · BSC", "已发布批次 · BSC")}
            live={l2?.parent?.batchCount !== null && l2?.parent?.batchCount !== undefined}
            value={l2?.parent?.batchCount !== null && l2?.parent?.batchCount !== undefined ? fmtInt(l2.parent.batchCount) : connecting}
            sub={
              l2?.parent
                ? `SequencerInbox.batchCount() · ${fmtInt(l2.parent.delayedMessageCount)} delayed msgs · ${l2.parent.latestConfirmed ? `assertion ${l2.parent.latestConfirmed.slice(0, 10)}…` : "BoLD"}`
                : "SequencerInbox 0x1651…d7E8"
            }
            href={bscAddr(NITRO.SequencerInbox)}
          />
          <Stat
            label={L("ANTB / BNB pricer", "ANTB / BNB 定价器")}
            live={antbPerBnb !== null}
            value={antbPerBnb !== null ? `${fmtSmall(antbPerBnb, 4)}` : connecting}
            sub={antbPerBnb !== null ? `ANTB per BNB · L1 gas charged in ANTB · pricer 0x132f…2aa` : "OwnerAdjustableExchangeRatePricer"}
            href={bscAddr(NITRO.FeeTokenPricer)}
          />
          <Stat
            label={L("Genesis Seats claimed", "已领取创世席位")}
            live={!!b?.ok}
            value={b?.seats ? fmtInt(b.seats.totalSeats) : connecting}
            sub="GenesisSeatClaim.totalSeats() · BSC · soulbound"
            href="/genesis"
          />
          <Stat
            label={L("Bridge deposits", "桥存款")}
            live={!!b?.ok}
            value={b?.bridge ? fmtInt(b.bridge.depositCount) : connecting}
            sub={
              b?.bridge
                ? `${fmtWei(b.bridge.totalDeposited, 4)} / ${fmtWei(b.bridge.globalCap, 0)} ANTB escrowed · ${L("relayer credits L2 by nonce", "由 relayer 按 nonce 入账 L2")}${
                    l2?.relayer ? (l2.relayer.ok ? " · relayer ok" : ` · relayer ${l2.relayer.status ?? "offline"}`) : ""
                  }`
                : "Bridge.depositCount() · totalDeposited()"
            }
            href="/bridge"
          />
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
            label="$AGENT · Flap"
            live={!!tk?.ok}
            value={tk?.status === "migrated" ? <span className="text-2xl">{L("on PancakeSwap", "已在 PancakeSwap")}</span> : agentPriceAntb !== null ? `${tiny(agentPriceAntb)} ANTB` : connecting}
            sub={
              tk?.ok
                ? tk.status === "migrated"
                  ? `${L("curve closed · price on DexScreener", "曲线已关闭 · 价格见 DexScreener")} · ${shortAddr(AGENT_TOKEN.address, 4)}`
                  : `${L("curve", "曲线")} ${tk.progressPct?.toFixed(1) ?? "—"}% · ${agentPriceAntb !== null ? `≈ $${(agentPriceAntb * p.usd).toFixed(7)}` : ""} · ${shortAddr(AGENT_TOKEN.address, 4)}`
                : "Portal.getTokenV8Safe()"
            }
            href="/#token"
          />
          <Stat
            label={L("Fee / transfer", "每笔转账费用")}
            value={`$${(transferAntb * p.usd).toFixed(4)}`}
            sub={`${tiny(transferAntb)} ANTB · 21,000 gas · ${gasWei !== null ? L("live base fee", "实时基础费用") : "$0.045/M gas"}`}
          />
        </div>
      </Reveal>
      <Reveal delay={0.15}>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
          <span className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${s?.ok ? "bg-green" : "bg-line"}`} />
            {L("Devnet (test data) · chain 11190", "Devnet（测试数据）· 链 11190")}
          </span>
          <span>{s?.ok && s.block !== null ? `#${fmtInt(s.block)}` : "—"}</span>
          <span>{s?.ok && s.blocksPerSec ? `${s.blocksPerSec.toFixed(2)} blocks/s` : "250 ms"}</span>
          {s?.ok && s.seats !== null && <span>{fmtInt(s.seats)} test seats</span>}
          <a href={DEVNET.explorer} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-amber">
            {new URL(DEVNET.explorer).host} <ArrowUpRight size={11} />
          </a>
          <span className="text-muted/70">{L("Devnet tokens have no value.", "Devnet 代币没有任何价值。")}</span>
        </div>
      </Reveal>
    </Section>
  );
}
