"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronDown, Loader2, LogOut, Wallet } from "lucide-react";
import { shortAddr } from "@/lib/format";
import { BSC_CHAIN_ID, bscAddr } from "@/lib/bsc";
import { connect, disconnect, ensureBsc, useWallet, type ProviderDetail } from "@/lib/wallet";

export function ChainBadge({ chainId }: { chainId: number | null }) {
  const onBsc = chainId === BSC_CHAIN_ID;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${
        onBsc ? "border-green/40 bg-green/10 text-green" : "border-red/40 bg-red/10 text-red"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${onBsc ? "bg-green" : "bg-red"}`} />
      {onBsc ? "BSC · 56" : chainId ? `chain ${chainId}` : "no chain"}
    </span>
  );
}

export function NoWalletHint({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-line bg-surface-2 p-4 text-sm text-muted ${className}`}>
      <div className="text-bone">No wallet detected in this browser.</div>
      <p className="mt-1.5 leading-relaxed">
        Install an EIP-1193 wallet that supports BNB Smart Chain, then reload. Binance Wallet is the shortest path if you
        already hold an Agent ID; MetaMask, OKX Wallet and Trust Wallet also work.
      </p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
        <a href="https://www.binance.com/en/web3wallet" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber hover:underline">
          Binance Wallet <ArrowUpRight size={11} />
        </a>
        <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber hover:underline">
          MetaMask <ArrowUpRight size={11} />
        </a>
      </div>
    </div>
  );
}

export function ConnectButton({ className = "", full = false }: { className?: string; full?: boolean }) {
  const w = useWallet();
  const [pick, setPick] = useState(false);
  const [switching, setSwitching] = useState(false);
  const width = full ? "w-full" : "";

  if (w.status === "idle") {
    return (
      <button type="button" disabled className={`btn-ghost ${width} opacity-60 ${className}`}>
        <Loader2 size={15} className="animate-spin" /> Detecting wallet…
      </button>
    );
  }

  if (w.status === "no-wallet") {
    return (
      <div className={className}>
        <button type="button" disabled className={`btn-ghost ${width} cursor-not-allowed opacity-60`}>
          <Wallet size={15} /> No wallet found
        </button>
      </div>
    );
  }

  if (w.status === "connected" && w.address) {
    const onBsc = w.chainId === BSC_CHAIN_ID;
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <ChainBadge chainId={w.chainId} />
        {!onBsc && (
          <button
            type="button"
            disabled={switching}
            onClick={async () => {
              setSwitching(true);
              try {
                await ensureBsc();
              } catch {
                /* surfaced by badge staying red */
              } finally {
                setSwitching(false);
              }
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-amber/50 bg-amber/10 px-2.5 font-mono text-[11px] text-amber hover:bg-amber/20 disabled:opacity-60"
          >
            {switching ? <Loader2 size={12} className="animate-spin" /> : null}
            Switch to BSC
          </button>
        )}
        <a
          href={bscAddr(w.address)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2.5 font-mono text-[12px] text-bone hover:border-[#3a3d4a]"
          title={w.address}
        >
          {shortAddr(w.address, 4)}
          <span className="hidden text-muted sm:inline">· {w.walletName}</span>
        </a>
        <button
          type="button"
          onClick={() => void disconnect()}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted hover:text-bone"
          aria-label="Disconnect wallet"
          title="Disconnect"
        >
          <LogOut size={13} />
        </button>
      </div>
    );
  }

  const busy = w.status === "connecting";
  const many = w.providers.length > 1;
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        disabled={busy}
        onClick={() => (many ? setPick((p) => !p) : void connect())}
        className={`btn-primary ${width} disabled:opacity-60`}
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Wallet size={15} />}
        {busy ? "Connecting…" : "Connect wallet"}
        {many && !busy && <ChevronDown size={14} />}
      </button>
      {pick && many && (
        <ul className="absolute left-0 z-20 mt-2 w-56 overflow-hidden rounded-lg border border-line bg-surface shadow-xl">
          {w.providers.map((p: ProviderDetail) => (
            <li key={p.info.uuid}>
              <button
                type="button"
                onClick={() => {
                  setPick(false);
                  void connect(p);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-bone hover:bg-surface-2"
              >
                {p.info.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.info.icon} alt="" className="h-5 w-5 rounded" />
                ) : (
                  <Wallet size={16} className="text-muted" />
                )}
                {p.info.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {w.error && <div className="mt-2 font-mono text-[11px] text-red">{w.error}</div>}
    </div>
  );
}
