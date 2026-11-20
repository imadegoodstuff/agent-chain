import { NextResponse } from "next/server";
import { getHead } from "@/lib/chain-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Batched, server-cached (1 s) head snapshot for the live home page. */
export async function GET() {
  const head = await getHead();
  return NextResponse.json(head, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=1, stale-while-revalidate=2",
    },
  });
}
