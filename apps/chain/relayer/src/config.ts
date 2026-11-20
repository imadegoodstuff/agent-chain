import type { Address, Hex } from 'viem';

function env(name: string, fallback?: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== '' ? v.trim() : fallback;
}
function requireEnv(name: string): string {
  const v = env(name);
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const pk = requireEnv('CHAIN_OWNER_PRIVATE_KEY');
if (!/^0x[0-9a-fA-F]{64}$/.test(pk.startsWith('0x') ? pk : `0x${pk}`)) throw new Error('CHAIN_OWNER_PRIVATE_KEY is not a 32-byte hex key');

export const config = {
  port: Number(env('PORT', '8080')),
  /** BSC JSON-RPC endpoints, tried in order per call. dataseed rejects eth_getLogs → publicnode serves it. */
  bscRpcUrls: (env('BSC_RPC_URLS', 'https://bsc-dataseed.bnbchain.org,https://bsc-rpc.publicnode.com') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  bscChainId: Number(env('BSC_CHAIN_ID', '56')),
  /** BSC-side Bridge (contracts/bsc/contracts/Bridge.sol) */
  bridgeAddress: (env('BRIDGE_ADDRESS', '0x9eF8CA94a74B7Fbc5ae0b1F7a2dCaFCa14eE2A92') as Address),
  bridgeDeployBlock: BigInt(env('BRIDGE_DEPLOY_BLOCK', '134642093')!),
  antbAddress: (env('ANTB_ADDRESS', '0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53') as Address),
  /** Blocks behind head before a deposit is credited (BSC fast finality ≈ 2 blocks; 20 ≈ 9 s). */
  confirmations: BigInt(env('CONFIRMATIONS', '20')!),
  /** eth_getLogs range per request (BSC public nodes cap at 5000; publicnode is happy with 1000). */
  chunkBlocks: BigInt(env('CHUNK_BLOCKS', '1000')!),
  pollIntervalMs: Number(env('POLL_INTERVAL_MS', '15000')),
  /** AGENT CHAIN RPC: private sequencer over Fly 6PN, or the gateway (owner is allow-listed). */
  l2RpcUrl: env('L2_RPC_URL', 'http://agentchain-node.internal:8547')!,
  l2ChainId: Number(env('L2_CHAIN_ID', '1119')),
  ownerPrivateKey: (pk.startsWith('0x') ? pk : `0x${pk}`) as Hex,
  /** Durable state (Fly volume). */
  stateFile: env('STATE_FILE', '/data/relayer-state.json')!,
  /** Hard safety cap per single credit (wei). Default 1 ANTB = Beta per-address cap. */
  maxCreditWei: BigInt(env('MAX_CREDIT_WEI', '1000000000000000000')!),
};
export type RelayerConfig = typeof config;
