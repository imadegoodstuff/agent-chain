import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { rpc, RpcUnreachable, safeRpc } from "@/lib/client";
import { blockTxRows, getFullBlock, notFoundAsNull } from "@/lib/chain-data";
import { formatBytes, formatGwei, formatInt, formatTimestamp, isBlockNumber, isHexHash, percent } from "@/lib/format";
import { Age } from "@/components/Age";
import { HashLink, PlainHash } from "@/components/HashLink";
import { TxTable } from "@/components/TxTable";
import { Badge, Card, GasBar, KV, SectionLabel, Unreachable } from "@/components/ui";

export const dynamic = "force-dynamic";

type Params = Promise<{ number: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { number } = await params;
  return { title: `Block #${number}` };
}

export default async function BlockPage({ params }: { params: Params }) {
  const { number } = await params;
  if (isHexHash(number)) {
    // /block/<hash> → resolve to a height and redirect
    let byHash;
    try {
      byHash = await safeRpc(() => notFoundAsNull(() => rpc().getBlock({ blockHash: number as `0x${string}` })));
    } catch (e) {
      if (e instanceof RpcUnreachable) return <Unreachable error={e.message} retryHref={`/block/${number}`} />;
      throw e;
    }
    if (!byHash || byHash.number === null) notFound();
    redirect(`/block/${byHash.number.toString()}`);
  }
  if (!isBlockNumber(number)) notFound();
  const n = BigInt(number);

  let block;
  let head: bigint | null = null;
  try {
    [block, head] = await safeRpc(() => Promise.all([getFullBlock(n), rpc().getBlockNumber()]));
  } catch (e) {
    if (e instanceof RpcUnreachable) return <Unreachable error={e.message} retryHref={`/block/${number}`} />;
    throw e;
  }
  // Beyond the head (or otherwise missing) → real HTTP 404 with the branded not-found page.
  if (!block || (head !== null && n > head)) notFound();

  const rows = blockTxRows(block);
  const gasPct = percent(block.gasUsed, block.gasLimit);

  return (
    <div className="space-y-6">
      <Header n={n} head={head} ts={Number(block.timestamp)} />

      <Card pad={false}>
        <dl>
          <KV k="Block height">
            <span className="num">{formatInt(n)}</span>
          </KV>
          <KV k="Timestamp" hint="Block timestamp (UTC) and age relative to your clock">
            <span className="num">{formatTimestamp(block.timestamp)}</span>
            <span className="text-muted ml-2">(<Age ts={Number(block.timestamp)} />)</span>
            <span className="num text-muted ml-2 text-[11px]">unix {block.timestamp.toString()}</span>
          </KV>
          <KV k="Transactions">
            <Badge tone={rows.length ? "amber" : "neutral"}>{rows.length} tx</Badge>
          </KV>
          <KV k="Proposer / miner" hint="Coinbase address of the block">
            <HashLink value={block.miner} kind="address" full />
          </KV>
          <KV k="Hash">
            <PlainHash value={block.hash ?? ""} full />
          </KV>
          <KV k="Parent hash">
            {n > 0n ? <HashLink value={block.parentHash} kind="block" label={block.parentHash} full /> : <PlainHash value={block.parentHash} full />}
          </KV>
          <KV k="Gas used">
            <div className="flex flex-col gap-1.5 max-w-md">
              <span className="num">
                {formatInt(block.gasUsed)} <span className="text-muted">/ {formatInt(block.gasLimit)}</span>{" "}
                <span className="text-muted">({gasPct.toFixed(2)}%)</span>
              </span>
              <GasBar pct={gasPct} />
            </div>
          </KV>
          <KV k="Base fee per gas">
            {block.baseFeePerGas != null ? (
              <span className="num">
                {formatGwei(block.baseFeePerGas)} gwei <span className="text-muted">({block.baseFeePerGas.toString()} wei)</span>
              </span>
            ) : (
              <span className="text-muted">—</span>
            )}
          </KV>
          <KV k="Size">
            <span className="num">{formatBytes(block.size)} <span className="text-muted">({block.size.toString()} bytes)</span></span>
          </KV>
          <KV k="Nonce">
            <span className="num">{block.nonce ?? "—"}</span>
          </KV>
          <KV k="Difficulty">
            <span className="num">{block.difficulty.toString()}</span>
          </KV>
          <KV k="Extra data">
            <span className="num break-all text-[12px]">{block.extraData}</span>
          </KV>
          <KV k="State root">
            <PlainHash value={block.stateRoot} full />
          </KV>
          <KV k="Receipts root">
            <PlainHash value={block.receiptsRoot} full />
          </KV>
          <KV k="Transactions root">
            <PlainHash value={block.transactionsRoot} full />
          </KV>
        </dl>
      </Card>

      <section>
        <SectionLabel n="TX">Transactions in this block</SectionLabel>
        <Card pad={false}>
          <TxTable rows={rows} empty="This block has no transactions." />
        </Card>
      </section>
    </div>
  );
}

function Header({ n, head, ts }: { n: bigint; head: bigint | null; ts?: number }) {
  // Only link to blocks that exist: previous needs n > 0, next needs n < head.
  const hasNext = head !== null && n < head;
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="label text-amber mb-1">Block</div>
        <h1 className="num text-2xl sm:text-3xl text-bone">#{formatInt(n)}</h1>
        {ts !== undefined && (
          <div className="text-sm text-muted mt-1">
            <Age ts={ts} />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <NavBtn href={n > 0n ? `/block/${(n - 1n).toString()}` : undefined} dir="prev" />
        {head !== null && (
          <Link href={`/block/${head.toString()}`} className="btn num text-[12px]" title="Chain head">
            head #{head.toString()}
          </Link>
        )}
        <NavBtn href={hasNext ? `/block/${(n + 1n).toString()}` : undefined} dir="next" />
      </div>
    </div>
  );
}

function NavBtn({ href, dir }: { href?: string; dir: "prev" | "next" }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  const cls = "btn h-9 w-9 justify-center px-0";
  if (!href) return <span className={`${cls} opacity-40 cursor-not-allowed`}><Icon className="h-4 w-4" /></span>;
  return (
    <Link href={href} className={cls} aria-label={dir === "prev" ? "Previous block" : "Next block"}>
      <Icon className="h-4 w-4" />
    </Link>
  );
}
