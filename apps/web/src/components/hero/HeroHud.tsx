"use client";

import { useL2 } from "@/hooks/useL2";
import { useBsc } from "@/hooks/useBsc";
import { usePrice } from "@/hooks/usePrice";
import { useL, useLang } from "../LangProvider";
import { fmtInt, fmtPct, fmtSmall, fmtUsd } from "@/lib/format";
import { TRANSFER_USD } from "@/lib/spec";

function Cell({ label, value, sub, live }: { label: string; value: React.ReactNode; sub?: React.ReactNode; live?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-5 py-4 first:pl-0 last:pr-0 sm:px-7">
      <div className="label flex items-center gap-2 whitespace-nowrap">
        {live && <span className="h-1 w-1 rounded-full bg-green" />}
        {label}
      </div>
      <div className="num truncate font-mono text-base text-bone sm:text-lg">{value}</div>
      {sub && <div className="truncate font-mono text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

/** Bottom-of-hero HUD: AGENT CHAIN mainnet (chain 1119) live numbers. */
export function HeroHud() {
  const { t } = useLang();
  const L = useL();
  const l2 = useL2(5000);
  const b = useBsc(15_000);
  const p = usePrice();
  const connecting = <span className="text-muted">{t("connecting")}</span>;
  const gasWei = l2?.l2 ? BigInt(l2.l2.gasPriceWei) : null;
  const feeAntb = gasWei !== null ? Number(gasWei * 21_000n) / 1e18 : TRANSFER_USD / p.usd;
  const feeUsd = feeAntb * p.usd;

  return (
    <div className="container-site">
      <div className="hairline flex divide-x divide-line overflow-x-auto [scrollbar-width:none]">
        <Cell
          label={t("live_block")}
          live={!!l2?.ok}
          value={l2?.l2 ? `#${fmtInt(l2.l2.block)}` : connecting}
          sub={l2?.l2 ? `chain 1119 · 250 ms · mainnet beta` : "mainnet · chain 1119"}
        />
        <Cell
          label={L("Batches · BSC", "批次 · BSC")}
          live={l2?.parent?.batchCount !== null && l2?.parent?.batchCount !== undefined}
          value={l2?.parent?.batchCount !== null && l2?.parent?.batchCount !== undefined ? fmtInt(l2.parent.batchCount) : connecting}
          sub="SequencerInbox.batchCount()"
        />
        <Cell label={t("live_seats")} live={!!b?.ok} value={b?.seats ? fmtInt(b.seats.totalSeats) : connecting} sub={L("claimed on BSC", "在 BSC 上领取")} />
        <Cell
          label={t("live_antb")}
          live={p.live}
          value={fmtUsd(p.usd)}
          sub={
            p.live && p.change24h !== null ? (
              <span className={p.change24h >= 0 ? "text-green" : "text-red"}>{fmtPct(p.change24h)} · 24h</span>
            ) : (
              `${fmtUsd(p.usd)} · IPO close`
            )
          }
        />
        <Cell label={t("live_fee")} value={`≈ $${feeUsd.toFixed(4)}`} sub={`${feeAntb.toFixed(12).replace(/0+$/, "")} ANTB · 21,000 gas`} />
      </div>
    </div>
  );
}
