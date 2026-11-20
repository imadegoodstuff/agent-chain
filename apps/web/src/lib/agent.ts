/**
 * Agent-first flow: prompts and the exact `baw` commands from skills/agent-chain
 * (SKILL.md + references/*.md). Commands and selectors are reproduced verbatim;
 * calldata is encoded with the same ABIs the site already uses (lib/bsc.ts).
 */
import { encodeFunctionData, isAddress, parseUnits, zeroAddress, type Address } from "viem";
import { BSC_CONTRACTS, bridgeAbi, erc20Abi, registryAbi, seatClaimAbi } from "./bsc";

export const AGENT_LINKS = {
  repo: "https://github.com/imadegoodstuff/agent-chain",
  skill: "https://github.com/imadegoodstuff/agent-chain/tree/main/skills/agent-chain",
  skillRaw: "https://raw.githubusercontent.com/imadegoodstuff/agent-chain/main/skills/agent-chain/SKILL.md",
  npx: "npx skills add https://github.com/imadegoodstuff/agent-chain --skill agent-chain",
  bawInstall: "npm install -g @binance/agentic-wallet",
  mcp: "https://agentchain-mcp.fly.dev/mcp",
  skillsHubPr: "https://github.com/binance/binance-skills-hub/pull/425",
  agentIdDocs: "https://web3.binance.com/en/dev-docs/products/agentic-wallet/ai-pro#came-from-the-agent-id-campaign",
} as const;

export const USER_ADDR = "<USER_ADDRESS>";
export const L2_RECIPIENT_PLACEHOLDER = "<L2_RECIPIENT>";
export const REQUEST_ID = "<requestId>";

/** Default wording when the user has not pasted an explicit 0x recipient. */
export const MY_WALLET_EN = "my Agentic Wallet address";
export const MY_WALLET_ZH = "我的 Agentic Wallet 地址";

export const BRIDGE_MAX_ANTB = "0.1";
export const BRIDGE_DEFAULT_ANTB = "0.01";

// ------------------------------------------------------------- calldata --

export const CALLDATA = {
  claim: encodeFunctionData({ abi: seatClaimAbi, functionName: "claim" }), // 0x4e71d92d
  register: encodeFunctionData({ abi: registryAbi, functionName: "register" }), // 0x1aa3a008
} as const;

export function approveCalldata(amountWei: bigint): `0x${string}` {
  return encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [BSC_CONTRACTS.Bridge, amountWei] });
}

/** deposit(amount, l2Recipient). With no explicit recipient the 20-byte slot is shown as a placeholder (as in references/bridge.md). */
export function depositCalldata(amountWei: bigint, recipient: string): string {
  if (isAddress(recipient, { strict: false })) {
    return encodeFunctionData({ abi: bridgeAbi, functionName: "deposit", args: [amountWei, recipient as Address] });
  }
  const withZero = encodeFunctionData({ abi: bridgeAbi, functionName: "deposit", args: [amountWei, zeroAddress] });
  return withZero.slice(0, -40) + L2_RECIPIENT_PLACEHOLDER;
}

export function parseAntb(amount: string): bigint | null {
  try {
    const v = parseUnits(amount.trim() || "0", 18);
    return v > 0n ? v : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------- commands --

export const BAW = {
  agentId: "baw wallet agent-id --json",
  address: "baw wallet address --json",
  settings: "baw wallet settings --json",
  preview: (to: string, inputData: string) =>
    `baw contract-call preview --binanceChainId 56 --from ${USER_ADDR} --to ${to} --value 0 --inputData ${inputData} --json`,
  execute: `baw contract-call execute --requestId ${REQUEST_ID} --json`,
} as const;

export type AgentStep = { title: string; titleZh: string; cmd: string; note?: string; noteZh?: string };

export function genesisSteps(): AgentStep[] {
  return [
    { title: "Check Agent ID", titleZh: "检查 Agent ID", cmd: BAW.agentId, note: "claimed must be true (or hold BAB).", noteZh: "claimed 必须为 true（或持有 BAB）。" },
    { title: "Read your address", titleZh: "读取你的地址", cmd: BAW.address, note: "Used as --from below. Only your own address.", noteZh: "作为下方的 --from。仅限你自己的地址。" },
    {
      title: "Developer Mode on",
      titleZh: "开启开发者模式",
      cmd: BAW.settings,
      note: "devMode.enabled must be true (Binance App → Agentic Wallet → Settings → Developer Mode).",
      noteZh: "devMode.enabled 必须为 true（Binance App → Agentic Wallet → 设置 → 开发者模式）。",
    },
    {
      title: "Preview claim()",
      titleZh: "预览 claim()",
      cmd: BAW.preview(BSC_CONTRACTS.GenesisSeatClaim, CALLDATA.claim),
      note: `GenesisSeatClaim.claim() · calldata ${CALLDATA.claim} · value 0. The agent shows decoded calldata + risk output and waits for your "yes".`,
      noteZh: `GenesisSeatClaim.claim() · calldata ${CALLDATA.claim} · value 0。agent 会展示解码后的 calldata 与风险提示，并等待你明确说“yes”。`,
    },
    { title: "Execute (only after you confirm)", titleZh: "执行（仅在你确认后）", cmd: BAW.execute, note: "requestId comes from that preview.", noteZh: "requestId 来自上一步预览。" },
  ];
}

export function registerSteps(): AgentStep[] {
  return [
    {
      title: "Optional · preview register()",
      titleZh: "可选 · 预览 register()",
      cmd: BAW.preview(BSC_CONTRACTS.AgentRegistryMirror, CALLDATA.register),
      note: `AgentRegistryMirror.register() · calldata ${CALLDATA.register}. Independent of the seat; permanent.`,
      noteZh: `AgentRegistryMirror.register() · calldata ${CALLDATA.register}。与席位无关；永久记录。`,
    },
    { title: "Execute (only after you confirm)", titleZh: "执行（仅在你确认后）", cmd: BAW.execute },
  ];
}

export function bridgeSteps(amountWei: bigint, recipient: string): AgentStep[] {
  const approve = approveCalldata(amountWei);
  const deposit = depositCalldata(amountWei, recipient);
  return [
    { title: "Check Agent ID", titleZh: "检查 Agent ID", cmd: BAW.agentId },
    { title: "Read your address", titleZh: "读取你的地址", cmd: BAW.address, note: "Used as --from (and as l2Recipient unless you pasted one).", noteZh: "作为 --from（未粘贴接收地址时也作为 l2Recipient）。" },
    { title: "Developer Mode on", titleZh: "开启开发者模式", cmd: BAW.settings },
    {
      title: "Step 1 of 2 · preview approve (exact amount)",
      titleZh: "第 1/2 步 · 预览 approve（精确数额）",
      cmd: BAW.preview(BSC_CONTRACTS.ANTB, approve),
      note: `ANTB.approve(spender = Bridge, amount = ${amountWei} wei). Never unlimited. Skip if allowance already covers it.`,
      noteZh: `ANTB.approve(spender = Bridge, amount = ${amountWei} wei)。绝不无限授权。若现有 allowance 已足够则跳过。`,
    },
    { title: "Execute approve (after your first yes)", titleZh: "执行 approve（你第一次确认后）", cmd: BAW.execute },
    {
      title: "Step 2 of 2 · preview deposit",
      titleZh: "第 2/2 步 · 预览 deposit",
      cmd: BAW.preview(BSC_CONTRACTS.Bridge, deposit),
      note: `Bridge.deposit(amount = ${amountWei} wei, l2Recipient = ${isAddress(recipient, { strict: false }) ? recipient : "your own address"}). Returns the deposit nonce.`,
      noteZh: `Bridge.deposit(amount = ${amountWei} wei, l2Recipient = ${isAddress(recipient, { strict: false }) ? recipient : "你自己的地址"})。返回存款 nonce。`,
    },
    { title: "Execute deposit (after your second yes)", titleZh: "执行 deposit（你第二次确认后）", cmd: BAW.execute },
  ];
}

// -------------------------------------------------------------- prompts --

const INSTALL_EN = `Install the agent-chain skill from ${AGENT_LINKS.skill} (or: ${AGENT_LINKS.npx}).`;
const INSTALL_ZH = `从 ${AGENT_LINKS.skill} 安装 agent-chain skill（或执行：${AGENT_LINKS.npx}）。`;

export function genesisPrompt(lang: "en" | "zh"): string {
  return lang === "zh"
    ? `${INSTALL_ZH} 用 \`baw wallet agent-id\` 检查我的 Agent ID，然后预览并——仅在我确认之后——执行领取我在 AGENT CHAIN 上的 Genesis Seat（BSC 合约 ${BSC_CONTRACTS.GenesisSeatClaim}）。`
    : `${INSTALL_EN} Check my Agent ID with \`baw wallet agent-id\`, then preview and — only after I confirm — execute claiming my Genesis Seat on AGENT CHAIN (BSC contract ${BSC_CONTRACTS.GenesisSeatClaim}).`;
}

export function bridgePrompt(lang: "en" | "zh", amount: string, recipient: string): string {
  const explicit = isAddress(recipient, { strict: false });
  const amt = amount.trim() || BRIDGE_DEFAULT_ANTB;
  if (lang === "zh") {
    const to = explicit ? recipient : MY_WALLET_ZH;
    return `${INSTALL_ZH} 用 \`baw wallet agent-id\` 检查我的 Agent ID，然后把 ${amt} ANTB 跨到 AGENT CHAIN：向 Bridge（BSC 合约 ${BSC_CONTRACTS.Bridge}）精确授权 ${amt} ANTB，再以 l2Recipient = ${to} 调用 deposit。两笔交易分别预览，并且每一笔都只在我确认后才执行。先展示 Beta 托管（withdrawTo）与 ANTB 风险提示。`;
  }
  const to = explicit ? recipient : MY_WALLET_EN;
  return `${INSTALL_EN} Check my Agent ID with \`baw wallet agent-id\`, then bridge ${amt} ANTB to AGENT CHAIN: approve exactly ${amt} ANTB to the Bridge (BSC contract ${BSC_CONTRACTS.Bridge}) and deposit it with l2Recipient = ${to}. Preview each of the two transactions and execute each only after I confirm it. Show me the Beta escrow (withdrawTo) and ANTB risk warnings first.`;
}
