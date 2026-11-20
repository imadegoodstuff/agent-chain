import type { Address, Chain } from 'viem';
import { optionalEnv, type NetworkName } from './env';

/**
 * Parent-chain + child-chain facts for each deployment target.
 * Source of truth for chain IDs and names: ../../SPEC.md §2.
 */
export type NetworkDescriptor = {
  name: NetworkName;
  /** Nitro child chain */
  childChainId: number;
  chainName: string;
  /** Parent chain (BSC) */
  parentChainId: number;
  parentName: string;
  parentSymbol: string;
  parentRpcUrl: string;
  parentExplorer?: string;
  /** Measured average parent block time in seconds (BSC post-Fermi = 0.45 s). */
  parentBlockTimeSeconds: number;
  /** Wrapped parent native token used as the BoLD stake token. Undefined = deploy a WETH9 (local only). */
  stakeToken?: Address;
  /** Custom gas token on the parent chain. Undefined on testnet until deploy-tantb.ts has run. */
  nativeToken?: Address;
  isMainnet: boolean;
};

export const WBNB_MAINNET: Address = '0xbb4CdB9CBd36B01bD1cBaEbF2De08d9173bc095c';
export const WBNB_TESTNET: Address = '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd';
export const ANTB_MAINNET: Address = '0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53';
export const AGENT_ID_NFT_MAINNET: Address = '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F';

export function getNetwork(name: NetworkName): NetworkDescriptor {
  switch (name) {
    case 'local':
      return {
        name,
        childChainId: 111900,
        chainName: 'AGENT CHAIN Local',
        parentChainId: 31337,
        parentName: 'Hardhat (fake BSC)',
        parentSymbol: 'BNB',
        parentRpcUrl: optionalEnv('PARENT_CHAIN_RPC_LOCAL', 'http://127.0.0.1:8545')!,
        parentBlockTimeSeconds: 0.45,
        stakeToken: undefined,
        nativeToken: (optionalEnv('TANTB_ADDRESS') as Address | undefined) ?? undefined,
        isMainnet: false,
      };
    case 'testnet':
      return {
        name,
        childChainId: 111900,
        chainName: 'AGENT CHAIN Testnet',
        parentChainId: 97,
        parentName: 'BNB Smart Chain Testnet',
        parentSymbol: 'tBNB',
        parentRpcUrl: optionalEnv('PARENT_CHAIN_RPC_TESTNET', 'https://bsc-testnet-dataseed.bnbchain.org')!,
        parentExplorer: 'https://testnet.bscscan.com',
        parentBlockTimeSeconds: 0.45,
        stakeToken: WBNB_TESTNET,
        nativeToken: (optionalEnv('TANTB_ADDRESS') as Address | undefined) ?? undefined,
        isMainnet: false,
      };
    case 'mainnet':
      return {
        name,
        childChainId: 1119,
        chainName: 'AGENT CHAIN',
        parentChainId: 56,
        parentName: 'BNB Smart Chain',
        parentSymbol: 'BNB',
        parentRpcUrl: optionalEnv('PARENT_CHAIN_RPC_MAINNET', 'https://bsc-dataseed.bnbchain.org')!,
        parentExplorer: 'https://bscscan.com',
        parentBlockTimeSeconds: 0.45,
        stakeToken: WBNB_MAINNET,
        nativeToken: (optionalEnv('ANTB_ADDRESS') as Address | undefined) ?? ANTB_MAINNET,
        isMainnet: true,
      };
  }
}

/**
 * viem Chain object for the parent chain. BSC is not a built-in parent of the Arbitrum chain SDK,
 * so we also feed this to `registerCustomParentChain` (with rollupCreator / weth once known).
 */
export function parentChainObject(
  net: NetworkDescriptor,
  contracts: { rollupCreator?: Address; weth?: Address; tokenBridgeCreator?: Address } = {},
): Chain & { contracts?: Record<string, { address: Address }> } {
  const c: Record<string, { address: Address }> = {};
  if (contracts.rollupCreator) c.rollupCreator = { address: contracts.rollupCreator };
  if (contracts.weth) c.weth = { address: contracts.weth };
  if (contracts.tokenBridgeCreator) c.tokenBridgeCreator = { address: contracts.tokenBridgeCreator };
  return {
    id: net.parentChainId,
    name: net.parentName,
    network: net.parentName.toLowerCase().replace(/\s+/g, '-'),
    nativeCurrency: { name: net.parentSymbol, symbol: net.parentSymbol, decimals: 18 },
    rpcUrls: {
      default: { http: [net.parentRpcUrl] },
      public: { http: [net.parentRpcUrl] },
    },
    ...(net.parentExplorer
      ? { blockExplorers: { default: { name: 'BscScan', url: net.parentExplorer } } }
      : {}),
    testnet: !net.isMainnet,
    ...(Object.keys(c).length > 0 ? { contracts: c } : {}),
  } as Chain & { contracts?: Record<string, { address: Address }> };
}
