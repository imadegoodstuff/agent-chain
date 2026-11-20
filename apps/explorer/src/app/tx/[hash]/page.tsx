import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import type { Hex } from "viem";
import { rpc, RpcUnreachable, safeRpc, tryRpc } from "@/lib/client";
import { formatGwei, formatInt, formatNative, formatTimestamp, formatUsd, isHexHash, nativeToUsd, percent } from "@/lib/format";
import { decodeKnownInput, guessMethod, knownEventSignature } from "@/lib/selectors";
import { knownContractAt, readFeeKeeper, weiToUsdAt } from "@/lib/contracts";
import { Age } from "@/components/Age";
import { HashLink, PlainHash } from "@/components/HashLink";
import { InputData } from "@/components/InputData";
import { LogsList } from "@/components/LogsList";
import { Badge, Card, GasBar, KV, MethodBadge, SectionLabel, Unreachable } from "@/components/ui";
import { ANT_USD_ILLUSTRATIVE } from "@/lib/config";

export const dynamic = "force-dynamic";

type Params = Promise<{ hash: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { hash } = await params;
  return { title: `Tx ${hash.slice(0, 10)}…` };
}

export default async function TxPage({ params }: { params: Params }) {
  const { hash } = await params;
  if (!isHexHash(hash)) notFound();
  const h = hash as Hex;
  const client = rpc();

  let tx;
  try {
    tx = await safeRpc(() => client.getTransaction({ hash: h }).catch((e) => {
      const m = e instanceof Error ? e.message : String(e);
      if (/not (be )?found|TransactionNotFound/i.test(m)) return null;
      throw e;
    }));
  } catch (e) {
    if (e instanceof RpcUnreachable) return <Unreachable error={e.message} retryHref={`/tx/${hash}`} />;
    throw e;
  }
  // Unknown hash → real HTTP 404 with the branded not-found page.
  if (!tx) notFound();

  const [receipt, block, keeper] = await Promise.all([
    tryRpc(() => client.getTransactionReceipt({ hash: h })),
    tx.blockNumber != null ? tryRpc(() => client.getBlock({ blockNumber: tx.blockNumber! })) : Promise.resolve(null),
    readFeeKeeper(),
  ]);

  const pending = tx.blockNumber == null || !receipt;
  const ok = receipt?.status === "success";
  const effGas = receipt?.effectiveGasPrice ?? tx.gasPrice ?? 0n;
  const fee = receipt ? receipt.gasUsed * effGas : null;
  // What the same gas would cost at the FeeKeeper's current minimum base fee (the
  // figure the website quotes). Hardhat's devnet gas price (1 gwei) is unrelated to it.
  const keeperFee = receipt && keeper ? receipt.gasUsed * keeper.minBaseFeeWei : null;
  const keeperUsd = keeperFee !== null && keeper ? weiToUsdAt(keeperFee, keeper.antbUsd) : null;
  const keeperPrice = keeper ? Number(keeper.antbUsd) / 1e8 : null;
  const method = guessMethod(tx.input, tx.to);
  const decoded = decodeKnownInput(tx.input);
  const toKnown = tx.to ? knownContractAt(tx.to) : undefined;
  const fromKnown = knownContractAt(tx.from);
  const type = tx.type === "eip1559" ? "2 (EIP-1559)" : tx.type === "eip2930" ? "1 (EIP-2930)" : tx.type === "legacy" ? "0 (Legacy)" : tx.type;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="label text-amber mb-1">Transaction</div>
          <h1 className="num text-base sm:text-xl text-bone break-all flex items-center gap-2 flex-wrap">
            <PlainHash value={tx.hash} full />
          </h1>
        </div>
        <div>
          {pending ? (
            <Badge tone="neutral" className="text-[12px] px-2 py-1"><Clock className="h-3.5 w-3.5" /> Pending</Badge>
          ) : ok ? (
            <Badge tone="green" className="text-[12px] px-2 py-1"><CheckCircle2 className="h-3.5 w-3.5" /> Success</Badge>
          ) : (
            <Badge tone="red" className="text-[12px] px-2 py-1"><XCircle className="h-3.5 w-3.5" /> Reverted</Badge>
          )}
        </div>
      </div>

      <Card pad={false}>
        <dl>
          <KV k="Status">
            {pending ? <span className="text-muted">Pending — not yet included</span> : ok ? <span className="text-signal">Success</span> : <span className="text-danger">Reverted</span>}
          </KV>
          <KV k="Block">
            {tx.blockNumber != null ? (
              <span className="inline-flex items-center gap-2">
                <HashLink value={tx.blockNumber.toString()} kind="block" label={`#${formatInt(tx.blockNumber)}`} copy={false} />
                {receipt && <Badge tone="neutral">index {receipt.transactionIndex}</Badge>}
              </span>
            ) : (
              <span className="text-muted">—</span>
            )}
          </KV>
          <KV k="Timestamp">
            {block ? (
              <>
                <span className="num">{formatTimestamp(block.timestamp)}</span>
                <span className="text-muted ml-2">(<Age ts={Number(block.timestamp)} />)</span>
              </>
            ) : (
              <span className="text-muted">—</span>
            )}
          </KV>
          <KV k="Method">
            <span className="inline-flex items-center gap-2 flex-wrap">
              <MethodBadge label={method.label} kind={method.kind} />
              {decoded && <span className="num text-[12px] text-muted">{decoded.signature}</span>}
            </span>
          </KV>
          <KV k="From">
            <span className="inline-flex items-center gap-2 flex-wrap">
              <HashLink value={tx.from} kind="address" full />
              {fromKnown && <Badge tone="amber">{fromKnown.name}</Badge>}
            </span>
          </KV>
          <KV k={tx.to ? "To" : "Contract created"}>
            {tx.to ? (
              <span className="inline-flex items-center gap-2 flex-wrap">
                <HashLink value={tx.to} kind="address" full />
                {toKnown && <Badge tone="amber">{toKnown.name}</Badge>}
              </span>
            ) : receipt?.contractAddress ? (
              <span className="inline-flex items-center gap-2 flex-wrap">
                <HashLink value={receipt.contractAddress} kind="address" full />
                <Badge tone="amber">Contract</Badge>
              </span>
            ) : (
              <span className="text-muted">—</span>
            )}
          </KV>
          <KV k="Value">
            <span className="num">{formatNative(tx.value, { maxFrac: 18 })}</span>
            <span className="text-muted ml-2" title={`Illustrative at ANT = $${ANT_USD_ILLUSTRATIVE}`}>({formatUsd(nativeToUsd(tx.value))})</span>
          </KV>
          <KV k="Transaction fee" hint="gasUsed × effectiveGasPrice, and the same gas priced at FeeKeeper.minBaseFeeWei()">
            {fee !== null ? (
              <div className="space-y-1">
                <div>
                  <span className="text-muted">Paid (devnet gas price {formatGwei(effGas)} gwei): </span>
                  <span className="num">{formatNative(fee, { maxFrac: 12 })}</span>
                  <span className="text-muted ml-2" title={`Illustrative at ANT = $${ANT_USD_ILLUSTRATIVE}`}>≈ {formatUsd(nativeToUsd(fee))}</span>
                </div>
                {keeperFee !== null && keeper && (
                  <div>
                    <span className="text-muted">At FeeKeeper min base fee ({formatGwei(keeper.minBaseFeeWei)} gwei): </span>
                    <span className="num" title={formatNative(keeperFee, { maxFrac: 18 })}>≈ {formatNative(keeperFee, { maxFrac: 8 })}</span>
                    <span className="text-muted ml-2" title={`FeeKeeper.antbUsd() = $${keeperPrice?.toFixed(2)}`}>≈ {formatUsd(keeperUsd ?? 0)}</span>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-muted">—</span>
            )}
          </KV>
          <KV k="Gas price" hint="Effective gas price from the receipt">
            <span className="num">
              {formatGwei(effGas)} gwei <span className="text-muted">({effGas.toString()} wei)</span>
            </span>
          </KV>
          {tx.maxFeePerGas != null && (
            <KV k="Max fee / priority">
              <span className="num">
                {formatGwei(tx.maxFeePerGas)} gwei <span className="text-muted">/</span> {formatGwei(tx.maxPriorityFeePerGas ?? 0n)} gwei
              </span>
            </KV>
          )}
          <KV k="Gas limit / used">
            <div className="flex flex-col gap-1.5 max-w-md">
              <span className="num">
                {formatInt(tx.gas)}
                {receipt && (
                  <>
                    <span className="text-muted"> / </span>
                    {formatInt(receipt.gasUsed)} <span className="text-muted">({percent(receipt.gasUsed, tx.gas).toFixed(2)}%)</span>
                  </>
                )}
              </span>
              {receipt && <GasBar pct={percent(receipt.gasUsed, tx.gas)} tone={receipt.status === "reverted" ? "red" : "amber"} />}
            </div>
          </KV>
          <KV k="Nonce">
            <span className="num">{tx.nonce}</span>
          </KV>
          <KV k="Type">
            <span className="num">{type}</span>
          </KV>
          {block?.hash && (
            <KV k="Block hash">
              <PlainHash value={block.hash} full />
            </KV>
          )}
        </dl>
      </Card>

      <section>
        <SectionLabel n="IN">Input data</SectionLabel>
        <Card pad={false}>
          <InputData input={tx.input} decoded={decoded} />
        </Card>
      </section>

      <section>
        <SectionLabel n="LG">Logs {receipt ? `(${receipt.logs.length})` : ""}</SectionLabel>
        <Card pad={false}>
          <LogsList
            logs={(receipt?.logs ?? []).map((l) => ({
              address: l.address,
              topics: [...l.topics],
              data: l.data,
              logIndex: l.logIndex,
              known: knownContractAt(l.address)?.name ?? null,
              eventSig: knownEventSignature(l.topics[0]),
            }))}
          />
        </Card>
      </section>
    </div>
  );
}
