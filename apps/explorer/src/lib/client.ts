import "server-only";
import { createPublicClient, defineChain, http, type PublicClient } from "viem";
import { CHAIN_ID, CHAIN_NAME, DECIMALS, SYMBOL, serverRpcUrl } from "./config";

export const chain = defineChain({
  id: CHAIN_ID,
  name: CHAIN_NAME,
  nativeCurrency: { name: SYMBOL, symbol: SYMBOL, decimals: DECIMALS },
  rpcUrls: { default: { http: [serverRpcUrl()] } },
});

let cached: PublicClient | null = null;

/** Server-side viem client. Short timeouts, no automatic retries: we handle failure in the UI. */
export function rpc(): PublicClient {
  if (cached) return cached;
  cached = createPublicClient({
    chain,
    transport: http(serverRpcUrl(), {
      timeout: 6_000,
      retryCount: 1,
      retryDelay: 150,
      batch: { batchSize: 50, wait: 10 },
    }),
  });
  return cached;
}

export class RpcUnreachable extends Error {
  constructor(message = "RPC unreachable") {
    super(message);
    this.name = "RpcUnreachable";
  }
}

/** Wrap an RPC call; connection-level failures become RpcUnreachable, everything else rethrows. */
export async function safeRpc<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isConnectionError(err)) throw new RpcUnreachable(errorMessage(err));
    throw err;
  }
}

/** Returns null when the RPC is unreachable or the call fails for any reason. */
export async function tryRpc<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export function isConnectionError(err: unknown): boolean {
  const msg = errorMessage(err).toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("http request failed") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("enotfound") ||
    msg.includes("network") ||
    msg.includes("socket") ||
    msg.includes("502") ||
    msg.includes("503")
  );
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
