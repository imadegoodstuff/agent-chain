import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbi, type Log } from "viem";
import { STATS_RPC_URL as RPC_URL } from "@/lib/spec";
import { genesisSeatAddress } from "@/lib/deployments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const seatAbi = parseAbi([
  "function totalSeats() view returns (uint256)",
  "event SeatMinted(address indexed to, uint256 indexed seatId)",
]);

import type { SeatEvent, Stats } from "@/lib/types";

const client = createPublicClient({
  transport: http(RPC_URL, { timeout: 4_000, retryCount: 0 }),
});

// Wall-clock samples of (block, time) for the blocks/s estimate.
const samples: { block: number; at: number }[] = [];
function sampleRate(block: number, at: number): number | null {
  const last = samples[samples.length - 1];
  if (!last || last.block !== block || at - last.at > 1000) samples.push({ block, at });
  while (samples.length > 40 || (samples.length && at - samples[0].at > 60_000)) samples.shift();
  // chain restarted → drop history
  if (samples.length && samples[0].block > block) samples.splice(0, samples.length, { block, at });
  const first = samples[0];
  if (!first || first === last || at - first.at < 2000) return null;
  const dt = (at - first.at) / 1000;
  return (block - first.block) / dt;
}

// Short-lived in-process cache so many tabs don't hammer the devnet.
let cache: { at: number; body: Stats } | null = null;
const TTL_MS = 1_500;

async function compute(withEvents: boolean): Promise<Stats> {
  const ts = Date.now();
  try {
    const [chainId, latest] = await Promise.all([client.getChainId(), client.getBlock({ blockTag: "latest" })]);
    const latestN = Number(latest.number);

    // Blocks per second measured in wall-clock time across successive polls
    // (devnet block timestamps advance 1 s per block regardless of real interval,
    // so chain timestamps cannot be used).
    const blocksPerSec = sampleRate(latestN, ts);

    let seats: number | null = null;
    let recentSeats: SeatEvent[] = [];
    const seatAddress = genesisSeatAddress();
    if (seatAddress) {
      try {
        const total = await client.readContract({ address: seatAddress, abi: seatAbi, functionName: "totalSeats" });
        seats = Number(total);
        if (withEvents && seats > 0) {
          const fromBlock = BigInt(Math.max(0, latestN - 2000));
          const logs = (await client.getLogs({
            address: seatAddress,
            event: seatAbi[1],
            fromBlock,
            toBlock: "latest",
          })) as (Log & { args: { to?: string; seatId?: bigint } })[];
          recentSeats = logs
            .map((l) => ({
              seatId: Number(l.args.seatId ?? 0n),
              to: String(l.args.to ?? ""),
              block: Number(l.blockNumber ?? 0n),
              tx: String(l.transactionHash ?? ""),
            }))
            .sort((a, b) => b.seatId - a.seatId)
            .slice(0, 24);
        }
      } catch {
        seats = null; // contract not deployed at that address → hide in UI
      }
    }

    let gasPriceWei: string | null = null;
    try {
      gasPriceWei = (await client.getGasPrice()).toString();
    } catch {
      /* optional */
    }

    return {
      ok: true,
      chainId,
      block: latestN,
      blocksPerSec,
      blockTimeMs: blocksPerSec ? Math.round(1000 / blocksPerSec) : null,
      seats,
      seatAddress,
      recentSeats,
      gasPriceWei,
      ts,
    };
  } catch (e) {
    return {
      ok: false,
      chainId: null,
      block: null,
      blocksPerSec: null,
      blockTimeMs: null,
      seats: null,
      seatAddress: null,
      recentSeats: [],
      gasPriceWei: null,
      ts,
      error: e instanceof Error ? e.message.slice(0, 120) : "unreachable",
    };
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const withEvents = url.searchParams.get("events") === "1";
  const now = Date.now();
  if (!withEvents && cache && now - cache.at < TTL_MS) {
    return NextResponse.json(cache.body, { headers: { "cache-control": "no-store" } });
  }
  const body = await compute(withEvents);
  if (!withEvents) cache = { at: now, body };
  return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
}
