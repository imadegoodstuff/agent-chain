/**
 * Network / branding configuration. Public values are inlined at build time
 * (NEXT_PUBLIC_*), server values are read at runtime. Defaults are the devnet
 * facts from SPEC.md §2.
 */

export const DEFAULT_RPC_URL = "https://agentchain-rpc.fly.dev";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "11190");
export const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME ?? "AGENT CHAIN Devnet";
export const SYMBOL = process.env.NEXT_PUBLIC_SYMBOL ?? "tANTB";
export const DECIMALS = 18;
export const EXPLORER_NAME = process.env.NEXT_PUBLIC_EXPLORER_NAME ?? "AGENT CHAIN Explorer";
/** <title> of the 404 page (absolute, not run through the layout template). */
export const NOT_FOUND_TITLE = `Not found — ${EXPLORER_NAME}`;

/**
 * Network phase. Devnet (11190) is the Hardhat single node; anything else is a Nitro rollup
 * settling to BSC (mainnet 1119 / testnet). Override with NEXT_PUBLIC_NETWORK=devnet|mainnet|testnet.
 */
export type NetworkKind = "devnet" | "testnet" | "mainnet";
export const NETWORK: NetworkKind = ((): NetworkKind => {
  const v = (process.env.NEXT_PUBLIC_NETWORK ?? "").trim().toLowerCase();
  if (v === "devnet" || v === "testnet" || v === "mainnet") return v;
  if (CHAIN_ID === 11190) return "devnet";
  if (CHAIN_ID === 1119) return "mainnet";
  return "testnet";
})();
export const IS_DEVNET = NETWORK === "devnet";

/** Public RPC shown to users and used first by wallets (custom domain). */
export const PUBLIC_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.agent-chain.agency";
/**
 * Fallback RPC (second entry in wallet rpcUrls). Devnet defaults to the Fly URL of the devnet node;
 * other networks must set NEXT_PUBLIC_RPC_FALLBACK_URL (e.g. the gateway's fly.dev host) or get none.
 */
export const FLY_RPC_URL = process.env.NEXT_PUBLIC_RPC_FALLBACK_URL ?? (IS_DEVNET ? DEFAULT_RPC_URL : PUBLIC_RPC_URL);
/** All wallet RPC URLs, de-duplicated, custom domain first. */
export const WALLET_RPC_URLS = Array.from(new Set([PUBLIC_RPC_URL, FLY_RPC_URL]));

export const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL ?? "https://agent-chain.agency";
export const WEBSITE_FLY_URL = "https://agentchain-web.fly.dev";
export const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://explorer.agent-chain.agency";
export const EXPLORER_FLY_URL = "https://agentchain-explorer.fly.dev";

/** Parent chain (settlement layer) facts, shown in the footer on non-devnet networks. */
export const PARENT_CHAIN_NAME = process.env.NEXT_PUBLIC_PARENT_CHAIN_NAME ?? (NETWORK === "testnet" ? "BSC Testnet" : "BSC");
export const PARENT_EXPLORER_URL =
  process.env.NEXT_PUBLIC_PARENT_EXPLORER_URL ?? (NETWORK === "testnet" ? "https://testnet.bscscan.com" : "https://bscscan.com");
/** Nitro Rollup contract on the parent chain (mainnet: apps/chain/deployments/mainnet/rollup.json). */
export const ROLLUP_ADDRESS =
  process.env.NEXT_PUBLIC_ROLLUP_ADDRESS ?? (NETWORK === "mainnet" ? "0x0EE1Db14CC85d5151C6E54711ED7423b90F9EF85" : "");

/** Server-side RPC URL. Devnet polling defaults to the Fly URL; other networks fall back to the public RPC. */
export function serverRpcUrl(): string {
  return process.env.RPC_URL ?? (IS_DEVNET ? DEFAULT_RPC_URL : PUBLIC_RPC_URL);
}

/** Illustrative ANT price used for USD conversions (SPEC §3). Not a market feed. */
export const ANT_USD_ILLUSTRATIVE = 97.17;

/** Expected block time in ms (SPEC §2: 250 ms on every network). Override with NEXT_PUBLIC_BLOCK_MS. */
export const TARGET_BLOCK_MS = Number(process.env.NEXT_PUBLIC_BLOCK_MS ?? "250") || 250;

/** Footer tagline: "Phase 0 — Devnet" / "Mainnet Beta · chain 1119 · settles to BSC". */
export const PHASE_LABEL =
  process.env.NEXT_PUBLIC_PHASE_LABEL ??
  (IS_DEVNET ? "Phase 0 — Devnet" : NETWORK === "testnet" ? `Testnet · chain ${CHAIN_ID} · settles to ${PARENT_CHAIN_NAME}` : `Mainnet Beta · chain ${CHAIN_ID} · settles to ${PARENT_CHAIN_NAME}`);

/** Short label for the network badge: "Devnet · 11190 · tANTB". */
export function networkBadgeLabel(): string {
  const short = CHAIN_NAME.replace(/^AGENT CHAIN\s*/i, "") || CHAIN_NAME;
  return `${short} · ${CHAIN_ID} · ${SYMBOL}`;
}
