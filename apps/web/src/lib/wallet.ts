"use client";

/**
 * Lightweight EIP-1193 wallet layer (no wagmi / RainbowKit).
 * - EIP-6963 provider discovery with `window.ethereum` fallback
 * - connect / disconnect / auto-reconnect (eth_accounts, no prompt)
 * - switch to BSC (0x38) with wallet_addEthereumChain fallback
 * - viem WalletClient via custom(provider)
 * State lives in a module-level store consumed with useSyncExternalStore.
 */
import { useSyncExternalStore } from "react";
import { createWalletClient, custom, type Address, type WalletClient } from "viem";
import { BSC_CHAIN_ID, BSC_CHAIN_ID_HEX, BSC_CHAIN_PARAMS, bscChain } from "./bsc";

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (ev: string, cb: (...a: unknown[]) => void) => void;
  removeListener?: (ev: string, cb: (...a: unknown[]) => void) => void;
};

export type ProviderDetail = {
  info: { uuid: string; name: string; icon?: string; rdns?: string };
  provider: Eip1193Provider;
};

export type WalletState = {
  status: "idle" | "no-wallet" | "disconnected" | "connecting" | "connected";
  address: Address | null;
  chainId: number | null;
  walletName: string | null;
  error: string | null;
  providers: ProviderDetail[];
};

const LS_KEY = "agentchain.wallet.connected";

let state: WalletState = {
  status: "idle",
  address: null,
  chainId: null,
  walletName: null,
  error: null,
  providers: [],
};
const listeners = new Set<() => void>();
let active: ProviderDetail | null = null;
let discovered = false;

function set(patch: Partial<WalletState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!discovered && typeof window !== "undefined") void init();
  return () => {
    listeners.delete(cb);
  };
}

export function useWallet(): WalletState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

// ------------------------------------------------------------ discovery --

function injected(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: Eip1193Provider }).ethereum ?? null;
}

/** EIP-6963: collect announced providers for a short window, then fall back to window.ethereum. */
export async function discoverProviders(waitMs = 250): Promise<ProviderDetail[]> {
  if (typeof window === "undefined") return [];
  const found = new Map<string, ProviderDetail>();
  const onAnnounce = (e: Event) => {
    const d = (e as CustomEvent<ProviderDetail>).detail;
    if (d?.info?.uuid && d.provider) found.set(d.info.uuid, d);
  };
  window.addEventListener("eip6963:announceProvider", onAnnounce as EventListener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise((r) => setTimeout(r, waitMs));
  window.removeEventListener("eip6963:announceProvider", onAnnounce as EventListener);
  const list = [...found.values()];
  if (!list.length) {
    const eth = injected();
    if (eth) {
      const w = eth as Eip1193Provider & { isMetaMask?: boolean; isBinance?: boolean; isOkxWallet?: boolean; isTrust?: boolean };
      const name = w.isBinance ? "Binance Wallet" : w.isOkxWallet ? "OKX Wallet" : w.isTrust ? "Trust Wallet" : w.isMetaMask ? "MetaMask" : "Injected wallet";
      list.push({ info: { uuid: "injected", name }, provider: eth });
    }
  }
  return list;
}

async function init() {
  discovered = true;
  const providers = await discoverProviders();
  if (!providers.length) return set({ status: "no-wallet", providers });
  set({ status: "disconnected", providers });
  // silent reconnect
  if (localStorage.getItem(LS_KEY)) {
    const pref = localStorage.getItem(`${LS_KEY}.name`);
    const p = providers.find((x) => x.info.name === pref) ?? providers[0];
    try {
      const accounts = (await p.provider.request({ method: "eth_accounts" })) as string[];
      if (accounts?.length) await adopt(p, accounts[0] as Address);
    } catch {
      /* ignore */
    }
  }
}

// -------------------------------------------------------------- connect --

function onAccounts(...a: unknown[]) {
  const accounts = (a[0] as string[]) ?? [];
  if (!accounts.length) return disconnect();
  set({ address: accounts[0] as Address });
}
function onChain(...a: unknown[]) {
  const id = a[0] as string;
  set({ chainId: id ? parseInt(id, 16) : null });
}

async function adopt(p: ProviderDetail, address: Address) {
  if (active && active !== p) {
    active.provider.removeListener?.("accountsChanged", onAccounts);
    active.provider.removeListener?.("chainChanged", onChain);
  }
  active = p;
  p.provider.on?.("accountsChanged", onAccounts);
  p.provider.on?.("chainChanged", onChain);
  let chainId: number | null = null;
  try {
    chainId = parseInt((await p.provider.request({ method: "eth_chainId" })) as string, 16);
  } catch {
    /* ignore */
  }
  localStorage.setItem(LS_KEY, "1");
  localStorage.setItem(`${LS_KEY}.name`, p.info.name);
  set({ status: "connected", address, chainId, walletName: p.info.name, error: null });
}

export async function connect(detail?: ProviderDetail): Promise<void> {
  if (!discovered) await init();
  const p = detail ?? active ?? state.providers[0];
  if (!p) return set({ status: "no-wallet" });
  set({ status: "connecting", error: null });
  try {
    const accounts = (await p.provider.request({ method: "eth_requestAccounts" })) as string[];
    if (!accounts?.length) throw new Error("No account returned");
    await adopt(p, accounts[0] as Address);
  } catch (e) {
    const code = (e as { code?: number }).code;
    set({ status: "disconnected", error: code === 4001 ? "Request rejected in wallet." : errMsg(e) });
  }
}

export async function disconnect(): Promise<void> {
  const p = active;
  active = null;
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(`${LS_KEY}.name`);
  if (p) {
    p.provider.removeListener?.("accountsChanged", onAccounts);
    p.provider.removeListener?.("chainChanged", onChain);
    try {
      await p.provider.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] });
    } catch {
      /* not supported by every wallet */
    }
  }
  set({ status: state.providers.length ? "disconnected" : "no-wallet", address: null, chainId: null, walletName: null });
}

/** Switch the active wallet to BSC mainnet, adding the chain if unknown. */
export async function ensureBsc(): Promise<void> {
  const p = active?.provider;
  if (!p) throw new Error("Wallet not connected");
  if (state.chainId === BSC_CHAIN_ID) return;
  try {
    await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BSC_CHAIN_ID_HEX }] });
  } catch (e) {
    const code = (e as { code?: number }).code;
    if (code === 4902 || code === -32603 || code === undefined) {
      await p.request({ method: "wallet_addEthereumChain", params: [BSC_CHAIN_PARAMS] });
    } else throw e;
  }
  try {
    set({ chainId: parseInt((await p.request({ method: "eth_chainId" })) as string, 16) });
  } catch {
    /* ignore */
  }
}

/** viem WalletClient bound to the active provider and BSC mainnet. */
export function getWalletClient(): WalletClient {
  const p = active?.provider;
  if (!p || !state.address) throw new Error("Wallet not connected");
  return createWalletClient({ chain: bscChain, account: state.address, transport: custom(p) });
}

export function activeAccount(): Address {
  if (!state.address) throw new Error("Wallet not connected");
  return state.address;
}

// --------------------------------------------------------------- errors --

/** Turns viem / wallet errors into a short, user-facing string. */
export function errMsg(e: unknown): string {
  const x = e as {
    code?: number;
    shortMessage?: string;
    message?: string;
    cause?: unknown;
    data?: { errorName?: string; args?: unknown[] };
    walk?: (fn: (err: unknown) => boolean) => unknown;
  };
  if (x?.code === 4001 || /user rejected|denied/i.test(x?.message ?? "")) return "Request rejected in wallet.";
  const revert =
    typeof x?.walk === "function"
      ? (x.walk((err) => !!(err as { data?: { errorName?: string } })?.data?.errorName) as { data?: { errorName?: string; args?: unknown[] } } | undefined)
      : undefined;
  const name = revert?.data?.errorName ?? x?.data?.errorName;
  if (name) {
    switch (name) {
      case "NotAgent":
        return "This address holds no Agent ID (or BAB). Claim your Agent ID inside the Binance App: Wallet → banner → Agent ID.";
      case "AlreadyClaimed":
        return "This address already holds a Genesis Seat.";
      case "AlreadyRegistered":
        return "This address is already registered.";
      case "ClaimClosed":
        return "The claim window is closed.";
      case "EnforcedPause":
        return "The contract is paused by the owner.";
      case "ZeroAmount":
        return "Amount must be greater than zero.";
      case "PerAddressCapExceeded":
        return "Amount exceeds your remaining per-address cap.";
      case "GlobalCapExceeded":
        return "Amount exceeds the remaining global cap.";
      default:
        return `Reverted: ${name}`;
    }
  }
  const m = x?.shortMessage ?? x?.message ?? "Failed";
  if (/insufficient funds/i.test(m)) return "Insufficient BNB for gas.";
  if (/ERC20InsufficientAllowance|transfer amount exceeds allowance/i.test(m)) return "Allowance too low — approve first.";
  if (/ERC20InsufficientBalance|exceeds balance/i.test(m)) return "Insufficient ANTB balance.";
  return m.split("\n")[0].slice(0, 160);
}
