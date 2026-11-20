"use client";

import { useState } from "react";
import { ArrowUpRight, Check, CircleAlert, Loader2, Search, X } from "lucide-react";
import { isAddress } from "viem";
import { useL } from "@/components/LangProvider";
import { fmtInt, fmtWei, shortAddr } from "@/lib/format";
import { BSC_CONTRACTS, bscAddr } from "@/lib/bsc";
import type { AddressStatus as Status } from "@/lib/bscTypes";

/**
 * Read-only status of ONE pasted 0x address (the user's own Agentic Wallet address).
 * Deliberately refuses names / handles / .ai domains — the skill and the site never
 * resolve another person's wallet.
 */
export function AddressStatus({ focus = "all" }: { focus?: "all" | "genesis" | "bridge" }) {
  const L = useL();
  const [input, setInput] = useState("");
  const [state, setState] = useState<{ k: "idle" } | { k: "invalid" } | { k: "busy" } | { k: "ok"; s: Status } | { k: "err"; msg: string }>({ k: "idle" });

  async function lookup() {
    const a = input.trim();
    if (!isAddress(a, { strict: false })) return setState({ k: "invalid" });
    setState({ k: "busy" });
    try {
      const r = await fetch(`/api/bsc?address=${a}`, { cache: "no-store" });
      const j = (await r.json()) as Status & { message?: string };
      if (!r.ok) return setState({ k: "err", msg: j.message ?? `HTTP ${r.status}` });
      setState({ k: "ok", s: j });
    } catch (e) {
      setState({ k: "err", msg: (e as Error).message });
    }
  }

  const s = state.k === "ok" ? state.s : null;
  const Row = ({ label, ok, value, href }: { label: string; ok: boolean | null; value: React.ReactNode; href?: string }) => (
    <div className="flex items-start justify-between gap-3 border-t border-line/60 py-2.5 first:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="flex min-w-0 items-center gap-2 text-right font-mono text-[12.5px]">
        {ok === true ? <Check size={13} className="shrink-0 text-green" /> : ok === false ? <X size={13} className="shrink-0 text-red" /> : null}
        <span className={ok === true ? "text-green" : ok === false ? "text-muted" : "text-bone"}>{value}</span>
        {href && (
          <a href={href} target="_blank" rel="noreferrer" className="shrink-0 text-muted hover:text-amber" aria-label="BscScan">
            <ArrowUpRight size={12} />
          </a>
        )}
      </span>
    </div>
  );

  return (
    <div className="card min-w-0 p-5">
      <div className="label">{L("Status lookup · your own address", "状态查询 · 你自己的地址")}</div>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        {L(
          "Paste the 0x address of your Agentic Wallet (baw wallet address --json). Read-only, on-chain, nothing is signed. ",
          "粘贴你 Agentic Wallet 的 0x 地址（baw wallet address --json）。只读链上数据，不签名。",
        )}
        <span className="text-bone/80">
          {L(
            "Address only — we never look up wallets by name, handle or .ai domain, and neither does the skill.",
            "仅支持地址——我们从不按姓名、handle 或 .ai 域名查找钱包，skill 也不会。",
          )}
        </span>
      </p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup();
        }}
      >
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (state.k === "invalid") setState({ k: "idle" });
          }}
          spellCheck={false}
          placeholder="0x…"
          aria-label={L("Your Agentic Wallet address", "你的 Agentic Wallet 地址")}
          className="min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-[13px] text-bone outline-none placeholder:text-muted/60 focus:border-amber/50"
        />
        <button type="submit" disabled={state.k === "busy"} className="btn-ghost h-auto shrink-0 px-3 py-2 disabled:opacity-60">
          {state.k === "busy" ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          <span className="hidden sm:inline">{L("Check", "查询")}</span>
        </button>
      </form>
      {state.k === "invalid" && (
        <div className="mt-2 flex items-start gap-2 rounded-md border border-red/40 bg-red/10 p-2.5 text-[12.5px] text-red">
          <CircleAlert size={14} className="mt-0.5 shrink-0" />
          <span>
            {L(
              "Address only. Enter a 0x address with 40 hex characters. Names, @handles and .ai domains are not accepted — this site never resolves a wallet from a name.",
              "仅支持地址。请输入 0x 开头、40 个十六进制字符的地址。不接受姓名、@handle 或 .ai 域名——本站从不通过名字解析钱包。",
            )}
          </span>
        </div>
      )}
      {state.k === "err" && <div className="mt-2 font-mono text-[11px] text-red">{state.msg}</div>}
      {s && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between font-mono text-[11px] text-muted">
            <a href={bscAddr(s.address)} target="_blank" rel="noreferrer" className="hover:text-amber">
              {shortAddr(s.address, 6)}
            </a>
            <span>{s.ok ? "BSC · live" : L("partial read", "部分读取失败")}</span>
          </div>
          <Row
            label={L("Holds Agent ID (or BAB)", "持有 Agent ID（或 BAB）")}
            ok={s.isAgent}
            value={s.isAgent === null ? "—" : s.isAgent ? `${L("yes", "是")} · Agent ID ${s.agentIdBalance ?? "?"} · BAB ${s.babBalance ?? "?"}` : L("no — claim it in the Binance App: Wallet → banner → Agent ID", "否——在 Binance App 领取：钱包 → 横幅 → Agent ID")}
          />
          {(focus === "all" || focus === "genesis") && (
            <>
              <Row
                label={L("Registered in AgentRegistryMirror", "已在 AgentRegistryMirror 注册")}
                ok={s.registered}
                value={s.registered === null ? "—" : s.registered ? `${L("yes", "是")} · index ${fmtInt(s.registryIndex)}` : L("not yet", "尚未")}
                href={bscAddr(BSC_CONTRACTS.AgentRegistryMirror)}
              />
              <Row
                label={L("Genesis Seat", "创世席位")}
                ok={s.seatId === null ? null : s.seatId > 0}
                value={
                  s.seatId === null
                    ? "—"
                    : s.seatId > 0
                      ? `#${fmtInt(s.seatId)}${s.totalSeats ? ` ${L("of", "/")} ${fmtInt(s.totalSeats)}` : ""}`
                      : L("not claimed", "未领取")
                }
                href={s.seatId ? `https://bscscan.com/nft/${BSC_CONTRACTS.GenesisSeatClaim}/${s.seatId}` : undefined}
              />
            </>
          )}
          {(focus === "all" || focus === "bridge") && (
            <>
              <Row
                label={L("Bridge deposits (Genesis Deposits)", "桥存款（创世存款）")}
                ok={s.depositedBy === null ? null : BigInt(s.depositedBy) > 0n}
                value={s.depositedBy === null ? "—" : `${fmtWei(s.depositedBy, 6)} ANTB`}
                href={bscAddr(BSC_CONTRACTS.Bridge)}
              />
              <Row label={L("Remaining per-address cap", "剩余单地址额度")} ok={null} value={s.remainingFor === null ? "—" : `${fmtWei(s.remainingFor, 6)} ANTB`} />
              <Row label={L("ANTB balance on BSC", "BSC 上的 ANTB 余额")} ok={null} value={s.antbBalance === null ? "—" : `${fmtWei(s.antbBalance, 6)} ANTB`} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
