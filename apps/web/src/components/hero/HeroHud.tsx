"use client";

import { useStats } from "@/hooks/useStats";
import { usePrice } from "@/hooks/usePrice";
import { useLang } from "../LangProvider";
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

export function HeroHud() {
  const { t } = useLang();
  const s = useStats(3000);
  const p = usePrice();
  const connecting = <span className="text-muted">{t("connecting")}</span>;
  const feeAntb = TRANSFER_USD / p.usd;

  return (
    <div className="container-site">
      <div className="hairline flex divide-x divide-line overflow-x-auto [scrollbar-width:none]">
        <Cell
          label={t("live_block")}
          live={!!s?.ok}
          value={s?.ok && s.block !== null ? `#${fmtInt(s.block)}` : connecting}
          sub={s?.ok ? `chain ${s.chainId ?? "11190"} · 250 ms` : "devnet · chain 11190"}
        />
        <Cell
          label={t("live_bps")}
          value={s?.ok && s.blocksPerSec ? s.blocksPerSec.toFixed(2) : s?.ok ? <span className="text-muted">measuring…</span> : connecting}
          sub={s?.ok && s.blockTimeMs ? `≈ ${s.blockTimeMs} ms / block` : "target 4.00"}
        />
        {s?.ok && s.seats !== null && (
          <Cell label={t("live_seats")} value={fmtInt(s.seats)} sub="minted on devnet" />
        )}
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
        <Cell
          label={t("live_fee")}
          value={`≈ $${TRANSFER_USD.toFixed(4)}`}
          sub={`${fmtSmall(feeAntb, 2)} ANTB · 21,000 gas`}
        />
      </div>
    </div>
  );
}
