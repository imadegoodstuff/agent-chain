import { NextResponse } from "next/server";
import { getAddress } from "viem";
import { scanAddressTxs } from "@/lib/chain-data";
import { isAddress, isBlockNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/address/0x…/txs?before=<block>
 * Scans up to 500 blocks ending at `before` (default: head) for txs touching the address.
 * Used by the address page's "Load older" button.
 */
export async function GET(req: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  if (!isAddress(address)) return NextResponse.json({ error: "invalid address" }, { status: 400 });
  const before = new URL(req.url).searchParams.get("before");
  if (before !== null && !isBlockNumber(before)) return NextResponse.json({ error: "invalid before" }, { status: 400 });
  try {
    const scan = await scanAddressTxs(getAddress(address), before === null ? undefined : BigInt(before));
    return NextResponse.json(scan, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg.split("\n")[0].slice(0, 200) }, { status: 502 });
  }
}
