import { NextResponse } from "next/server";
import { getAddress, isAddress, type AbiEvent, type Address, type Log } from "viem";
import { BSC_CONTRACTS, BSC_DEPLOY_BLOCKS, bridgeAbi, erc20Abi, erc721BalanceAbi, publicClient, registryAbi, seatClaimAbi } from "@/lib/bsc";
import type { AddressStatus, BscStats, DepositEvent, SeatClaimEvent } from "@/lib/bscTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-side reader for the BSC mainnet contracts. One process-wide cache
 * (TTL 12 s) + an incremental log index so browsers never hit public RPCs
 * directly. Logs are scanned backwards from head on first run (so the latest
 * events appear immediately) and forwards on every refresh.
 */
const TTL_MS = 12_000;
const KEEP = 50;
const MAX_CHUNKS_PER_TICK = 10;
const MIN_CHUNK = 500;

const depositedEvent = bridgeAbi.find((x) => x.type === "event" && x.name === "Deposited") as AbiEvent;
const seatClaimedEvent = seatClaimAbi.find((x) => x.type === "event" && x.name === "SeatClaimed") as AbiEvent;

type Indexed<T> = {
  address: Address;
  event: AbiEvent;
  deployBlock: bigint;
  items: Map<number, T>; // keyed by nonce / seatId
  scannedTo: bigint | null; // forward cursor (inclusive)
  backLo: bigint | null; // lowest block already scanned (backfill cursor)
  chunk: bigint;
  key: (l: Log & { args: Record<string, unknown> }) => number;
  map: (l: Log & { args: Record<string, unknown> }) => T;
};

const depositIdx: Indexed<DepositEvent> = {
  address: BSC_CONTRACTS.Bridge,
  event: depositedEvent,
  deployBlock: BigInt(BSC_DEPLOY_BLOCKS.Bridge),
  items: new Map(),
  scannedTo: null,
  backLo: null,
  chunk: 4_000n,
  key: (l) => Number(l.args.nonce as bigint),
  map: (l) => ({
    nonce: Number(l.args.nonce as bigint),
    from: String(l.args.from),
    l2Recipient: String(l.args.l2Recipient),
    amount: (l.args.amount as bigint).toString(),
    block: Number(l.blockNumber ?? 0n),
    tx: String(l.transactionHash ?? ""),
    ts: null,
  }),
};

const seatIdx: Indexed<SeatClaimEvent> = {
  address: BSC_CONTRACTS.GenesisSeatClaim,
  event: seatClaimedEvent,
  deployBlock: BigInt(BSC_DEPLOY_BLOCKS.GenesisSeatClaim),
  items: new Map(),
  scannedTo: null,
  backLo: null,
  chunk: 4_000n,
  key: (l) => Number(l.args.seatId as bigint),
  map: (l) => ({
    seatId: Number(l.args.seatId as bigint),
    holder: String(l.args.holder),
    block: Number(l.blockNumber ?? 0n),
    tx: String(l.transactionHash ?? ""),
    ts: null,
  }),
};

const blockTs = new Map<number, number>();

async function scanRange<T>(idx: Indexed<T>, from: bigint, to: bigint): Promise<boolean> {
  try {
    const logs = (await publicClient.getLogs({ address: idx.address, event: idx.event, fromBlock: from, toBlock: to })) as (Log & {
      args: Record<string, unknown>;
    })[];
    for (const l of logs) idx.items.set(idx.key(l), idx.map(l));
    return true;
  } catch {
    idx.chunk = idx.chunk / 2n < BigInt(MIN_CHUNK) ? BigInt(MIN_CHUNK) : idx.chunk / 2n;
    return false;
  }
}

/** Forward-scan new blocks, then continue backfilling older ones (bounded per tick). */
async function advance<T>(idx: Indexed<T>, head: bigint): Promise<boolean> {
  let budget = MAX_CHUNKS_PER_TICK;
  if (idx.scannedTo === null) {
    idx.scannedTo = head;
    idx.backLo = head + 1n;
  }
  // forward
  let cursor: bigint = idx.scannedTo;
  while (cursor < head && budget > 0) {
    const from: bigint = cursor + 1n;
    const to: bigint = from + idx.chunk - 1n > head ? head : from + idx.chunk - 1n;
    budget--;
    if (await scanRange(idx, from, to)) {
      cursor = to;
      idx.scannedTo = to;
    } else break;
  }
  // backward (until deploy block, or until we hold ≥ KEEP events)
  while (idx.backLo !== null && idx.backLo > idx.deployBlock && idx.items.size < KEEP && budget > 0) {
    const to = idx.backLo - 1n;
    const from = to - idx.chunk + 1n < idx.deployBlock ? idx.deployBlock : to - idx.chunk + 1n;
    budget--;
    if (await scanRange(idx, from, to)) idx.backLo = from;
    else break;
  }
  return idx.backLo !== null && (idx.backLo <= idx.deployBlock || idx.items.size >= KEEP);
}

function latest<T extends { block: number; ts: number | null }>(idx: Indexed<T>, by: (t: T) => number): T[] {
  return [...idx.items.values()].sort((a, b) => by(b) - by(a)).slice(0, KEEP);
}

async function fillTimestamps(rows: { block: number; ts: number | null }[]) {
  const missing = [...new Set(rows.filter((r) => !blockTs.has(r.block)).map((r) => r.block))].slice(0, 25);
  await Promise.all(
    missing.map(async (b) => {
      try {
        const blk = await publicClient.getBlock({ blockNumber: BigInt(b) });
        blockTs.set(b, Number(blk.timestamp));
      } catch {
        /* leave null */
      }
    }),
  );
  for (const r of rows) r.ts = blockTs.get(r.block) ?? null;
}

async function compute(): Promise<BscStats> {
  const ts = Date.now();
  try {
    const head = await publicClient.getBlockNumber();
    const B = BSC_CONTRACTS.Bridge;
    const S = BSC_CONTRACTS.GenesisSeatClaim;
    const R = BSC_CONTRACTS.AgentRegistryMirror;
    const [reads, depositsComplete, seatsComplete] = await Promise.all([
      publicClient.multicall({
        allowFailure: true,
        contracts: [
          { address: B, abi: bridgeAbi, functionName: "perAddressCap" },
          { address: B, abi: bridgeAbi, functionName: "globalCap" },
          { address: B, abi: bridgeAbi, functionName: "totalDeposited" },
          { address: B, abi: bridgeAbi, functionName: "remainingGlobal" },
          { address: B, abi: bridgeAbi, functionName: "pendingDeposits" },
          { address: B, abi: bridgeAbi, functionName: "depositCount" },
          { address: B, abi: bridgeAbi, functionName: "paused" },
          { address: S, abi: seatClaimAbi, functionName: "totalSeats" },
          { address: S, abi: seatClaimAbi, functionName: "claimOpen" },
          { address: R, abi: registryAbi, functionName: "count" },
        ],
      }),
      advance(depositIdx, head),
      advance(seatIdx, head),
    ]);
    const v = <T,>(i: number): T | undefined => (reads[i].status === "success" ? (reads[i].result as T) : undefined);
    const bridgeOk = reads.slice(0, 7).every((r) => r.status === "success");
    const seatsOk = reads[7].status === "success" && reads[8].status === "success";

    const deposits = latest(depositIdx, (d) => d.nonce);
    const seatClaims = latest(seatIdx, (s) => s.seatId);
    await fillTimestamps([...deposits, ...seatClaims]);

    return {
      ok: true,
      ts,
      block: Number(head),
      bridge: bridgeOk
        ? {
            perAddressCap: v<bigint>(0)!.toString(),
            globalCap: v<bigint>(1)!.toString(),
            totalDeposited: v<bigint>(2)!.toString(),
            remainingGlobal: v<bigint>(3)!.toString(),
            pendingDeposits: v<bigint>(4)!.toString(),
            depositCount: Number(v<bigint>(5)!),
            paused: v<boolean>(6)!,
          }
        : null,
      seats: seatsOk ? { totalSeats: Number(v<bigint>(7)!), claimOpen: v<boolean>(8)! } : null,
      registry: reads[9].status === "success" ? { count: Number(v<bigint>(9)!) } : null,
      deposits,
      seatClaims,
      sync: { depositsComplete, seatsComplete, scannedTo: depositIdx.scannedTo === null ? null : Number(depositIdx.scannedTo) },
    };
  } catch (e) {
    return {
      ok: false,
      ts,
      block: null,
      bridge: null,
      seats: null,
      registry: null,
      deposits: latest(depositIdx, (d) => d.nonce),
      seatClaims: latest(seatIdx, (s) => s.seatId),
      sync: { depositsComplete: false, seatsComplete: false, scannedTo: null },
      error: e instanceof Error ? e.message.split("\n")[0].slice(0, 120) : "unreachable",
    };
  }
}

let cache: { at: number; body: BscStats } | null = null;
let inflight: Promise<BscStats> | null = null;

/** Per-address read-only status (the user's OWN 0x address; never resolved from a name). */
const addrCache = new Map<string, { at: number; body: AddressStatus }>();
const ADDR_TTL_MS = 10_000;

async function addressStatus(address: Address): Promise<AddressStatus> {
  const r = await publicClient.multicall({
    allowFailure: true,
    contracts: [
      { address: BSC_CONTRACTS.AgentId, abi: erc721BalanceAbi, functionName: "balanceOf", args: [address] },
      { address: BSC_CONTRACTS.BAB, abi: erc721BalanceAbi, functionName: "balanceOf", args: [address] },
      { address: BSC_CONTRACTS.AgentRegistryMirror, abi: registryAbi, functionName: "isRegistered", args: [address] },
      { address: BSC_CONTRACTS.AgentRegistryMirror, abi: registryAbi, functionName: "indexOf", args: [address] },
      { address: BSC_CONTRACTS.GenesisSeatClaim, abi: seatClaimAbi, functionName: "seatOf", args: [address] },
      { address: BSC_CONTRACTS.Bridge, abi: bridgeAbi, functionName: "depositedBy", args: [address] },
      { address: BSC_CONTRACTS.Bridge, abi: bridgeAbi, functionName: "remainingFor", args: [address] },
      { address: BSC_CONTRACTS.ANTB, abi: erc20Abi, functionName: "balanceOf", args: [address] },
      { address: BSC_CONTRACTS.GenesisSeatClaim, abi: seatClaimAbi, functionName: "totalSeats" },
    ],
  });
  const big = (i: number) => (r[i].status === "success" ? (r[i].result as bigint) : null);
  const agentId = big(0);
  const bab = big(1);
  const registered = r[2].status === "success" ? (r[2].result as boolean) : null;
  return {
    ok: r.every((x) => x.status === "success"),
    address,
    ts: Date.now(),
    agentIdBalance: agentId?.toString() ?? null,
    babBalance: bab?.toString() ?? null,
    isAgent: agentId === null && bab === null ? null : (agentId ?? 0n) > 0n || (bab ?? 0n) > 0n,
    registered,
    registryIndex: big(3) !== null ? Number(big(3)) : null,
    seatId: big(4) !== null ? Number(big(4)) : null,
    totalSeats: big(8) !== null ? Number(big(8)) : null,
    depositedBy: big(5)?.toString() ?? null,
    remainingFor: big(6)?.toString() ?? null,
    antbBalance: big(7)?.toString() ?? null,
  };
}

export async function GET(req: Request) {
  const now = Date.now();
  const q = new URL(req.url).searchParams.get("address");
  if (q !== null) {
    const a = q.trim();
    if (!isAddress(a, { strict: false })) {
      return NextResponse.json(
        { ok: false, error: "address_only", message: "Enter a 0x address (40 hex chars). Lookups by name, handle or .ai domain are not supported." },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }
    const key = a.toLowerCase();
    const hit = addrCache.get(key);
    if (hit && now - hit.at < ADDR_TTL_MS) return NextResponse.json(hit.body, { headers: { "cache-control": "no-store" } });
    try {
      const body = await addressStatus(getAddress(a));
      addrCache.set(key, { at: now, body });
      if (addrCache.size > 500) addrCache.delete(addrCache.keys().next().value as string);
      return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: "rpc", message: e instanceof Error ? e.message.split("\n")[0].slice(0, 120) : "unreachable" },
        { status: 502, headers: { "cache-control": "no-store" } },
      );
    }
  }
  if (cache && now - cache.at < TTL_MS) {
    return NextResponse.json(cache.body, { headers: { "cache-control": "public, max-age=10, s-maxage=10" } });
  }
  if (!inflight) {
    inflight = compute()
      .then((body) => {
        if (body.ok || !cache) cache = { at: Date.now(), body };
        return body;
      })
      .finally(() => {
        inflight = null;
      });
  }
  const body = await inflight;
  return NextResponse.json(body, { headers: { "cache-control": "public, max-age=10, s-maxage=10" } });
}
