import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { registerCustomParentChain } from '@arbitrum/chain-sdk';
import { parentChainObject, type NetworkDescriptor } from './networks';

export function parentClients(
  net: NetworkDescriptor,
  privateKey: Hex,
  contracts: { rollupCreator?: Address; weth?: Address; tokenBridgeCreator?: Address } = {},
) {
  const chain = parentChainObject(net, contracts);
  // BSC is not a built-in Arbitrum chain SDK parent; register it (idempotent for the process).
  registerCustomParentChain(chain);
  const account = privateKeyToAccount(privateKey);
  // retryCount 0: a retried eth_sendRawTransaction after a node-side revert surfaces as a misleading
  // "nonce too low" and hides the real error. Scripts are re-runnable, so fail fast instead.
  const transport = http(net.parentRpcUrl, { timeout: 120_000, retryCount: 0 });
  const publicClient = createPublicClient({ chain, transport });
  const walletClient = createWalletClient({ chain, transport, account });
  return { chain, account, publicClient, walletClient };
}

export async function assertParentChainId(publicClient: { getChainId: () => Promise<number> }, expected: number) {
  const actual = await publicClient.getChainId();
  if (actual !== expected) {
    throw new Error(`Parent RPC reports chainId ${actual}, expected ${expected}. Check PARENT_CHAIN_RPC_* / NETWORK.`);
  }
}

/**
 * Receipt polling without viem's block watcher (a silent process exit was observed with it on Windows/BSC).
 * Resolves with the receipt once mined; throws after `timeoutMs`.
 */
export async function waitForReceipt(
  publicClient: { getTransactionReceipt: (a: { hash: Hex }) => Promise<any> },
  hash: Hex,
  timeoutMs = 600_000,
) {
  const keepalive = setInterval(() => {}, 10_000);
  const start = Date.now();
  try {
    while (Date.now() - start < timeoutMs) {
      try {
        const r = await publicClient.getTransactionReceipt({ hash });
        if (r) return r;
      } catch (e) {
        if (!/could not be found|not found/i.test((e as Error).message ?? '')) {
          console.log(`  (receipt poll error for ${hash}: ${String((e as Error).message).split('\n')[0]})`);
        }
      }
      await new Promise((r) => setTimeout(r, 1_000));
    }
    throw new Error(`timeout waiting for receipt ${hash}`);
  } finally {
    clearInterval(keepalive);
  }
}

export function fmtBnb(wei: bigint): string {
  const s = wei.toString().padStart(19, '0');
  return `${s.slice(0, -18)}.${s.slice(-18, -12)}`;
}
