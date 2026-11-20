import { ExternalLink } from "lucide-react";
import { AddNetworkButton } from "./AddNetworkButton";
import { Copyable } from "./Copyable";
import {
  CHAIN_ID,
  CHAIN_NAME,
  EXPLORER_URL,
  FLY_RPC_URL,
  IS_DEVNET,
  PARENT_CHAIN_NAME,
  PARENT_EXPLORER_URL,
  PHASE_LABEL,
  PUBLIC_RPC_URL,
  ROLLUP_ADDRESS,
  SYMBOL,
  TARGET_BLOCK_MS,
  WEBSITE_URL,
} from "@/lib/config";

export function Footer() {
  return (
    <footer className="border-t border-line mt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid gap-8 md:grid-cols-3">
        <div className="space-y-3">
          <div className="label">Network</div>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Name</dt>
              <dd>{CHAIN_NAME}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Chain ID</dt>
              <dd className="num">{CHAIN_ID} <span className="text-muted">(0x{CHAIN_ID.toString(16).toUpperCase()})</span></dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Currency</dt>
              <dd className="num">{SYMBOL}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Block time</dt>
              <dd className="num">{TARGET_BLOCK_MS} ms</dd>
            </div>
            {!IS_DEVNET && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Settles to</dt>
                <dd className="num text-[12px]">
                  {ROLLUP_ADDRESS ? (
                    <a href={`${PARENT_EXPLORER_URL}/address/${ROLLUP_ADDRESS}`} className="link" target="_blank" rel="noreferrer" title={`Rollup ${ROLLUP_ADDRESS}`}>
                      {PARENT_CHAIN_NAME} · Rollup {ROLLUP_ADDRESS.slice(0, 6)}…{ROLLUP_ADDRESS.slice(-4)}
                    </a>
                  ) : (
                    PARENT_CHAIN_NAME
                  )}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4 items-center">
              <dt className="text-muted">RPC</dt>
              <dd className="num text-[12px] flex items-center gap-1">
                <a href={PUBLIC_RPC_URL} className="link" target="_blank" rel="noreferrer">{PUBLIC_RPC_URL}</a>
                <Copyable value={PUBLIC_RPC_URL} />
              </dd>
            </div>
            {FLY_RPC_URL !== PUBLIC_RPC_URL && (
              <div className="flex justify-between gap-4 items-center">
                <dt className="text-muted">RPC (fallback)</dt>
                <dd className="num text-[12px] flex items-center gap-1">
                  <a href={FLY_RPC_URL} className="link" target="_blank" rel="noreferrer">{FLY_RPC_URL}</a>
                  <Copyable value={FLY_RPC_URL} />
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4 items-center">
              <dt className="text-muted">Explorer</dt>
              <dd className="num text-[12px] flex items-center gap-1">
                <a href={EXPLORER_URL} className="link">{EXPLORER_URL}</a>
                <Copyable value={EXPLORER_URL} />
              </dd>
            </div>
          </dl>
          <div className="pt-1 flex flex-wrap gap-2">
            <AddNetworkButton />
            <a href={WEBSITE_URL} target="_blank" rel="noreferrer" className="btn">
              Website <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="md:col-span-2 space-y-3 text-[12px] leading-relaxed text-muted">
          <div className="label">Disclaimers</div>
          {IS_DEVNET ? (
            <p className="text-amber/90">Devnet tokens have no value.</p>
          ) : (
            <p className="text-amber/90">
              Beta software. The sequencer is a single operator; state is settled to {PARENT_CHAIN_NAME} via the Rollup
              contract. Use at your own risk.
            </p>
          )}
          <p>
            AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB
            Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules; bStocks are not available to US persons and
            are restricted in other jurisdictions.
          </p>
          <p>
            Nothing here is investment advice. $AGENT confers no rights to revenue, equity, or returns; fee distributions are
            protocol parameters that governance can change.
          </p>
          <p>
            USD figures are illustrative at ANT = $97.17 (IPO day close, 2026-11-19), not a market feed.
          </p>
          <p className="pt-2 font-mono text-[11px] tracking-wide">
            AGENT CHAIN · Intelligence is gas. · {PHASE_LABEL}
            {!IS_DEVNET && ROLLUP_ADDRESS && (
              <>
                {" · "}
                <a href={`${PARENT_EXPLORER_URL}/address/${ROLLUP_ADDRESS}`} className="link" target="_blank" rel="noreferrer">
                  Rollup on {PARENT_CHAIN_NAME === "BSC" ? "BscScan" : PARENT_CHAIN_NAME}
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
