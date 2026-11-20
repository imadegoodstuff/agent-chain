"use client";

import { DEVNET, MAINNET } from "@/lib/spec";

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (ev: string, cb: (...a: unknown[]) => void) => void;
};

export function getProvider(): Eip1193 | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { ethereum?: Eip1193 };
  return w.ethereum ?? null;
}

export const DEVNET_CHAIN_PARAMS = {
  chainId: DEVNET.chainIdHex,
  chainName: DEVNET.name,
  nativeCurrency: { name: "Test ANTB", symbol: DEVNET.symbol, decimals: 18 },
  rpcUrls: [DEVNET.rpc],
  blockExplorerUrls: [DEVNET.explorer],
};

/** Switches to chain 11190, adding it first if the wallet does not know it. */
export async function ensureDevnet(p: Eip1193): Promise<void> {
  try {
    await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: DEVNET.chainIdHex }] });
  } catch (e) {
    const code = (e as { code?: number }).code;
    if (code === 4902 || code === -32603 || code === undefined) {
      await p.request({ method: "wallet_addEthereumChain", params: [DEVNET_CHAIN_PARAMS] });
    } else throw e;
  }
}

export const MAINNET_CHAIN_PARAMS = {
  chainId: MAINNET.chainIdHex,
  chainName: MAINNET.name,
  nativeCurrency: { name: "ANTB", symbol: MAINNET.symbol, decimals: 18 },
  rpcUrls: [MAINNET.rpc],
  blockExplorerUrls: [MAINNET.explorer],
};

async function addChain(params: typeof DEVNET_CHAIN_PARAMS | typeof MAINNET_CHAIN_PARAMS): Promise<"added" | "no-wallet" | "rejected"> {
  const p = getProvider();
  if (!p) return "no-wallet";
  try {
    await p.request({ method: "wallet_addEthereumChain", params: [params] });
    return "added";
  } catch {
    return "rejected";
  }
}

export const addDevnet = () => addChain(DEVNET_CHAIN_PARAMS);
/** Adds AGENT CHAIN mainnet (chain 1119, ANTB) to the injected wallet. */
export const addMainnet = () => addChain(MAINNET_CHAIN_PARAMS);
