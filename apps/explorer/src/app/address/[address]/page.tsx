import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FileCode2, User } from "lucide-react";
import { getAddress, type Address } from "viem";
import { rpc, RpcUnreachable, safeRpc, tryRpc } from "@/lib/client";
import { SCAN_BLOCKS, scanAddressTxs } from "@/lib/chain-data";
import { knownContractAt, readContractPanel } from "@/lib/contracts";
import { formatBytes, formatInt, formatNativeWithFull, formatUsd, isAddress, nativeToUsd } from "@/lib/format";
import { ANT_USD_ILLUSTRATIVE } from "@/lib/config";
import { PlainHash } from "@/components/HashLink";
import { AddressTxs } from "@/components/AddressTxs";
import { Badge, Card, KV, SectionLabel, Unreachable } from "@/components/ui";

export const dynamic = "force-dynamic";

type Params = Promise<{ address: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { address } = await params;
  return { title: `Address ${address.slice(0, 10)}…` };
}

export default async function AddressPage({ params }: { params: Params }) {
  const { address: raw } = await params;
  if (!isAddress(raw)) notFound();
  const address = getAddress(raw) as Address;
  const client = rpc();
  const known = knownContractAt(address);

  let balance: bigint, nonce: number, code: string | undefined;
  try {
    [balance, nonce, code] = await safeRpc(() =>
      Promise.all([
        client.getBalance({ address }),
        client.getTransactionCount({ address }),
        client.getCode({ address }),
      ]),
    );
  } catch (e) {
    if (e instanceof RpcUnreachable) return <Unreachable error={e.message} retryHref={`/address/${address}`} />;
    throw e;
  }
  const codeBytes = code && code !== "0x" ? (code.length - 2) / 2 : 0;
  const isContract = codeBytes > 0;

  const [panel, scan] = await Promise.all([
    known ? readContractPanel(known) : Promise.resolve(null),
    tryRpc(() => scanAddressTxs(address)),
  ]);
  const bal = formatNativeWithFull(balance, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="label text-amber mb-1 flex items-center gap-2">
            {isContract ? <FileCode2 className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
            {known ? known.name : isContract ? "Contract" : "Address"}
          </div>
          <h1 className="num text-base sm:text-xl text-bone break-all">
            <PlainHash value={address} full />
          </h1>
          {known && <p className="text-sm text-muted mt-1">{known.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {isContract && <Badge tone="amber">Contract</Badge>}
          {known && <Badge tone="green">{known.name}</Badge>}
        </div>
      </div>

      <div className={`grid gap-6 ${known ? "lg:grid-cols-[1fr_360px]" : ""}`}>
        <Card pad={false}>
          <dl>
            <KV k="Balance">
              <span className="num text-base" title={`${bal.full} (${balance.toString()} wei)`}>{bal.short}</span>
              <span className="text-muted ml-2" title={`Illustrative at ANT = $${ANT_USD_ILLUSTRATIVE}`}>({formatUsd(nativeToUsd(balance))} illustrative)</span>
            </KV>
            <KV k="Nonce" hint="Transactions sent from this address">
              <span className="num">{formatInt(nonce)}</span>
            </KV>
            <KV k="Code">
              {isContract ? (
                <span className="num">
                  {formatBytes(codeBytes)} <span className="text-muted">({formatInt(codeBytes)} bytes)</span>
                </span>
              ) : (
                <span className="text-muted">None (externally owned account)</span>
              )}
            </KV>
            {isContract && code && (
              <KV k="Bytecode">
                <details className="group">
                  <summary className="cursor-pointer text-amber hover:text-bone text-[12px] font-mono select-none">show bytecode</summary>
                  <pre className="mt-2 num text-[11px] leading-5 break-all whitespace-pre-wrap text-bone/80 max-h-64 overflow-auto">{code}</pre>
                </details>
              </KV>
            )}
          </dl>
        </Card>

        {known && (
          <Card title={`${known.name} · read`} right={<span className="num">eth_call</span>} pad={false}>
            <dl>
              {(panel ?? []).map((f) => (
                <div key={f.label} className="row px-4 py-3 flex items-start justify-between gap-4">
                  <dt className="num text-[12px] text-muted">{f.label}()</dt>
                  <dd className="num text-[13px] text-right break-all">
                    {f.value === null ? <span className="text-muted">—</span> : /^0x[0-9a-fA-F]{40}$/.test(f.value) ? <a className="link" href={`/address/${f.value}`}>{f.value}</a> : f.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        )}
      </div>

      <section>
        <SectionLabel n="TX">Recent transactions</SectionLabel>
        <Card pad={false}>
          {scan ? (
            <AddressTxs address={address} initial={scan} windowBlocks={SCAN_BLOCKS} />
          ) : (
            <div className="p-6 text-center text-sm text-muted">Could not scan recent blocks right now.</div>
          )}
        </Card>
      </section>
    </div>
  );
}
