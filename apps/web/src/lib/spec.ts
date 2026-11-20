/**
 * Facts from SPEC.md (single source of truth). Do not invent numbers here.
 */

/** Canonical public URLs (custom domains). fly.dev hosts remain as fallbacks. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://agent-chain.agency";
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.agent-chain.agency";
export const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://explorer.agent-chain.agency";
export const FALLBACK_URLS = {
  site: "https://agentchain-web.fly.dev",
  rpc: "https://agentchain-rpc.fly.dev",
  explorer: "https://agentchain-explorer.fly.dev",
} as const;
/** RPC the server polls for /api/stats (fly.dev host, as agreed). */
export const STATS_RPC_URL = process.env.STATS_RPC_URL ?? FALLBACK_URLS.rpc;

export const DEVNET = {
  name: "AGENT CHAIN Devnet",
  chainId: 11190,
  chainIdHex: "0x2bb6",
  rpc: RPC_URL,
  explorer: EXPLORER_URL,
  symbol: "tANTB",
  blockTimeMs: 250,
} as const;

export const NETWORKS = [
  {
    key: "devnet",
    name: "AGENT CHAIN Devnet",
    status: "Live now",
    chainId: "11190 (0x2BB6)",
    rpc: "https://rpc.agent-chain.agency",
    explorer: "https://explorer.agent-chain.agency",
    gas: "tANTB (test, no value)",
    parent: "— (devnet, single node)",
    blockTime: "250 ms",
  },
  {
    key: "testnet",
    name: "AGENT CHAIN Testnet",
    status: "Phase 1",
    chainId: "111900",
    rpc: "TBA",
    explorer: "TBA",
    gas: "tANTB",
    parent: "BSC Testnet (97)",
    blockTime: "250 ms",
  },
  {
    key: "mainnet",
    name: "AGENT CHAIN",
    status: "Phase 2",
    chainId: "1119 (reserved)",
    rpc: "TBA",
    explorer: "TBA",
    gas: "ANTB",
    parent: "BSC (56)",
    blockTime: "250 ms",
  },
] as const;

export const TOKENS = {
  ANTB: "0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53",
  AGENT_ID: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
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
  items: readonly RoadmapItem[];
}[] = [
  {
    phase: "Phase 0",
    title: "Devnet",
    when: "Live · Nov 2026",
    live: true,
    items: [
      "Single-node devnet, 250 ms blocks",
      "Public RPC + explorer",
      "AgentRegistry + GenesisSeat contracts",
      "Website, whitepaper v0.1",
    ],
  },
  {
    phase: "Phase 1",
    title: "Testnet on BSC Testnet",
    when: "Dec 2026",
    live: false,
    items: [
      "Nitro rollup settling to BSC Testnet",
      "tANTB as custom gas token",
      "Bridge + faucet",
      "Agent ID-gated sequencing",
      "Paymaster (pay in BNB/USDT)",
      "Fee keeper live",
      "Skill published to Binance Skills Hub",
    ],
  },
  {
    phase: "Phase 2",
    title: "Mainnet Beta",
    when: "Dec 2026",
    live: false,
    items: [
      { text: "BSC mainnet contracts live (registry, seats, bridge)", done: true },
      "Agent ID snapshot → genesis → launch on BSC",
      "ANTB native gas",
      "Bridge caps (1 ANTB/address, 500 ANTB total) during Beta",
      "$AGENT launch on Flap (ANTB pool, open to all wallets)",
      "Submission to Binance Agent ID Hackathon (deadline Dec 9, 2026)",
    ],
  },
  {
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
  flap: "https://flap.sh",
  dexscreener: `https://dexscreener.com/bsc/${TOKENS.ANTB}`,
} as const;

export const DEXSCREENER_URL = `https://api.dexscreener.com/latest/dex/tokens/${TOKENS.ANTB}`;
