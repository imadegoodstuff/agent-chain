import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { L2_RPCS, MAINNET } from "@/lib/spec";
import { publicClient as bsc } from "@/lib/bsc";
import { NITRO, nitroBridgeAbi, pricerAbi, rollupAbi, sequencerInboxAbi } from "@/lib/l2";
import type { L2Stats } from "@/lib/bscTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 10_000;
const RPC_RECHECK_MS = 60_000;

/**
 * Picks the first configured L2 RPC that answers chainId 1119 (DNS for
 * rpc.agent-chain.agency may still point at the devnet), caches the choice.
 */
let chosen: { url: string; at: number } | null = null;
async function pickRpc(): Promise<string | null> {
  if (chosen && Date.now() - chosen.at < RPC_RECHECK_MS) return chosen.url;
  for (const url of L2_RPCS) {
    try {
      const c = createPublicClient({ transport: http(url, { timeout: 4_000, retryCount: 0 }) });
      const id = await c.getChainId();
      if (id === MAINNET.chainId) {
        chosen = { url, at: Date.now() };
        return url;
      }
    } catch {
      /* try next */
    }
  }
  chosen = null;
  return null;
}

async function relayerStatus(): Promise<L2Stats["relayer"]> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3_000);
    const r = await fetch("https://agentchain-relayer.fly.dev/status", { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    if (!r.ok) return { ok: false, status: r.status };
    const j = (await r.json().catch(() => null)) as Record<string, unknown> | null;
    return { ok: true, status: r.status, data: j };
  } catch {
    return { ok: false, status: null };
  }
}

// Wall-clock samples for the blocks/s estimate (L2 timestamps are second-granular).
const samples: { block: number; at: number }[] = [];
function rate(block: number, at: number): number | null {
  const last = samples[samples.length - 1];
  if (!last || last.block !== block) samples.push({ block, at });
  while (samples.length > 40 || (samples.length && at - samples[0].at > 120_000)) samples.shift();
  const first = samples[0];
  if (!first || first === last || at - first.at < 5_000) return null;
  return (block - first.block) / ((at - first.at) / 1000);
}

async function compute(): Promise<L2Stats> {
  const ts = Date.now();
  const rpc = await pickRpc();
  let l2: L2Stats["l2"] = null;
  let l2Error: string | undefined;
  if (rpc) {
    try {
      const c = createPublicClient({ transport: http(rpc, { timeout: 5_000, retryCount: 1 }) });
      const [blk, gasPrice] = await Promise.all([c.getBlock({ blockTag: "latest" }), c.getGasPrice()]);
      const n = Number(blk.number);
      l2 = {
        rpc,
        chainId: MAINNET.chainId,
        block: n,
        blockTimestamp: Number(blk.timestamp),
        gasPriceWei: gasPrice.toString(),
        baseFeeWei: blk.baseFeePerGas?.toString() ?? null,
        txCountLatest: blk.transactions.length,
        blocksPerSec: rate(n, ts),
      };
    } catch (e) {
      l2Error = e instanceof Error ? e.message.split("\n")[0].slice(0, 120) : "unreachable";
    }
  } else l2Error = "no L2 RPC answered chainId 1119";

  let parent: L2Stats["parent"] = null;
  try {
    const r = await bsc.multicall({
      allowFailure: true,
      contracts: [
        { address: NITRO.SequencerInbox, abi: sequencerInboxAbi, functionName: "batchCount" },
        { address: NITRO.Bridge, abi: nitroBridgeAbi, functionName: "sequencerMessageCount" },
        { address: NITRO.Bridge, abi: nitroBridgeAbi, functionName: "delayedMessageCount" },
        { address: NITRO.FeeTokenPricer, abi: pricerAbi, functionName: "getExchangeRate" },
        { address: NITRO.Rollup, abi: rollupAbi, functionName: "baseStake" },
        { address: NITRO.Rollup, abi: rollupAbi, functionName: "latestConfirmed" },
      ],
    });
    const v = (i: number) => (r[i].status === "success" ? (r[i].result as bigint) : null);
    parent = {
      batchCount: v(0) !== null ? Number(v(0)) : null,
      sequencerMessageCount: v(1) !== null ? Number(v(1)) : null,
      delayedMessageCount: v(2) !== null ? Number(v(2)) : null,
      antbPerBnbWei: v(3)?.toString() ?? null,
      baseStakeWei: v(4)?.toString() ?? null,
      latestConfirmed: r[5].status === "success" ? String(r[5].result) : null,
    };
  } catch {
    parent = null;
  }

  const relayer = await relayerStatus();
  return { ok: l2 !== null, ts, l2, parent, relayer, error: l2Error };
}

let cache: { at: number; body: L2Stats } | null = null;
let inflight: Promise<L2Stats> | null = null;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return NextResponse.json(cache.body, { headers: { "cache-control": "public, max-age=10" } });
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
  return NextResponse.json(await inflight, { headers: { "cache-control": "public, max-age=10" } });
}
