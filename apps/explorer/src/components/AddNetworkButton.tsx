"use client";

import { Wallet } from "lucide-react";
import { useState } from "react";
import { CHAIN_ID, CHAIN_NAME, EXPLORER_URL, SYMBOL, WALLET_RPC_URLS } from "@/lib/config";

type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

export function AddNetworkButton() {
  const [msg, setMsg] = useState<string | null>(null);

  const add = async () => {
    const eth = (window as unknown as { ethereum?: Eip1193 }).ethereum;
    if (!eth) {
      setMsg("No wallet detected");
      return;
    }
    try {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${CHAIN_ID.toString(16)}`,
            chainName: CHAIN_NAME,
            nativeCurrency: { name: SYMBOL, symbol: SYMBOL, decimals: 18 },
            rpcUrls: WALLET_RPC_URLS,
            blockExplorerUrls: [EXPLORER_URL],
          },
        ],
      });
      setMsg("Network added");
    } catch (e) {
      const m = e instanceof Error ? e.message : "Rejected";
      setMsg(m.length > 60 ? "Request rejected" : m);
    }
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <button type="button" onClick={add} className="btn" title="wallet_addEthereumChain">
      <Wallet className="h-3.5 w-3.5" />
      {msg ?? "Add network to wallet"}
    </button>
  );
}
