import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { getAddress } from "viem";
import { SearchBox } from "@/components/SearchBox";
import { isAddress, isBlockNumber, isHexHash } from "@/lib/format";
import { rpc, tryRpc } from "@/lib/client";
import type { Hex } from "viem";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  if (query) {
    if (isBlockNumber(query)) redirect(`/block/${BigInt(query).toString()}`);
    if (isAddress(query)) redirect(`/address/${getAddress(query)}`);
    if (isHexHash(query)) {
      // A 32-byte hash may be a tx or a block hash. Prefer tx; fall back to block lookup.
      const client = rpc();
      const tx = await tryRpc(() => client.getTransaction({ hash: query as Hex }));
      if (tx) redirect(`/tx/${query}`);
      const block = await tryRpc(() => client.getBlock({ blockHash: query as Hex }));
      if (block?.number != null) redirect(`/block/${block.number.toString()}`);
      // Unknown hash: default to the tx page (which shows a not-found state).
      redirect(`/tx/${query}`);
    }
    if (/^0x[0-9a-fA-F]+$/.test(query) && query.length > 10 && query.length < 66) {
      // Possibly an un-padded block number in hex
      const n = BigInt(query);
      redirect(`/block/${n.toString()}`);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-6">
      <div className="text-center">
        <div className="label text-amber mb-2">Search</div>
        <h1 className="text-xl font-semibold">Block number, transaction hash or address</h1>
      </div>
      <SearchBox autoFocus />
      {query && (
        <div className="card p-6 text-center">
          <SearchX className="h-5 w-5 text-danger mx-auto mb-2" />
          <div className="text-sm">No result for</div>
          <div className="num text-[13px] text-muted break-all mt-1">{query}</div>
          <p className="text-[12px] text-muted mt-3">
            Accepted: decimal block number · 0x + 64 hex (tx or block hash) · 0x + 40 hex (address).
          </p>
        </div>
      )}
    </div>
  );
}
