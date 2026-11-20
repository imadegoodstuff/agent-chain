import { NextResponse } from "next/server";
import { zeroAddress, type Address } from "viem";
import { publicClient as bsc } from "@/lib/bsc";
import { AGENT_TOKEN } from "@/lib/spec";
import { agentErc20Abi, flapPortalAbi } from "@/lib/token";
import type { TokenStats } from "@/lib/bscTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 10_000;
const TOKEN = AGENT_TOKEN.address as Address;
const PORTAL = AGENT_TOKEN.portal as Address;

async function compute(): Promise<TokenStats> {
  const ts = Date.now();
  try {
    const [state, reads] = await Promise.all([
      bsc.readContract({ address: PORTAL, abi: flapPortalAbi, functionName: "getTokenV8Safe", args: [TOKEN] }),
      bsc.multicall({
        allowFailure: true,
        contracts: [
          { address: TOKEN, abi: agentErc20Abi, functionName: "totalSupply" },
          { address: TOKEN, abi: agentErc20Abi, functionName: "balanceOf", args: [AGENT_TOKEN.launcher as Address] },
          { address: TOKEN, abi: agentErc20Abi, functionName: "balanceOf", args: [AGENT_TOKEN.burnAddress as Address] },
          { address: TOKEN, abi: agentErc20Abi, functionName: "buyTaxRate" },
          { address: TOKEN, abi: agentErc20Abi, functionName: "sellTaxRate" },
          { address: TOKEN, abi: agentErc20Abi, functionName: "taxExpirationTime" },
        ],
      }),
    ]);
    const v = <T,>(i: number): T | null => (reads[i].status === "success" ? (reads[i].result as T) : null);
    const migrated = state.pool !== zeroAddress || state.status >= 2;
    const progressPct = Math.min(100, Number(state.progress / 10n ** 14n) / 100);
    return {
      ok: true,
      ts,
      status: migrated ? "migrated" : state.status === 1 ? "curve" : "unknown",
      portalStatus: state.status,
      pool: state.pool === zeroAddress ? null : state.pool,
      priceWei: state.price.toString(),
      progressE18: state.progress.toString(),
      progressPct,
      reserveWei: state.reserve.toString(),
      circulatingWei: state.circulatingSupply.toString(),
      dexSupplyThreshWei: state.dexSupplyThresh.toString(),
      totalSupplyWei: v<bigint>(0)?.toString() ?? null,
      launcherBalanceWei: v<bigint>(1)?.toString() ?? null,
      burnedWei: v<bigint>(2)?.toString() ?? null,
      buyTaxBps: v<number>(3),
      sellTaxBps: v<number>(4),
      taxExpiresAt: v<bigint>(5) !== null ? Number(v<bigint>(5)) : null,
    };
  } catch (e) {
    return {
      ok: false,
      ts,
      status: "unknown",
      portalStatus: null,
      pool: null,
      priceWei: null,
      progressE18: null,
      progressPct: null,
      reserveWei: null,
      circulatingWei: null,
      dexSupplyThreshWei: null,
      totalSupplyWei: null,
      launcherBalanceWei: null,
      burnedWei: null,
      buyTaxBps: null,
      sellTaxBps: null,
      taxExpiresAt: null,
      error: e instanceof Error ? e.message.split("\n")[0].slice(0, 120) : "unreachable",
    };
  }
}

let cache: { at: number; body: TokenStats } | null = null;
let inflight: Promise<TokenStats> | null = null;

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
