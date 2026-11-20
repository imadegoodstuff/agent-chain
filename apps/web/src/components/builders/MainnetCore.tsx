"use client";

import { ArrowUpRight, ChevronDown, Cpu, ShieldAlert, Wrench } from "lucide-react";
import { useL, useLang } from "@/components/LangProvider";
import { CopyButton } from "@/components/ui/CopyButton";
import { useL2 } from "@/hooks/useL2";
import { fmtInt, fmtWei } from "@/lib/format";
import { bscAddr, bscCode, bscTx } from "@/lib/bsc";
import { BETA_LIMITS, BSC_FINDINGS, LAUNCH, NITRO_ROWS, ROLE_ROWS } from "@/lib/l2";
import { MAINNET } from "@/lib/spec";

const BETA_LIMITS_ZH = [
  "单一排序器（新加坡）。若其停机，仍可通过 delayed Inbox 强制打包。",
  "L2 RPC 不支持 `finalized` / `safe` 区块标签——BSC 不向 Nitro 暴露最终性；请使用 `latest`。",
  "桥存款（0x9eF8CA94…）由 Beta relayer 在数分钟内按 nonce 顺序入账 L2——并非原子操作。",
  "Beta 期间桥上限：每地址 0.1 ANTB、全局 100 ANTB；owner 可提高到 1 / 500。",
  "链 owner 与手续费账户是同一个 EOA；计划迁移到 Safe 多签。",
  "暂无自助提现 UI；L2→BSC 退出需在断言确认后通过 Nitro Outbox 执行。",
  "非 agent 发送方会在网关被拒绝，JSON-RPC 错误码 -32050。",
];

export function MainnetCore() {
  const L = useL();
  const { lang } = useLang();
  const l2 = useL2(10_000);
  return (
    <div className="space-y-10">
      {/* live summary */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4">
        {[
          [L("L2 head", "L2 最新区块"), l2?.l2 ? `#${fmtInt(l2.l2.block)}` : "—", `chain ${MAINNET.chainId} · ${MAINNET.stack}`],
          [L("Batches on BSC", "BSC 上的批次"), l2?.parent?.batchCount !== null && l2?.parent?.batchCount !== undefined ? fmtInt(l2.parent.batchCount) : "—", "SequencerInbox.batchCount()"],
          [L("Latest confirmed assertion", "最新已确认断言"), l2?.parent?.latestConfirmed ? `${l2.parent.latestConfirmed.slice(0, 10)}…` : "—", `BoLD · ${L("base stake", "基础质押")} ${l2?.parent?.baseStakeWei ? fmtWei(l2.parent.baseStakeWei, 3) : LAUNCH.baseStakeWbnb} WBNB`],
          [L("Relayer", "Relayer"), l2?.relayer ? (l2.relayer.ok ? "ok" : l2.relayer.status ? `HTTP ${l2.relayer.status}` : L("offline", "离线")) : "—", L("agentchain-relayer.fly.dev/status · credits bridge deposits", "agentchain-relayer.fly.dev/status · 负责桥存款入账")],
        ].map(([k, v, s]) => (
          <div key={k} className="min-w-0 bg-surface p-5">
            <div className="label">{k}</div>
            <div className="num mt-2 break-all font-mono text-2xl text-bone">{v}</div>
            <div className="mt-1 break-words font-mono text-[10.5px] text-muted">{s}</div>
          </div>
        ))}
      </div>

      {/* core contracts */}
      <div>
        <div className="label-amber mb-4 flex flex-wrap items-center gap-3">
          <span>{L("L2 CORE CONTRACTS ON BSC · NITRO", "BSC 上的 L2 核心合约 · NITRO")}</span>
          <span className="text-line">/</span>
          <a href={bscTx(LAUNCH.createRollupTx)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-amber">
            createRollup {LAUNCH.createRollupTx.slice(0, 10)}… · {L("block", "区块")} {fmtInt(LAUNCH.createRollupBlock)} · {LAUNCH.date} <ArrowUpRight size={11} />
          </a>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-surface-2/70">
              <tr>
                {[L("Contract", "合约"), L("Address", "地址"), "BscScan", L("Purpose", "用途")].map((h) => (
                  <th key={h} className="px-5 py-3 text-left font-mono text-[11px] font-normal uppercase tracking-label text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-surface">
              {NITRO_ROWS.map((c) => (
                <tr key={c.name} className="border-t border-line/70 align-top">
                  <td className="px-5 py-3 font-medium text-bone">{c.name}</td>
                  <td className="px-5 py-3 font-mono text-[12px] text-bone/90">
                    <span className="inline-flex items-center gap-2">
                      <span className="break-all">{c.address}</span>
                      <CopyButton value={c.address} />
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-[12px]">
                    <a href={bscCode(c.address)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber hover:underline">
                      {L("view", "查看")} <ArrowUpRight size={11} />
                    </a>
                  </td>
                  <td className="px-5 py-3 text-muted">{c.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* roles */}
      <div>
        <div className="label-amber mb-4 flex flex-wrap items-center gap-3">
          <span>{L("ROLES & OWNER POWERS", "角色与 OWNER 权限")}</span>
          <span className="text-line">/</span>
          <span className="inline-flex items-center gap-1.5 text-muted">
            <ShieldAlert size={11} className="text-amber" /> {L("chain owner is a single EOA · Safe migration planned", "链 owner 为单个 EOA · 计划迁移到 Safe")}
          </span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-surface-2/70">
              <tr>
                {[L("Role", "角色"), L("Address", "地址"), L("What it can do", "能做什么"), L("Disclosure", "披露")].map((h) => (
                  <th key={h} className="px-5 py-3 text-left font-mono text-[11px] font-normal uppercase tracking-label text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-surface">
              {ROLE_ROWS.map((r) => (
                <tr key={r.role} className="border-t border-line/70 align-top">
                  <td className="px-5 py-3 font-medium text-bone">{r.role}</td>
                  <td className="px-5 py-3 font-mono text-[12px]">
                    <a href={bscAddr(r.address)} target="_blank" rel="noreferrer" className="break-all text-bone/90 hover:text-amber">
                      {r.address}
                    </a>
                  </td>
                  <td className="px-5 py-3 text-muted">{r.powers}</td>
                  <td className="px-5 py-3 text-muted">{r.disclosure}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* beta limits + findings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="card min-w-0 p-6">
          <div className="label flex items-center gap-2">
            <ShieldAlert size={12} className="text-amber" /> {L("Beta limits", "Beta 限制")}
          </div>
          <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-muted">
            {(lang === "zh" ? BETA_LIMITS_ZH : BETA_LIMITS).map((t) => (
              <li key={t} className="flex gap-3">
                <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-amber" />
                <span className="break-words">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <details className="card group min-w-0 overflow-hidden" open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-5 [&::-webkit-details-marker]:hidden">
            <div>
              <div className="label flex items-center gap-2">
                <Wrench size={12} className="text-amber" /> {L("Built on BSC: what we had to patch", "在 BSC 上构建：我们必须修补什么")}
              </div>
              <div className="mt-1 text-sm text-muted">
                {L("Two findings from running Arbitrum Nitro with BSC as the parent chain.", "以 BSC 作为父链运行 Arbitrum Nitro 的两个发现。")}
              </div>
            </div>
            <ChevronDown size={16} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-5 border-t border-line px-6 py-5">
            {BSC_FINDINGS.map((f, i) => (
              <div key={f.title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-amber/50 font-mono text-[11px] text-amber">{i + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-bone">
                    <Cpu size={13} className="text-muted" /> {f.title}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{lang === "zh" ? f.bodyZh : f.body}</p>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
              <a href={LAUNCH.researchUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber hover:underline">
                apps/chain/RESEARCH.md <ArrowUpRight size={11} />
              </a>
              <a href={LAUNCH.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-amber">
                github.com/imadegoodstuff/agent-chain <ArrowUpRight size={11} />
              </a>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
