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
/** Public RPC shown to users and used first by wallets (custom domain). */
export const PUBLIC_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.agent-chain.agency";
/** Fly fallback RPC (second entry in wallet rpcUrls, and server-side default). */
export const FLY_RPC_URL = DEFAULT_RPC_URL;
/** All wallet RPC URLs, de-duplicated, custom domain first. */
export const WALLET_RPC_URLS = Array.from(new Set([PUBLIC_RPC_URL, FLY_RPC_URL]));

export const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL ?? "https://agent-chain.agency";
export const WEBSITE_FLY_URL = "https://agentchain-web.fly.dev";
export const EXPLORER_URL = "https://explorer.agent-chain.agency";
export const EXPLORER_FLY_URL = "https://agentchain-explorer.fly.dev";

/** Server-side RPC URL. Server polling defaults to the Fly URL. */
export function serverRpcUrl(): string {
  return process.env.RPC_URL ?? DEFAULT_RPC_URL;
}

/** Illustrative ANT price used for USD conversions (SPEC §3). Not a market feed. */
export const ANT_USD_ILLUSTRATIVE = 97.17;

/** Expected block time on the devnet, in ms (SPEC §2). */
export const TARGET_BLOCK_MS = 250;

/** Short label for the network badge: "Devnet · 11190 · tANTB". */
export function networkBadgeLabel(): string {
  const short = CHAIN_NAME.replace(/^AGENT CHAIN\s*/i, "") || CHAIN_NAME;
  return `${short} · ${CHAIN_ID} · ${SYMBOL}`;
}
