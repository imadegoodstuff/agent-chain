"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Bot, Check, ChevronDown, Copy, ShieldCheck } from "lucide-react";
import { isAddress } from "viem";
import { useL, useLang } from "@/components/LangProvider";
import { CopyButton } from "@/components/ui/CopyButton";
import { AddressStatus } from "./AddressStatus";
import { BridgeRiskBullets } from "@/components/bridge/BridgeApp";
import { useBsc } from "@/hooks/useBsc";
import { fmtInt, fmtWei } from "@/lib/format";
import { AGENT_ID_SNAPSHOT, BSC_CONTRACTS, bscCode } from "@/lib/bsc";
import {
  AGENT_LINKS,
  BRIDGE_DEFAULT_ANTB,
  BRIDGE_MAX_ANTB,
  bridgePrompt,
  bridgeSteps,
  genesisPrompt,
  genesisSteps,
  parseAntb,
  registerSteps,
  type AgentStep,
} from "@/lib/agent";

function PromptBox({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false);
  const L = useL();
  return (
    <div className="rounded-lg border border-amber/40 bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="label-amber flex items-center gap-2">
          <Bot size={12} /> {label}
        </span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setOk(true);
              setTimeout(() => setOk(false), 1600);
            } catch {
              /* ignore */
            }
          }}
          className="btn-primary h-9 shrink-0 whitespace-nowrap px-3 text-[13px]"
        >
          {ok ? <Check size={14} /> : <Copy size={14} />}
          {ok ? L("Copied", "已复制") : L("Copy prompt", "复制提示词")}
        </button>
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-bone">{text}</p>
      <p className="mt-3 text-[12px] text-muted">
        {L(
          "Paste it into any agent that can fetch a URL and run a shell (Claude Code, Cursor, OpenClaw…). Nothing is signed without your explicit “yes” to each preview.",
          "粘贴到任何能访问 URL 并运行 shell 的 agent（Claude Code、Cursor、OpenClaw…）。每笔交易都要先预览，没有你明确说“yes”不会签名。",
        )}
      </p>
    </div>
  );
}

function StepList({ steps, title }: { steps: AgentStep[]; title: string }) {
  const { lang } = useLang();
  return (
    <div>
      <div className="label mb-3">{title}</div>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={`${s.cmd}-${i}`} className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-amber">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-sm font-medium text-bone">{lang === "zh" ? s.titleZh : s.title}</span>
              </div>
              <CopyButton value={s.cmd} className="shrink-0" />
            </div>
            <pre className="mt-1.5 max-w-full overflow-x-auto rounded-md border border-line bg-ink p-3 font-mono text-[11.5px] leading-relaxed text-bone/90">
              <code>{s.cmd}</code>
            </pre>
            {(lang === "zh" ? s.noteZh : s.note) && <div className="mt-1 break-words font-mono text-[11px] text-muted">{lang === "zh" ? s.noteZh : s.note}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Expandable({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="card group min-w-0 overflow-hidden" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-medium text-bone">{title}</span>
        <ChevronDown size={16} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-line p-5">{children}</div>
    </details>
  );
}

function InstallBox() {
  const L = useL();
  return (
    <div className="grid gap-3 text-[12.5px] sm:grid-cols-2">
      <div className="min-w-0">
        <div className="label mb-1.5">{L("Skill (install from GitHub)", "Skill（从 GitHub 安装）")}</div>
        <pre className="max-w-full overflow-x-auto rounded-md border border-line bg-ink p-3 font-mono text-[11.5px] text-bone/90">
          <code>{AGENT_LINKS.npx}</code>
        </pre>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
          <CopyButton value={AGENT_LINKS.npx} />
          <a href={AGENT_LINKS.skill} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber hover:underline">
            SKILL.md <ArrowUpRight size={11} />
          </a>
          <a href={AGENT_LINKS.skillsHubPr} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-amber">
            Skills Hub PR #425 · {L("listing pending", "上架审核中")} <ArrowUpRight size={11} />
          </a>
        </div>
      </div>
      <div className="min-w-0">
        <div className="label mb-1.5">{L("Agentic Wallet CLI", "Agentic Wallet CLI")}</div>
        <pre className="max-w-full overflow-x-auto rounded-md border border-line bg-ink p-3 font-mono text-[11.5px] text-bone/90">
          <code>{AGENT_LINKS.bawInstall}</code>
        </pre>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
          <CopyButton value={AGENT_LINKS.bawInstall} />
          <span className="text-muted">{L("baw ≥ 1.12 · Developer Mode required for writes", "baw ≥ 1.12 · 写操作需开启开发者模式")}</span>
        </div>
      </div>
    </div>
  );
}

function WhyAgent({ mode }: { mode: "genesis" | "bridge" }) {
  const L = useL();
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-4 text-[13px] leading-relaxed text-muted">
      <div className="flex items-center gap-2 text-bone">
        <ShieldCheck size={14} className="text-green" />
        {L("Your Agent ID lives in the Agentic Wallet — drive it from your agent.", "你的 Agent ID 在 Agentic Wallet 里——用你的 agent 来操作。")}
      </div>
      <p className="mt-1.5">
        {L(
          "The Binance Agent ID is minted to your Agentic Wallet, an isolated CLI wallet (`baw`). It cannot connect to a dApp in the browser and QR/pairing-code logins are off-limits. So the normal path is: tell your agent what you want, it installs the agent-chain skill, runs the read checks, and previews every transaction for your explicit confirmation before anything is signed.",
          "Binance Agent ID 铸造在你的 Agentic Wallet 中——一个隔离的 CLI 钱包（`baw`）。它无法在浏览器里连接 dApp，也禁止二维码/配对码登录。所以正常路径是：告诉你的 agent 你想做什么，它安装 agent-chain skill，先做只读检查，再把每笔交易预览给你，必须你明确确认后才会签名。",
        )}{" "}
        {mode === "bridge"
          ? L("A bridge is two transactions (approve, then deposit) — two previews, two confirmations.", "跨桥是两笔交易（先 approve 再 deposit）——两次预览、两次确认。")
          : L("Claiming a seat is one transaction with no value and no approvals.", "领取席位是一笔交易，不转账、不授权。")}
      </p>
    </div>
  );
}

export function GenesisAgentPanel() {
  const { lang } = useLang();
  const L = useL();
  const bsc = useBsc(15_000);
  const prompt = genesisPrompt(lang);
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-5">
        <WhyAgent mode="genesis" />
        <PromptBox text={prompt} label={L("Agent prompt · claim Genesis Seat", "Agent 提示词 · 领取创世席位")} />
        <Expandable title={L("What your agent will run", "你的 agent 会运行什么")}>
          <div className="space-y-6">
            <InstallBox />
            <StepList steps={genesisSteps()} title={L("Claim · one preview, one confirmation, one execute", "领取 · 一次预览、一次确认、一次执行")} />
            <StepList steps={registerSteps()} title={L("Optional · register in AgentRegistryMirror", "可选 · 在 AgentRegistryMirror 注册")} />
            <div className="text-[12px] text-muted">
              {L("Commands and selectors are copied verbatim from ", "命令与选择器逐字取自 ")}
              <a href={AGENT_LINKS.skill} target="_blank" rel="noreferrer" className="text-amber hover:underline">
                skills/agent-chain/references
              </a>
              . {L("Contract source: ", "合约源码：")}
              <a href={bscCode(BSC_CONTRACTS.GenesisSeatClaim)} target="_blank" rel="noreferrer" className="font-mono text-amber hover:underline">
                GenesisSeatClaim
              </a>
            </div>
          </div>
        </Expandable>
        <p className="text-xs leading-relaxed text-muted">
          {L(
            "A Genesis Seat is a numbered, non-transferable identity and priority marker. It confers no rights to revenue, equity or returns. Claiming records a public link between your Agent ID address and AGENT CHAIN.",
            "创世席位是带编号、不可转让的身份与优先级凭证，不赋予任何收入、股权或回报权利。领取会在链上公开记录你的 Agent ID 地址与 AGENT CHAIN 的关联。",
          )}
        </p>
      </div>
      <div className="min-w-0 space-y-5">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
          <div className="bg-surface p-4">
            <div className="label flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${bsc?.ok ? "bg-green animate-blink" : "bg-line"}`} /> {L("Seats claimed", "已领取席位")}
            </div>
            <div className="num mt-2 font-mono text-3xl text-bone">{bsc?.seats ? fmtInt(bsc.seats.totalSeats) : "—"}</div>
            <div className="mt-1 font-mono text-[10.5px] text-muted">{bsc?.seats ? (bsc.seats.claimOpen ? "claimOpen() = true" : L("claim closed", "领取已关闭")) : "totalSeats()"}</div>
          </div>
          <div className="bg-surface p-4">
            <div className="label">{L("Eligible", "符合资格")}</div>
            <div className="num mt-2 font-mono text-3xl text-bone">{fmtInt(AGENT_ID_SNAPSHOT.holders)}</div>
            <div className="mt-1 font-mono text-[10.5px] text-muted">
              {L("Agent ID holders · block", "Agent ID 持有者 · 区块")} {fmtInt(AGENT_ID_SNAPSHOT.block)}
            </div>
          </div>
        </div>
        <AddressStatus focus="genesis" />
      </div>
    </div>
  );
}

export function BridgeAgentPanel() {
  const { lang } = useLang();
  const L = useL();
  const bsc = useBsc(15_000);
  const [amount, setAmount] = useState(BRIDGE_DEFAULT_ANTB);
  const [recipient, setRecipient] = useState("");

  const amountWei = parseAntb(amount);
  const maxWei = parseAntb(BRIDGE_MAX_ANTB)!;
  const amountErr =
    amount.trim() && amountWei === null
      ? L("Enter a decimal ANTB amount.", "请输入十进制 ANTB 数量。")
      : amountWei !== null && amountWei > maxWei
        ? L(`Max ${BRIDGE_MAX_ANTB} ANTB per address during Beta.`, `Beta 期间每地址最多 ${BRIDGE_MAX_ANTB} ANTB。`)
        : null;
  const recipientErr = recipient.trim() && !isAddress(recipient.trim(), { strict: false }) ? L("0x address only (or leave empty for your own Agentic Wallet address).", "仅支持 0x 地址（留空则使用你自己的 Agentic Wallet 地址）。") : null;

  const prompt = useMemo(() => bridgePrompt(lang, amountErr ? BRIDGE_DEFAULT_ANTB : amount, recipientErr ? "" : recipient.trim()), [lang, amount, recipient, amountErr, recipientErr]);
  const steps = useMemo(() => bridgeSteps(amountErr || !amountWei ? parseAntb(BRIDGE_DEFAULT_ANTB)! : amountWei, recipientErr ? "" : recipient.trim()), [amountWei, amountErr, recipient, recipientErr]);

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-5">
        <WhyAgent mode="bridge" />
        <div className="card min-w-0 p-5">
          <div className="label">{L("Deposit · parameters", "存款 · 参数")}</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
            <label className="block min-w-0">
              <span className="font-mono text-[11px] text-muted">{L("Amount (ANTB)", "数量（ANTB）")}</span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="mt-1 w-full min-w-0 rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-[14px] text-bone outline-none focus:border-amber/50"
                aria-label="Amount in ANTB"
              />
              <span className="mt-1 block font-mono text-[10.5px] text-muted">
                {L("max", "上限")} {BRIDGE_MAX_ANTB} · {L("global", "全局")} {bsc?.bridge ? `${fmtWei(bsc.bridge.remainingGlobal, 2)} / ${fmtWei(bsc.bridge.globalCap, 0)}` : "100"} ANTB
              </span>
            </label>
            <label className="block min-w-0">
              <span className="font-mono text-[11px] text-muted">{L("L2 recipient (optional)", "L2 接收地址（可选）")}</span>
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                spellCheck={false}
                placeholder={lang === "zh" ? "留空 = 我的 Agentic Wallet 地址" : "empty = my Agentic Wallet address"}
                className="mt-1 w-full min-w-0 rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-[13px] text-bone outline-none placeholder:text-muted/60 focus:border-amber/50"
                aria-label="L2 recipient"
              />
              <span className="mt-1 block font-mono text-[10.5px] text-muted">
                {L("AGENT CHAIN mainnet (chain 1119) · relayer credits 1:1 within minutes", "AGENT CHAIN 主网（链 1119）· relayer 数分钟内 1:1 入账")}
              </span>
            </label>
          </div>
          {(amountErr || recipientErr) && <div className="mt-2 font-mono text-[11px] text-red">{amountErr ?? recipientErr}</div>}
        </div>
        <PromptBox text={prompt} label={L("Agent prompt · bridge ANTB", "Agent 提示词 · 跨桥 ANTB")} />
        <BridgeRiskBullets />
        <Expandable title={L("What your agent will run", "你的 agent 会运行什么")}>
          <div className="space-y-6">
            <InstallBox />
            <StepList steps={steps} title={L("Bridge · two previews, two confirmations", "跨桥 · 两次预览、两次确认")} />
            <div className="text-[12px] text-muted">
              {L("Calldata is encoded in your browser from the inputs above with the published ABIs; ", "Calldata 由浏览器根据上方输入和公开 ABI 编码；")}
              <code className="font-mono text-bone">{"<USER_ADDRESS>"}</code> / <code className="font-mono text-bone">{"<L2_RECIPIENT>"}</code>{" "}
              {L("are filled in by your agent from ", "由你的 agent 通过 ")}
              <code className="font-mono text-bone">baw wallet address</code>
              {L(". Recipes: ", " 填入。来源：")}
              <a href={AGENT_LINKS.skill} target="_blank" rel="noreferrer" className="text-amber hover:underline">
                references/bridge.md
              </a>
              {" · "}
              <a href={bscCode(BSC_CONTRACTS.Bridge)} target="_blank" rel="noreferrer" className="font-mono text-amber hover:underline">
                Bridge source
              </a>
            </div>
          </div>
        </Expandable>
      </div>
      <div className="min-w-0 space-y-5">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
          <div className="bg-surface p-4">
            <div className="label flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${bsc?.ok ? "bg-green animate-blink" : "bg-line"}`} /> {L("Deposits", "存款笔数")}
            </div>
            <div className="num mt-2 font-mono text-3xl text-bone">{bsc?.bridge ? fmtInt(bsc.bridge.depositCount) : "—"}</div>
            <div className="mt-1 font-mono text-[10.5px] text-muted">{bsc?.bridge ? (bsc.bridge.paused ? L("paused", "已暂停") : L("window open", "窗口开放")) : "depositCount()"}</div>
          </div>
          <div className="bg-surface p-4">
            <div className="label">{L("Escrowed", "已托管")}</div>
            <div className="num mt-2 font-mono text-3xl text-bone">{bsc?.bridge ? fmtWei(bsc.bridge.totalDeposited, 3) : "—"}</div>
            <div className="mt-1 font-mono text-[10.5px] text-muted">/ {bsc?.bridge ? fmtWei(bsc.bridge.globalCap, 0) : "100"} ANTB · {L("cap", "上限")} 0.1 / {L("address", "地址")}</div>
          </div>
        </div>
        <AddressStatus focus="bridge" />
      </div>
    </div>
  );
}
