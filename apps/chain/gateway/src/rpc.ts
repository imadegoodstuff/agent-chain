import { recoverTransactionAddress, type Address, type TransactionSerialized } from 'viem';
import type { GatewayConfig } from './config.js';
import type { AgentChecker } from './agent-check.js';

export type JsonRpcId = string | number | null;
export type JsonRpcRequest = { jsonrpc?: string; id?: JsonRpcId; method?: unknown; params?: unknown };
export type JsonRpcResponse = { jsonrpc: '2.0'; id: JsonRpcId; result?: unknown; error?: { code: number; message: string; data?: unknown } };

/** Custom error code (server-defined range -32000..-32099) for the Agent ID gate. */
export const AGENT_ID_REQUIRED = -32050;
export const METHOD_BLOCKED = -32601;

export function rpcError(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data !== undefined ? { data } : {}) } };
}

export function isBlockedMethod(method: string, cfg: GatewayConfig): boolean {
  for (const prefix of cfg.blockedMethods) if (method.startsWith(prefix)) return true;
  return false;
}

/**
 * Inspect a single request. Returns a local response if the gateway must answer itself,
 * or `null` if the request should be forwarded upstream.
 */
export async function screen(req: JsonRpcRequest, cfg: GatewayConfig, checker: AgentChecker): Promise<JsonRpcResponse | null> {
  const id = (req.id ?? null) as JsonRpcId;
  if (typeof req.method !== 'string') return rpcError(id, -32600, 'Invalid Request: method must be a string');
  const method = req.method;

  if (isBlockedMethod(method, cfg)) return rpcError(id, METHOD_BLOCKED, `Method ${method} is not available through the public gateway`);

  if (method !== 'eth_sendRawTransaction') return null;

  const params = Array.isArray(req.params) ? req.params : [];
  const raw = params[0];
  if (typeof raw !== 'string' || !/^0x[0-9a-fA-F]*$/.test(raw)) {
    return rpcError(id, -32602, 'Invalid params: expected a hex-encoded signed transaction');
  }

  let sender: Address;
  try {
    sender = await recoverTransactionAddress({ serializedTransaction: raw as TransactionSerialized });
  } catch (err) {
    return rpcError(id, -32602, `Invalid params: could not decode/recover transaction sender (${(err as Error).message.split('\n')[0]})`);
  }

  const res = await checker.check(sender);
  if (res.isAgent) return null;

  const msg = `sender ${sender} does not hold a Binance Agent ID (or BAB). AGENT CHAIN only sequences transactions from verified agents. Claim an Agent ID in the Binance App (Wallet → Agent ID), then retry.`;
  if (!cfg.enforce) {
    console.warn(`[gateway] observe-only: would reject ${sender} (source=${res.source})`);
    return null;
  }
  return rpcError(id, AGENT_ID_REQUIRED, msg, { sender, chainId: cfg.chainId, source: res.source, docs: 'https://agent-chain.agency/#builders' });
}
