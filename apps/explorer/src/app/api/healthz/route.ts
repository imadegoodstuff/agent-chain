import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness probe for Fly health checks. Deliberately does NOT touch the RPC:
 * a slow upstream must never take the explorer itself offline.
 */
export function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() }, { headers: { "cache-control": "no-store" } });
}
