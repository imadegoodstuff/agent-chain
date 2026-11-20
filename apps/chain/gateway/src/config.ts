import type { Address } from 'viem';

function env(name: string, fallback?: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== '' ? v.trim() : fallback;
}

function requireEnv(name: string): string {
  const v = env(name);
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function parseAddressList(v: string | undefined): Set<string> {
  const out = new Set<string>();
  for (const part of (v ?? '').split(',')) {
    const a = part.trim().toLowerCase();
    if (/^0x[0-9a-f]{40}$/.test(a)) out.add(a);
  }
  return out;
}

export const config = {
  port: Number(env('PORT', '8080')),
  /** Private Nitro sequencer HTTP RPC (Fly 6PN): http://agentchain-node.internal:8547 */
  sequencerRpcUrl: requireEnv('SEQUENCER_RPC_URL'),
  /** Expected chainId of the sequencer (sanity check at boot + for error messages) */
  chainId: Number(env('CHAIN_ID', '111900')),
  /** AgentRegistry on AGENT CHAIN (SPEC §7). Optional: when unset, only the parent-chain check runs. */
  agentRegistryAddress: env('AGENT_REGISTRY_ADDRESS') as Address | undefined,
  /** Parent chain (BSC) RPC for the Agent ID ERC-721 fallback lookup */
  parentRpcUrl: env('PARENT_CHAIN_RPC_URL'),
  /** Binance Agent ID ERC-721 on BSC mainnet (SPEC §1). On testnet point this at a mock or leave empty. */
  agentIdNftAddress: env('AGENT_ID_NFT_ADDRESS', '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F') as Address,
  /** Optional BAB token (ERC-721 / SBT) accepted as an alternative credential */
  babTokenAddress: env('BAB_TOKEN_ADDRESS') as Address | undefined,
  /** Always-allowed senders (ops wallets, faucet, deployer). Lower-cased. */
  allowlist: parseAddressList(env('GATEWAY_ALLOWLIST')),
  /** Cache TTL for isAgent results (ms). SPEC asks for 60 s. */
  cacheTtlMs: Number(env('AGENT_CACHE_TTL_MS', '60000')),
  /** Negative-result cache TTL (shorter, so a freshly registered agent is not locked out for long) */
  negativeCacheTtlMs: Number(env('AGENT_NEGATIVE_CACHE_TTL_MS', '15000')),
  /** Max JSON body size */
  maxBodyBytes: Number(env('MAX_BODY_BYTES', String(2 * 1024 * 1024))),
  /** Upstream timeout */
  upstreamTimeoutMs: Number(env('UPSTREAM_TIMEOUT_MS', '30000')),
  /** Methods never forwarded (node admin / debug surfaces) */
  blockedMethods: new Set(
    (env('BLOCKED_METHODS', 'admin_,debug_,personal_,miner_,arbdebug_,arbtrace_,txpool_') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ),
  /** Set to "false" to run in observe-only mode (log would-be rejections, forward anyway) */
  enforce: env('GATEWAY_ENFORCE', 'true') !== 'false',
};

export type GatewayConfig = typeof config;
