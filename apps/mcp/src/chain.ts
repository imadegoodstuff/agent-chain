import {
  createPublicClient,
  defineChain,
  formatEther,
  http,
  isAddress,
  parseAbi,
  type Address,
  type Hash,
  type PublicClient,
} from "viem";
import { bsc } from "viem/chains";
import { CONFIG } from "./config.js";

// ---------------------------------------------------------------------------
// ABIs (human-readable, kept in sync with skills/agent-chain/references/contracts.md)
// ---------------------------------------------------------------------------

export const AGENT_REGISTRY_ABI = parseAbi([
  "function isAgent(address account) view returns (bool)",
  "function agentOf(address account) view returns (bytes32 handleHash, bool active)",
  "function agentCount() view returns (uint256)",
  "function owner() view returns (address)",
]);

export const GENESIS_SEAT_ABI = parseAbi([
  "function totalSeats() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function seatOf(address holder) view returns (uint256)",
  "function balanceOf(address holder) view returns (uint256)",
  "function ownerOf(uint256 seatId) view returns (address)",
]);

export const FEE_KEEPER_ABI = parseAbi([
  "function usdPerGas() view returns (uint256)",
  "function antbUsd() view returns (uint256)",
  "function minBaseFeeWei() view returns (uint256)",
  "function lastUpdated() view returns (uint256)",
]);

export const ERC721_BALANCE_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
]);

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export const agentChain = defineChain({
  id: CONFIG.chainId,
  name: "AGENT CHAIN",
  nativeCurrency: { name: CONFIG.gasSymbol, symbol: CONFIG.gasSymbol, decimals: 18 },
  rpcUrls: { default: { http: [CONFIG.rpcUrl] } },
  blockExplorers: { default: { name: "AGENT CHAIN Explorer", url: CONFIG.explorerUrl } },
});

export const l2: PublicClient = createPublicClient({
  chain: agentChain,
  transport: http(CONFIG.rpcUrl, { timeout: 15_000, retryCount: 2 }),
});

export const bscClient: PublicClient = createPublicClient({
  chain: bsc,
  transport: http(CONFIG.bsc.rpcUrl, { timeout: 15_000, retryCount: 1 }),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function assertAddress(value: string): Address {
  if (!isAddress(value)) throw new Error(`Invalid EVM address: ${value}`);
  return value as Address;
}

export function assertHash(value: string): Hash {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error(`Invalid 32-byte hash: ${value}`);
  return value as Hash;
}

/** JSON.stringify that survives bigint. */
export function toJson(value: unknown): string {
  return JSON.stringify(
    value,
    (_k, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  );
}

export function weiToAntb(wei: bigint): string {
  return formatEther(wei);
}

/** Fetch the explorer `/api/head` snapshot; throws on non-2xx. */
export async function fetchExplorerHead(): Promise<unknown> {
  const res = await fetch(`${CONFIG.explorerUrl}/api/head`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`explorer /api/head returned HTTP ${res.status}`);
  return res.json();
}
