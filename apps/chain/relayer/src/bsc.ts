import { createPublicClient, http, parseAbi, parseAbiItem, type Address, type PublicClient } from 'viem';
import { bsc } from 'viem/chains';

export const depositedEvent = parseAbiItem('event Deposited(address indexed from, address indexed l2Recipient, uint256 amount, uint256 indexed nonce)');
export const bridgeAbi = parseAbi([
  'function totalDeposited() view returns (uint256)',
  'function totalWithdrawn() view returns (uint256)',
  'function depositCount() view returns (uint256)',
  'function inbox() view returns (address)',
]);
export const erc20Abi = parseAbi(['function balanceOf(address) view returns (uint256)']);

export type DepositLog = {
  nonce: bigint;
  depositor: Address;
  l2Recipient: Address;
  amount: bigint;
  txHash: `0x${string}`;
  blockNumber: bigint;
};

/**
 * Multi-endpoint BSC client. Every call is tried on each endpoint in order; an endpoint that failed a given
 * method is skipped for that method for `banMs` (bsc-dataseed always rejects eth_getLogs with "limit exceeded").
 */
export class BscClients {
  private readonly clients: PublicClient[];
  private readonly banned = new Map<string, number>(); // `${method}@${url}` → until (ms)
  constructor(private readonly urls: string[], private readonly banMs = 10 * 60_000) {
    this.clients = urls.map((u) => createPublicClient({ chain: bsc, transport: http(u, { timeout: 30_000, retryCount: 1 }) }));
  }

  private async withFallback<T>(method: string, fn: (c: PublicClient) => Promise<T>): Promise<T> {
    let lastErr: unknown;
    const now = Date.now();
    for (let i = 0; i < this.clients.length; i++) {
      const key = `${method}@${this.urls[i]}`;
      const until = this.banned.get(key) ?? 0;
      if (until > now) continue;
      try {
        return await fn(this.clients[i]);
      } catch (e) {
        lastErr = e;
        this.banned.set(key, now + this.banMs);
        console.warn(`[bsc] ${method} failed on ${this.urls[i]}: ${String((e as Error).message).split('\n')[0]} — trying next endpoint`);
      }
    }
    // everything banned or failed: clear bans for this method so the next round retries all
    for (const k of [...this.banned.keys()]) if (k.startsWith(`${method}@`)) this.banned.delete(k);
    throw lastErr instanceof Error ? lastErr : new Error(`all BSC endpoints failed for ${method}`);
  }

  chainId() {
    return this.withFallback('eth_chainId', (c) => c.getChainId());
  }
  blockNumber() {
    return this.withFallback('eth_blockNumber', (c) => c.getBlockNumber({ cacheTime: 0 }));
  }
  async deposits(bridge: Address, fromBlock: bigint, toBlock: bigint): Promise<DepositLog[]> {
    const logs = await this.withFallback('eth_getLogs', (c) => c.getLogs({ address: bridge, event: depositedEvent, fromBlock, toBlock, strict: true }));
    return logs
      .map((l) => ({
        nonce: l.args.nonce,
        depositor: l.args.from,
        l2Recipient: l.args.l2Recipient,
        amount: l.args.amount,
        txHash: l.transactionHash,
        blockNumber: l.blockNumber,
      }))
      .sort((a, b) => (a.nonce < b.nonce ? -1 : a.nonce > b.nonce ? 1 : 0));
  }
  /** Escrow invariant (audit note): balanceOf(bridge) + totalWithdrawn must cover totalDeposited. */
  async escrow(bridge: Address, antb: Address) {
    return this.withFallback('eth_call', async (c) => {
      const [totalDeposited, totalWithdrawn, balance, depositCount, inbox] = await Promise.all([
        c.readContract({ address: bridge, abi: bridgeAbi, functionName: 'totalDeposited' }),
        c.readContract({ address: bridge, abi: bridgeAbi, functionName: 'totalWithdrawn' }),
        c.readContract({ address: antb, abi: erc20Abi, functionName: 'balanceOf', args: [bridge] }),
        c.readContract({ address: bridge, abi: bridgeAbi, functionName: 'depositCount' }),
        c.readContract({ address: bridge, abi: bridgeAbi, functionName: 'inbox' }),
      ]);
      return { totalDeposited, totalWithdrawn, balance, depositCount, inbox, holds: balance + totalWithdrawn >= totalDeposited };
    });
  }
}
