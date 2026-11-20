import { createPublicClient, http, parseAbi, type Address, type PublicClient } from 'viem';
import type { GatewayConfig } from './config.js';

const agentRegistryAbi = parseAbi(['function isAgent(address account) view returns (bool)']);
const erc721Abi = parseAbi(['function balanceOf(address owner) view returns (uint256)']);

type CacheEntry = { value: boolean; expiresAt: number };

export type AgentCheckResult = { isAgent: boolean; source: 'allowlist' | 'cache' | 'registry' | 'parent' | 'none' };

/**
 * Decides whether `sender` may transact on AGENT CHAIN.
 *
 * Order:
 *   1. static allowlist (ops wallets)
 *   2. 60 s cache
 *   3. AgentRegistry.isAgent(sender) on the L2 (cheap, same RPC as the sequencer)
 *   4. fallback: parent-chain Agent ID ERC-721 balanceOf(sender) > 0  (or BAB token)
 *
 * Fail-closed on errors from *both* sources (a tx from an unverifiable sender is rejected), but the
 * result of a failed lookup is not cached, so transient RPC errors do not lock an agent out for 60 s.
 */
export class AgentChecker {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly l2: PublicClient;
  private readonly parent?: PublicClient;

  constructor(private readonly cfg: GatewayConfig) {
    this.l2 = createPublicClient({ transport: http(cfg.sequencerRpcUrl, { timeout: 5_000 }) });
    if (cfg.parentRpcUrl) {
      this.parent = createPublicClient({ transport: http(cfg.parentRpcUrl, { timeout: 5_000 }) });
    }
    // periodic sweep so the map cannot grow without bound
    setInterval(() => this.sweep(), 60_000).unref();
  }

  async check(sender: Address): Promise<AgentCheckResult> {
    const key = sender.toLowerCase();
    if (this.cfg.allowlist.has(key)) return { isAgent: true, source: 'allowlist' };

    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > now) return { isAgent: hit.value, source: 'cache' };

    let registryOk = false;
    if (this.cfg.agentRegistryAddress) {
      try {
        const v = await this.l2.readContract({
          address: this.cfg.agentRegistryAddress,
          abi: agentRegistryAbi,
          functionName: 'isAgent',
          args: [sender],
        });
        registryOk = true;
        if (v) {
          this.remember(key, true);
          return { isAgent: true, source: 'registry' };
        }
      } catch (err) {
        console.warn(`[agent-check] registry lookup failed for ${sender}: ${(err as Error).message}`);
      }
    }

    if (this.parent) {
      try {
        const bal = await this.parent.readContract({
          address: this.cfg.agentIdNftAddress,
          abi: erc721Abi,
          functionName: 'balanceOf',
          args: [sender],
        });
        let ok = bal > 0n;
        if (!ok && this.cfg.babTokenAddress) {
          const bab = await this.parent.readContract({
            address: this.cfg.babTokenAddress,
            abi: erc721Abi,
            functionName: 'balanceOf',
            args: [sender],
          });
          ok = bab > 0n;
        }
        this.remember(key, ok);
        return { isAgent: ok, source: 'parent' };
      } catch (err) {
        console.warn(`[agent-check] parent lookup failed for ${sender}: ${(err as Error).message}`);
      }
    }

    // Registry answered "false" and no parent fallback is configured → definitive negative.
    if (registryOk) {
      this.remember(key, false);
      return { isAgent: false, source: 'registry' };
    }
    return { isAgent: false, source: 'none' };
  }

  private remember(key: string, value: boolean) {
    const ttl = value ? this.cfg.cacheTtlMs : this.cfg.negativeCacheTtlMs;
    this.cache.set(key, { value, expiresAt: Date.now() + ttl });
  }

  private sweep() {
    const now = Date.now();
    for (const [k, v] of this.cache) if (v.expiresAt <= now) this.cache.delete(k);
  }

  get size() {
    return this.cache.size;
  }
}
