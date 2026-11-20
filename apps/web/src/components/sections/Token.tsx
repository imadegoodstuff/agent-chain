"use client";

import { useState } from "react";
import { ArrowUpRight, Check, ShieldAlert, Wallet } from "lucide-react";
import { Section, SectionHeader } from "../ui/Section";
import { Reveal } from "../ui/Reveal";
import { CopyButton } from "../ui/CopyButton";
import { AGENT_TOKEN, LINKS, REVENUE_SPLIT } from "@/lib/spec";
import { useL, useLang } from "../LangProvider";
import { useToken } from "@/hooks/useToken";
import { usePrice } from "@/hooks/usePrice";
import { fmtInt, fmtWei, shortAddr } from "@/lib/format";
import { bscAddr, bscTx } from "@/lib/bsc";
import { AGENT_WATCH_ASSET } from "@/lib/token";
import { getProvider } from "../wallet";

const SPLIT_ZH: Record<string, string> = { "Genesis Seat holders": "创世席位持有者", "Buy & burn $AGENT": "回购销毁 $AGENT", Operations: "运营" };

function Donut() {
  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 140 140" className="h-44 w-44 -rotate-90" aria-hidden>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#1A1B23" strokeWidth="14" />
      {REVENUE_SPLIT.map((s) => {
        const len = (s.pct / 100) * c;
        const el = (
          <circle
            key={s.label}
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="14"
            strokeDasharray={`${len - 2} ${c - len + 2}`}
            strokeDashoffset={-offset}
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

/** Small-number formatter for ANTB-per-AGENT prices (≈1e-7) without exponent notation. */
function tinyAntb(wei: bigint): string {
  const s = (Number(wei) / 1e18).toFixed(12).replace(/0+$/, "").replace(/\.$/, "");
  return s === "" ? "0" : s;
}

function AddToWallet() {
  const L = useL();
  const [state, setState] = useState<"idle" | "added" | "no-wallet" | "rejected">("idle");
  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          const p = getProvider();
          if (!p) return setState("no-wallet");
          try {
            await p.request({ method: "wallet_watchAsset", params: AGENT_WATCH_ASSET as unknown as object });
            setState("added");
          } catch {
            setState("rejected");
          }
        }}
        className="btn-ghost h-9 whitespace-nowrap px-3 text-[13px]"
      >
        {state === "added" ? <Check size={14} /> : <Wallet size={14} />}
        {state === "added" ? L("Added", "已添加") : L("Add $AGENT to wallet", "把 $AGENT 添加到钱包")}
      </button>
      {state === "no-wallet" && <div className="mt-1 font-mono text-[10.5px] text-red">{L("No injected wallet found.", "未检测到注入式钱包。")}</div>}
      {state === "rejected" && <div className="mt-1 font-mono text-[10.5px] text-muted">{L("Request rejected.", "请求被拒绝。")}</div>}
    </div>
  );
}

export function TokenLiveCard({ compact = false }: { compact?: boolean }) {
  const L = useL();
  const t = useToken(10_000);
  const p = usePrice();
  const price = t?.priceWei ? BigInt(t.priceWei) : null;
  const priceAntb = price !== null ? Number(price) / 1e18 : null;
  const priceUsd = priceAntb !== null ? priceAntb * p.usd : null;
  const migrated = t?.status === "migrated";
  const pct = t?.progressPct ?? null;
  const circ = t?.circulatingWei ? BigInt(t.circulatingWei) : null;
  const thresh = t?.dexSupplyThreshWei ? BigInt(t.dexSupplyThreshWei) : null;

  return (
    <div className={`card h-full min-w-0 ${compact ? "p-5" : "p-7"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="label flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${t?.ok ? "bg-green animate-blink" : "bg-line"}`} /> $AGENT · {L("live on Flap", "Flap 实时")}
        </div>
        <span
          className={`rounded-md border px-2 py-1 font-mono text-[11px] ${
            !t?.ok ? "border-line text-muted" : migrated ? "border-green/40 bg-green/10 text-green" : "border-amber/40 bg-amber/10 text-amber"
          }`}
        >
          {!t ? "…" : !t.ok ? L("read failed", "读取失败") : migrated ? L("Migrated to PancakeSwap", "已迁移到 PancakeSwap") : L("On curve · launched 2026-11-20", "曲线中 · 2026-11-20 发行")}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="min-w-0">
          <div className="label">{L("Price", "价格")}</div>
          <div className="num mt-1 break-words font-mono text-2xl text-bone">{price !== null ? `${tinyAntb(price)} ANTB` : "—"}</div>
          <div className="mt-1 font-mono text-[11px] text-muted">
            {priceUsd !== null ? `≈ $${priceUsd.toFixed(8)} · ANTB ${p.live ? p.source : "IPO close"}` : L("per AGENT · from Flap Portal", "每 AGENT · 来自 Flap Portal")}
          </div>
        </div>
        <div className="min-w-0">
          <div className="label">{L("Curve reserve", "曲线储备")}</div>
          <div className="num mt-1 break-words font-mono text-2xl text-bone">{t?.reserveWei ? `${fmtWei(t.reserveWei, 2)} ANTB` : "—"}</div>
          <div className="mt-1 font-mono text-[11px] text-muted">
            {circ !== null ? `${fmtWei(circ, 0)} / ${fmtInt(AGENT_TOKEN.totalSupply)} AGENT ${L("sold", "已售出")}` : L("quote held by the bonding curve", "联合曲线持有的报价代币")}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between font-mono text-[10.5px] text-muted">
          <span>{L("Progress to PancakeSwap migration", "迁移到 PancakeSwap 的进度")}</span>
          <span className="text-bone">{pct !== null ? `${pct.toFixed(1)}%` : "—"}</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div className={`h-full ${migrated ? "bg-green" : "bg-amber"}`} style={{ width: `${migrated ? 100 : (pct ?? 0)}%` }} />
        </div>
        <div className="mt-1 font-mono text-[10.5px] text-muted">
          {L("Migrates at 80% sold", "售出 80% 时迁移")} ({thresh !== null ? fmtWei(thresh, 0) : fmtInt(AGENT_TOKEN.migrationThresholdTokens)} AGENT) · Portal.getTokenV8Safe()
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <a href={AGENT_TOKEN.flapUrl} target="_blank" rel="noreferrer" className="btn-primary h-9 whitespace-nowrap px-3 text-[13px]">
          {L("Buy on Flap", "在 Flap 购买")} <ArrowUpRight size={14} />
        </a>
        {migrated ? (
          <a href={AGENT_TOKEN.dexscreenerUrl} target="_blank" rel="noreferrer" className="btn-ghost h-9 whitespace-nowrap px-3 text-[13px]">
            DexScreener <ArrowUpRight size={14} />
          </a>
        ) : (
          <span
            className="btn-ghost h-9 cursor-not-allowed whitespace-nowrap px-3 text-[13px] opacity-50"
            title={L("DexScreener lists the pair after migration to PancakeSwap.", "迁移到 PancakeSwap 后 DexScreener 才会收录交易对。")}
            aria-disabled
          >
            DexScreener · {L("after migration", "迁移后")}
          </span>
        )}
        <a href={AGENT_TOKEN.bscscanUrl} target="_blank" rel="noreferrer" className="btn-ghost h-9 whitespace-nowrap px-3 text-[13px]">
          BscScan <ArrowUpRight size={14} />
        </a>
        <AddToWallet />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[11px]">
        <span className="break-all text-bone/90">{AGENT_TOKEN.address}</span>
        <CopyButton value={AGENT_TOKEN.address} />
        <span className="text-muted">BSC · 18 dec · {L("supply", "总量")} {fmtInt(AGENT_TOKEN.totalSupply)}</span>
      </div>

      {!compact && (
        <ul className="mt-5 space-y-1.5 rounded-md border border-amber/30 bg-amber/[0.06] p-3 text-[12px] leading-relaxed text-bone/85">
          <li className="flex gap-2">
            <ShieldAlert size={12} className="mt-[3px] shrink-0 text-amber" />
            <span>
              {L("Flap tax token: 1% buy / 1% sell for 365 days, 100% of tax to the ", "Flap 税收代币：买入 1% / 卖出 1%，持续 365 天，税收 100% 进入")}
              <a href={bscAddr(AGENT_TOKEN.taxBeneficiary)} target="_blank" rel="noreferrer" className="font-mono text-amber hover:underline">
                {L("creator treasury wallet", "创建者金库钱包")} {shortAddr(AGENT_TOKEN.taxBeneficiary, 4)}
              </a>
              {L(". No dividends, no burn, no Agent ID gate — open to all wallets.", "。无分红、无销毁、无 Agent ID 门槛——对所有钱包开放。")}
            </span>
          </li>
          <li className="flex gap-2">
            <ShieldAlert size={12} className="mt-[3px] shrink-0 text-amber" />
            <span>
              {L("Creator first buy at launch: 0.6 ANTB → 15,060,562.91 AGENT (≈1.5% of supply) to the launcher ", "创建者在发行时首购：0.6 ANTB → 15,060,562.91 AGENT（≈ 总量的 1.5%），由发行地址 ")}
              <a href={bscAddr(AGENT_TOKEN.launcher)} target="_blank" rel="noreferrer" className="font-mono text-amber hover:underline">
                {shortAddr(AGENT_TOKEN.launcher, 4)}
              </a>
              {t?.launcherBalanceWei !== null && t?.launcherBalanceWei !== undefined ? ` (${L("launcher balance now", "发行地址当前余额")} ${fmtWei(t.launcherBalanceWei, 0)} AGENT)` : ""}. {L("Launch tx ", "发行交易 ")}
              <a href={bscTx(AGENT_TOKEN.launchTx)} target="_blank" rel="noreferrer" className="font-mono text-amber hover:underline">
                {shortAddr(AGENT_TOKEN.launchTx, 4)}
              </a>
              .
            </span>
          </li>
          <li className="flex gap-2">
            <ShieldAlert size={12} className="mt-[3px] shrink-0 text-amber" />
            <span className="text-bone">{L(AGENT_TOKEN.standingLine, AGENT_TOKEN.standingLineZh)}</span>
          </li>
        </ul>
      )}
    </div>
  );
}

export function Token() {
  const L = useL();
  const { lang } = useLang();
  const zh = lang === "zh";
  return (
    <Section id="token">
      <SectionHeader
        index="05"
        titleKey="s_token"
        heading={L("Sequencer revenue is ANTB. It goes to seats, to burn, and to running the chain.", "排序器收入是 ANTB。它流向席位、销毁，以及链的运营。")}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Reveal>
          <div className="card h-full p-7">
            <div className="label">{L("Revenue split · ANTB · governance parameter", "收入分配 · ANTB · 治理参数")}</div>
            <div className="mt-6 flex flex-col items-center gap-8 sm:flex-row">
              <div className="relative">
                <Donut />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-[10px] uppercase tracking-label text-muted">{L("per block", "每个区块")}</span>
                  <span className="font-mono text-lg text-bone">100%</span>
                </div>
              </div>
              <ul className="w-full space-y-3">
                {REVENUE_SPLIT.map((s) => (
                  <li key={s.label} className="flex items-center justify-between gap-4 border-b border-line/60 pb-3 last:border-0">
                    <span className="flex items-center gap-3 text-sm text-bone">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                      {zh ? SPLIT_ZH[s.label] ?? s.label : s.label}
                    </span>
                    <span className="num font-mono text-sm text-muted">{s.pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hairline mt-6 grid gap-3 pt-5 text-sm text-muted sm:grid-cols-2">
              <div>
                <span className="text-bone">{L("Index token.", "指数代币。")}</span>{" "}
                {L(
                  "$AGENT is the protocol's community and governance token. It does not pay for gas (ANTB does) and promises no yield.",
                  "$AGENT 是协议的社区与治理代币。它不用于支付 gas（gas 是 ANTB），也不承诺任何收益。",
                )}
              </div>
              <div>
                <span className="text-bone">{L("Buy-and-burn is a parameter.", "回购销毁是一个参数。")}</span>{" "}
                {L(
                  "The 40% buy-and-burn share and the 40% to Genesis Seats are protocol parameters that governance can change; nothing here is a promise. Arbitrum Expansion Program: 10% of protocol net revenue.",
                  "40% 回购销毁与 40% 分配给创世席位都是治理可更改的协议参数，不是承诺。Arbitrum Expansion Program：协议净收入的 10%。",
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
              <span>{L("Open launch on Flap · ANTB pool · no Agent ID gate · no team swap fee", "在 Flap 开放发行 · ANTB 池 · 无 Agent ID 门槛 · 无团队交易手续费")}</span>
              <a href={LINKS.flap} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber hover:underline">
                flap.sh <ArrowUpRight size={11} />
              </a>
            </div>
            <p className="mt-5 text-xs leading-relaxed text-muted">
              {L(
                "Nothing here is investment advice. $AGENT confers no rights to revenue, equity, or returns; fee distributions are protocol parameters that governance can change. Crypto assets can lose all value.",
                "本页内容不构成投资建议。$AGENT 不赋予任何收入、股权或回报权利；费用分配是治理可更改的协议参数。加密资产可能归零。",
              )}
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <TokenLiveCard />
        </Reveal>
      </div>
    </Section>
  );
}
