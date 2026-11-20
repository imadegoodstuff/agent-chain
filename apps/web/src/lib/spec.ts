/**
 * Facts from SPEC.md (single source of truth). Do not invent numbers here.
 */

/**
 * Canonical public URLs (custom domains). `RPC_URL` / `EXPLORER_URL` are the
 * MAINNET (chain 1119) endpoints since 2026-11-20; the devnet moved to the
 * `devnet-*` hosts. fly.dev hosts remain as fallbacks while DNS propagates.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://agent-chain.agency";
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.agent-chain.agency";
export const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://explorer.agent-chain.agency";
export const DEVNET_RPC_URL = process.env.NEXT_PUBLIC_DEVNET_RPC_URL ?? "https://devnet-rpc.agent-chain.agency";
export const DEVNET_EXPLORER_URL = process.env.NEXT_PUBLIC_DEVNET_EXPLORER_URL ?? "https://devnet-explorer.agent-chain.agency";
export const FALLBACK_URLS = {
  site: "https://agentchain-web.fly.dev",
  rpc: "https://agentchain-gateway.fly.dev",
  rpcAlt: "https://mainnet-rpc.agent-chain.agency",
  explorer: "https://agentchain-explorer.fly.dev",
  devnetRpc: "https://agentchain-rpc.fly.dev",
  devnetExplorer: "https://agentchain-explorer-devnet.fly.dev",
} as const;
/** Devnet RPC the server polls for /api/stats (fly.dev host, as agreed). */
export const STATS_RPC_URL = process.env.STATS_RPC_URL ?? FALLBACK_URLS.devnetRpc;
/** Mainnet L2 RPCs the server tries in order for /api/l2 (must answer chainId 1119). */
export const L2_RPCS = [RPC_URL, FALLBACK_URLS.rpcAlt, FALLBACK_URLS.rpc] as const;

export const MAINNET = {
  name: "AGENT CHAIN",
  chainId: 1119,
  chainIdHex: "0x45f",
  rpc: RPC_URL,
  rpcs: L2_RPCS,
  explorer: EXPLORER_URL,
  symbol: "ANTB",
  blockTimeMs: 250,
  parentChainId: 56,
  launched: "2026-11-20",
  stack: "Arbitrum Nitro v3.12.4 · ArbOS 61",
  minBaseFeeWei: 493_366_955,
  antbUsdAtLaunch: 91.21,
} as const;

export const DEVNET = {
  name: "AGENT CHAIN Devnet",
  chainId: 11190,
  chainIdHex: "0x2bb6",
  rpc: DEVNET_RPC_URL,
  explorer: DEVNET_EXPLORER_URL,
  symbol: "tANTB",
  blockTimeMs: 250,
} as const;

export const NETWORKS = [
  {
    key: "mainnet",
    name: "AGENT CHAIN (Mainnet Beta)",
    status: "Live · 2026-11-20",
    chainId: "1119 (0x45F)",
    rpc: "https://rpc.agent-chain.agency",
    explorer: "https://explorer.agent-chain.agency",
    gas: "ANTB (18 dec)",
    parent: "BSC (56) · Nitro rollup",
    blockTime: "250 ms",
  },
  {
    key: "devnet",
    name: "AGENT CHAIN Devnet (test data)",
    status: "Live · test only",
    chainId: "11190 (0x2BB6)",
    rpc: "https://devnet-rpc.agent-chain.agency",
    explorer: "https://devnet-explorer.agent-chain.agency",
    gas: "tANTB (test, no value)",
    parent: "— (single node)",
    blockTime: "250 ms",
  },
  {
    key: "testnet",
    name: "AGENT CHAIN Testnet",
    status: "Staging · Dec 2026",
    chainId: "111900",
    rpc: "TBA",
    explorer: "TBA",
    gas: "tANTB",
    parent: "BSC Testnet (97)",
    blockTime: "250 ms",
  },
] as const;

export const TOKENS = {
  ANTB: "0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53",
  AGENT_ID: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
  AGENT: "0x8E3318Ef4411b4488429Ff6970602968D7307777",
} as const;

/**
 * $AGENT — LAUNCHED on Flap (BSC mainnet) 2026-11-20. Facts from
 * apps/chain/deployments/mainnet/agent-token.json. Index / community token:
 * it does not pay for gas and promises no yield.
 */
export const AGENT_TOKEN = {
  address: "0x8E3318Ef4411b4488429Ff6970602968D7307777",
  name: "AGENT CHAIN",
  symbol: "AGENT",
  decimals: 18,
  totalSupply: 1_000_000_000,
  chainId: 56,
  standard: "ERC-20 · Flap tax token V3",
  launchedAt: "2026-11-20",
  launchTx: "0xb9f6a26240c58831c3625650df82d0d58cad61d38789c9267dfe6314fa143365",
  launchBlock: 134_659_029,
  launcher: "0x8D61bD807Da29C71eAbA6e85Fc42796E357fA443",
  portal: "0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0",
  taxProcessor: "0x81e26C1d06eF780E95827FbA8D0342E0fB379190",
  quoteToken: "0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53",
  quoteSymbol: "ANTB",
  buyTaxBps: 100,
  sellTaxBps: 100,
  taxDurationDays: 365,
  taxBeneficiary: "0xD800D290F7A87590b9A99295A21dA87D7443FcaB",
  taxBeneficiaryLabel: "creator treasury wallet",
  taxSplit: "100% of tax to the creator treasury wallet · 0% burn · 0% dividends · 0% LP",
  agentIdGate: false,
  migration: "PancakeSwap V2 at 80% of supply sold (800,000,000 AGENT)",
  migrationThresholdTokens: 800_000_000,
  creatorFirstBuy: { antb: "0.6", agent: "15,060,562.91", pctOfSupply: "≈1.5%", burned: true, burnTx: "0x0b5a7bc2bde943b5d615bcb6a139800465133b3912ef7aa14eb150b40382e68c" },
  burnAddress: "0x000000000000000000000000000000000000dEaD",
  flapUrl: "https://flap.sh/bnb/0x8E3318Ef4411b4488429Ff6970602968D7307777",
  dexscreenerUrl: "https://dexscreener.com/bsc/0x8E3318Ef4411b4488429Ff6970602968D7307777",
  bscscanUrl: "https://bscscan.com/token/0x8E3318Ef4411b4488429Ff6970602968D7307777",
  standingLine: "$AGENT does not pay for gas and promises no yield.",
  standingLineZh: "$AGENT 不用于支付 gas，也不承诺任何收益。",
} as const;

export const FEES = {
  usdPerMillionGas: 0.045,
  transferGas: 21_000,
  antIpoClose: 97.17,
  antIpoDate: "2026-11-19",
  minBaseFeeWei: 463_105_000,
  transferAntb: 0.0000097,
  examples: [
    { label: "Simple transfer", gas: "21,000", usd: "$0.001" },
    { label: "Agent call", gas: "~45,000", usd: "$0.002" },
    { label: "Contract deploy", gas: "~180,000", usd: "$0.008" },
  ],
  keeper: "Every 5 min · write on ≥0.5% move · ≤5% change per write · 1 write / 60 s",
} as const;

/** USD cost of a simple transfer at base rate: 0.045 / 1e6 * 21000 */
export const TRANSFER_USD = (FEES.usdPerMillionGas / 1_000_000) * FEES.transferGas; // 0.000945

export const REVENUE_SPLIT = [
  { label: "Genesis Seat holders", pct: 40, color: "#F0B35B" },
  { label: "Buy & burn $AGENT", pct: 40, color: "#C9842E" },
  { label: "Operations", pct: 20, color: "#3A3D4A" },
] as const;

export type RoadmapItem = string | { text: string; done: boolean };
export const roadmapItemText = (it: RoadmapItem) => (typeof it === "string" ? it : it.text);
export const roadmapItemDone = (it: RoadmapItem) => typeof it !== "string" && it.done;

export const ROADMAP: readonly {
  phase: string;
  title: string;
  when: string;
  live: boolean;
  done?: boolean;
  items: readonly RoadmapItem[];
}[] = [
  {
    phase: "Phase 0",
    title: "Devnet",
    when: "Done · Nov 2026",
    live: false,
    done: true,
    items: [
      { text: "Single-node devnet, 250 ms blocks", done: true },
      { text: "Public RPC + explorer (now devnet-*.agent-chain.agency)", done: true },
      { text: "AgentRegistry + GenesisSeat contracts", done: true },
      { text: "Website, whitepaper v0.1", done: true },
    ],
  },
  {
    phase: "Phase 1",
    title: "Mainnet Beta on BSC",
    when: "Live · 2026-11-20",
    live: true,
    items: [
      { text: "Nitro rollup (v3.12.4 / ArbOS 61) settling to BSC, chain 1119", done: true },
      { text: "ANTB as native gas · min base fee 493,366,955 wei", done: true },
      { text: "BSC contracts live: AgentRegistryMirror, GenesisSeatClaim, Bridge", done: true },
      { text: "Agent ID gateway RPC (non-agents rejected, -32050)", done: true },
      { text: "BoLD validation · single sequencer · batch poster", done: true },
      "Beta relayer credits Bridge deposits 1:1 on L2 (minutes, by nonce)",
      "Bridge caps 0.1 ANTB/address, 100 ANTB total (raised to 1/500 later in Beta)",
      "Skill published to Binance Skills Hub (PR #425 pending)",
      { text: "$AGENT launched on Flap (ANTB bonding curve, open to all wallets) · 0x8E33…7777", done: true },
      "Submission to Binance Agent ID Hackathon (deadline Dec 9, 2026)",
    ],
  },
  {
    phase: "Phase 2",
    title: "Beta hardening",
    when: "Dec 2026",
    live: false,
    items: [
      "Testnet on BSC Testnet (111900) as staging",
      "Paymaster (pay in BNB/USDT)",
      "Fee keeper live (5-min re-pricing)",
      "Chain owner → Safe multisig",
      "Nitro Inbox replaces Beta escrow bridge; self-service withdrawals",
      "$AGENT migration to PancakeSwap V2 at 80% sold (automatic, Flap)",
    ],
  },  {
    phase: "Phase 3",
    title: "Streaming preconfirmations",
    when: "Q1 2027",
    live: false,
    items: [
      "50 ms streamed sub-blocks via sequencer feed",
      "Multi-region edge RPC (SIN/TYO/FRA/IAD)",
      "ERC-8004 agent registry + x402 facilitator + MCP endpoint predeploys",
      "Stylus agent SDK",
    ],
  },
  {
    phase: "Phase 4",
    title: "Scale & settlement",
    when: "2027",
    live: false,
    items: [
      "Execution engine upgrade when throughput demands it",
      "ZK validity settlement when the Arbitrum stack ships it",
      "External validators",
      "Bridge caps lifted",
    ],
  },
] as const;

export const DISCLAIMERS = {
  affiliation:
    "AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules; bStocks are not available to US persons and are restricted in other jurisdictions.",
  advice:
    "Nothing here is investment advice. $AGENT confers no rights to revenue, equity, or returns; fee distributions are protocol parameters that governance can change.",
  devnet: "Devnet tokens have no value.",
} as const;

/** Chinese rendering of SPEC §5 disclaimers. The English text stays the legal reference. */
export const DISCLAIMERS_ZH = {
  affiliation:
    "AGENT CHAIN 为独立项目，与 Anthropic, PBC、Binance 或 BNB Chain 无任何关联，未获其背书或赞助。ANTB 由 BTech Holdings Ltd（bStocks）依据 ADGM 规则发行；bStocks 不面向美国人士，并在其他司法辖区受到限制。",
  advice: "本页内容不构成投资建议。$AGENT 不赋予任何收入、股权或回报权利；费用分配是治理可更改的协议参数。",
  devnet: "Devnet 代币没有任何价值。",
} as const;

export function disclaimers(lang: "en" | "zh") {
  return lang === "zh" ? DISCLAIMERS_ZH : DISCLAIMERS;
}

export const LINKS = {
  whitepaper: "/whitepaper",
  roadmap: "/roadmap",
  genesis: "/genesis",
  builders: "/builders",
  bridge: "/bridge",
  explorer: EXPLORER_URL,
  rpc: RPC_URL,
  flap: AGENT_TOKEN.flapUrl,
  dexscreener: `https://dexscreener.com/bsc/${TOKENS.ANTB}`,
  agentDexscreener: AGENT_TOKEN.dexscreenerUrl,
  agentBscscan: AGENT_TOKEN.bscscanUrl,
  token: "/#token",
} as const;

export const DEXSCREENER_URL = `https://api.dexscreener.com/latest/dex/tokens/${TOKENS.ANTB}`;
