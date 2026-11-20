"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bot, IdCard, ShieldCheck } from "lucide-react";
import { useL } from "@/components/LangProvider";
import { CopyButton } from "@/components/ui/CopyButton";
import { Reveal } from "@/components/ui/Reveal";
import { AGENT_LINKS } from "@/lib/agent";

/** Three-step "agent-first" strip: Agent ID → install skill → claim / bridge (every write previews first). */
export function AgentSteps({ className = "" }: { className?: string }) {
  const L = useL();
  const steps = [
    {
      I: IdCard,
      t: L("1 · Get your Agent ID", "1 · 领取 Agent ID"),
      d: L("In the Binance App: Wallet → Agent ID banner. It is minted to your Agentic Wallet (CLI-only, `baw`).", "在 Binance App：钱包 → Agent ID 横幅。它铸造在你的 Agentic Wallet 中（仅 CLI，`baw`）。"),
    },
    {
      I: Bot,
      t: L("2 · Tell your agent to install the skill", "2 · 让你的 agent 安装 skill"),
      d: L("Any agent that can fetch a URL and run a shell. One command, below.", "任何能访问 URL 并运行 shell 的 agent。一条命令，见下方。"),
      cmd: AGENT_LINKS.npx,
    },
    {
      I: ShieldCheck,
      t: L("3 · Claim your seat / bridge ANTB", "3 · 领取席位 / 跨桥 ANTB"),
      d: L("Every write is previewed (decoded calldata + wallet risk output) and executed only after your explicit “yes”.", "每笔写操作都先预览（解码后的 calldata + 钱包风险提示），只在你明确说“yes”后才执行。"),
      href: "/genesis#agent",
    },
  ];
  return (
    <Reveal className={className}>
      <div className="label-amber mb-4 flex flex-wrap items-center gap-3">
        <span>{L("AGENT-FIRST", "AGENT 优先")}</span>
        <span className="text-line">/</span>
        <span>{L("YOUR AGENT ID LIVES IN THE AGENTIC WALLET", "你的 AGENT ID 在 AGENTIC WALLET 里")}</span>
      </div>
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.t} className="min-w-0 bg-surface p-6">
            <s.I size={18} className="text-amber" strokeWidth={1.6} />
            <div className="mt-4 text-base font-medium text-bone">{s.t}</div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
            {"cmd" in s && s.cmd && (
              <div className="mt-3">
                <pre className="max-w-full overflow-x-auto rounded-md border border-line bg-ink p-2.5 font-mono text-[11px] text-bone/90">
                  <code>{s.cmd}</code>
                </pre>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <CopyButton value={s.cmd} />
                  <a href={AGENT_LINKS.skill} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-amber hover:underline">
                    SKILL.md <ArrowUpRight size={11} />
                  </a>
                </div>
              </div>
            )}
            {"href" in s && s.href && (
              <Link href={s.href} className="mt-3 inline-flex items-center gap-1.5 text-sm text-amber hover:underline">
                {L("Open the agent tab", "打开 agent 标签页")} <ArrowRight size={14} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </Reveal>
  );
}

/** Builders card: skill, MCP endpoint, Skills Hub listing. */
export function AgentIntegrationCard() {
  const L = useL();
  const rows = [
    { k: L("Skill (source)", "Skill（源码）"), v: AGENT_LINKS.skill, copy: AGENT_LINKS.npx, hint: AGENT_LINKS.npx },
    { k: L("MCP endpoint", "MCP 端点"), v: AGENT_LINKS.mcp, copy: AGENT_LINKS.mcp, hint: L("agentchain_head · agentchain_fee_estimate · agentchain_is_agent · agentchain_genesis_stats", "agentchain_head · agentchain_fee_estimate · agentchain_is_agent · agentchain_genesis_stats") },
    { k: "Binance Skills Hub", v: AGENT_LINKS.skillsHubPr, copy: AGENT_LINKS.skillsHubPr, hint: L("PR #425 · listing pending", "PR #425 · 上架审核中"), badge: L("listing pending", "上架审核中") },
  ];
  return (
    <div className="card min-w-0 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="label flex items-center gap-2">
          <Bot size={12} className="text-amber" /> {L("Agent integration", "Agent 集成")}
        </div>
        <span className="font-mono text-[11px] text-muted">baw ≥ 1.12 · Skills Hub format</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {L(
          "The agent-chain skill drives the BSC-side writes (register, claim, approve + deposit) through `baw contract-call preview → execute` with one confirmation per transaction, and reads AGENT CHAIN over JSON-RPC. The MCP server exposes the read-only tools.",
          "agent-chain skill 通过 `baw contract-call preview → execute` 驱动 BSC 侧写操作（注册、领取、approve + deposit），每笔交易一次确认，并通过 JSON-RPC 读取 AGENT CHAIN。MCP 服务器提供只读工具。",
        )}
      </p>
      <div className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {rows.map((r) => (
          <div key={r.k} className="flex min-w-0 flex-col gap-2 bg-surface p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="label flex items-center gap-2">
                {r.k}
                {"badge" in r && r.badge && <span className="rounded border border-amber/40 bg-amber/10 px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-amber">{r.badge}</span>}
              </div>
              <a href={r.v} target="_blank" rel="noreferrer" className="mt-1.5 block break-all font-mono text-[12.5px] text-bone hover:text-amber">
                {r.v}
              </a>
              <div className="mt-1 break-all font-mono text-[11px] text-muted">{r.hint}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <CopyButton value={r.copy} />
              <a href={r.v} target="_blank" rel="noreferrer" className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-md border border-line text-muted hover:text-bone" aria-label={`Open ${r.k}`}>
                <ArrowUpRight size={12} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
