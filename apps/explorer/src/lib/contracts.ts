import "server-only";
import fs from "node:fs";
import path from "node:path";
import { getAddress, isAddress, parseAbi, type Address } from "viem";
import { rpc, tryRpc } from "./client";

export type KnownContractName = "AgentRegistry" | "GenesisSeat" | "FeeKeeper";

export type KnownContract = {
  name: KnownContractName;
  address: Address;
  description: string;
};

const DESCRIPTIONS: Record<KnownContractName, string> = {
  AgentRegistry: "Owner-set mirror of BSC Agent ID state. address → handleHash, active.",
  GenesisSeat: "Non-transferable ERC-721-like. Sequential seatId, one mint per address.",
  FeeKeeper: "Stub keeper. Stores usdPerGas and antbUsdPrice, emits BaseFeeUpdated.",
};

export const AGENT_REGISTRY_ABI = parseAbi([
  "function agentCount() view returns (uint256)",
  "function isAgent(address account) view returns (bool)",
  "function owner() view returns (address)",
]);

export const GENESIS_SEAT_ABI = parseAbi([
  "function totalSeats() view returns (uint256)",
  "function seatOf(address owner) view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
]);

// FeeKeeper.sol exposes the ANTB/USD price as `antbUsd()` (1e8-scaled); SPEC calls it "antbUsdPrice".
export const FEE_KEEPER_ABI = parseAbi([
  "function minBaseFeeWei() view returns (uint256)",
  "function usdPerGas() view returns (uint256)",
  "function antbUsd() view returns (uint256)",
]);

/**
 * Resolve deployment addresses. Order: env (NEXT_PUBLIC_*), then
 * apps/devnet/deployments/devnet.json if present at build/run time.
 */
let cachedKnown: KnownContract[] | null = null;

export function knownContracts(): KnownContract[] {
  if (cachedKnown) return cachedKnown;
  // NEXT_PUBLIC_* are inlined at build time; the un-prefixed variants are read at runtime.
  const fromEnv: Partial<Record<KnownContractName, string | undefined>> = {
    AgentRegistry: process.env.NEXT_PUBLIC_AGENT_REGISTRY || process.env.AGENT_REGISTRY,
    GenesisSeat: process.env.NEXT_PUBLIC_GENESIS_SEAT || process.env.GENESIS_SEAT,
    FeeKeeper: process.env.NEXT_PUBLIC_FEE_KEEPER || process.env.FEE_KEEPER,
  };
  const fromFile = readDevnetJson();
  const out: KnownContract[] = [];
  for (const name of ["AgentRegistry", "GenesisSeat", "FeeKeeper"] as KnownContractName[]) {
    const raw = (fromEnv[name] && fromEnv[name]!.trim()) || fromFile[name];
    if (raw && isAddress(raw)) {
      out.push({ name, address: getAddress(raw), description: DESCRIPTIONS[name] });
    }
  }
  cachedKnown = out;
  return out;
}

function readDevnetJson(): Partial<Record<KnownContractName, string>> {
  const candidates = [
    path.resolve(process.cwd(), "../devnet/deployments/devnet.json"),
    path.resolve(process.cwd(), "apps/devnet/deployments/devnet.json"),
    path.resolve(process.cwd(), "deployments/devnet.json"),
  ];
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const json = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
      return extractAddresses(json);
    } catch {
      // ignore malformed file
    }
  }
  return {};
}

function extractAddresses(json: Record<string, unknown>): Partial<Record<KnownContractName, string>> {
  const result: Partial<Record<KnownContractName, string>> = {};
  const sources: Record<string, unknown>[] = [json];
  if (json.contracts && typeof json.contracts === "object") sources.push(json.contracts as Record<string, unknown>);
  if (json.addresses && typeof json.addresses === "object") sources.push(json.addresses as Record<string, unknown>);
  for (const src of sources) {
    for (const name of ["AgentRegistry", "GenesisSeat", "FeeKeeper"] as KnownContractName[]) {
      const lower = name.charAt(0).toLowerCase() + name.slice(1);
      const v = src[name] ?? src[lower];
      if (typeof v === "string" && isAddress(v)) result[name] = v;
      else if (v && typeof v === "object" && typeof (v as { address?: unknown }).address === "string") {
        const a = (v as { address: string }).address;
        if (isAddress(a)) result[name] = a;
      }
    }
  }
  return result;
}

export function knownContractAt(address: string): KnownContract | undefined {
  if (!isAddress(address)) return undefined;
  const a = address.toLowerCase();
  return knownContracts().find((c) => c.address.toLowerCase() === a);
}

export type ReadField = { label: string; value: string | null };

/** Read a small, per-contract panel of public values. Nulls are shown as "—". */
export async function readContractPanel(c: KnownContract): Promise<ReadField[]> {
  const client = rpc();
  const str = (v: bigint | boolean | string | null) => (v === null ? null : v.toString());
  switch (c.name) {
    case "GenesisSeat": {
      const total = await tryRpc(() => client.readContract({ address: c.address, abi: GENESIS_SEAT_ABI, functionName: "totalSeats" }));
      return [{ label: "totalSeats", value: str(total) }];
    }
    case "AgentRegistry": {
      const [count, owner] = await Promise.all([
        tryRpc(() => client.readContract({ address: c.address, abi: AGENT_REGISTRY_ABI, functionName: "agentCount" })),
        tryRpc(() => client.readContract({ address: c.address, abi: AGENT_REGISTRY_ABI, functionName: "owner" })),
      ]);
      return [
        { label: "agentCount", value: str(count) },
        { label: "owner", value: str(owner) },
      ];
    }
    case "FeeKeeper": {
      const [min, usdPerGas, price] = await Promise.all([
        tryRpc(() => client.readContract({ address: c.address, abi: FEE_KEEPER_ABI, functionName: "minBaseFeeWei" })),
        tryRpc(() => client.readContract({ address: c.address, abi: FEE_KEEPER_ABI, functionName: "usdPerGas" })),
        tryRpc(() => client.readContract({ address: c.address, abi: FEE_KEEPER_ABI, functionName: "antbUsd" })),
      ]);
      return [
        { label: "minBaseFeeWei", value: str(min) },
        { label: "usdPerGas", value: str(usdPerGas) },
        { label: "antbUsd", value: str(price) },
      ];
    }
  }
}

export type FeeKeeperQuote = {
  /** FeeKeeper.minBaseFeeWei() */
  minBaseFeeWei: bigint;
  /** FeeKeeper.antbUsd(), USD per ANTB scaled by 1e8 */
  antbUsd: bigint;
};

/** Current FeeKeeper prices, or null if the contract is unknown/unreachable. */
export async function readFeeKeeper(): Promise<FeeKeeperQuote | null> {
  const keeper = knownContracts().find((c) => c.name === "FeeKeeper");
  if (!keeper) return null;
  const client = rpc();
  const [min, price] = await Promise.all([
    tryRpc(() => client.readContract({ address: keeper.address, abi: FEE_KEEPER_ABI, functionName: "minBaseFeeWei" })),
    tryRpc(() => client.readContract({ address: keeper.address, abi: FEE_KEEPER_ABI, functionName: "antbUsd" })),
  ]);
  if (min === null || price === null || price === 0n) return null;
  return { minBaseFeeWei: min, antbUsd: price };
}

/** USD value of `wei` at the FeeKeeper's ANTB/USD price (1e8-scaled). */
export function weiToUsdAt(wei: bigint, antbUsd1e8: bigint): number {
  // wei / 1e18 * antbUsd / 1e8 — keep it in bigint until the last step to avoid precision loss.
  return Number((wei * antbUsd1e8) / 10n ** 8n) / 1e18;
}

/** GenesisSeat.totalSeats() or null if unknown/unreachable. */
export async function readTotalSeats(): Promise<bigint | null> {
  const seat = knownContracts().find((c) => c.name === "GenesisSeat");
  if (!seat) return null;
  return tryRpc(() => rpc().readContract({ address: seat.address, abi: GENESIS_SEAT_ABI, functionName: "totalSeats" }));
}
