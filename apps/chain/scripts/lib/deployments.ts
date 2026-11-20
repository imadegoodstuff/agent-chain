import * as fs from 'node:fs';
import * as path from 'node:path';
import { APP_ROOT, type NetworkName } from './env';

export const DEPLOYMENTS_DIR = path.join(APP_ROOT, 'deployments');

export function deploymentsDir(net: NetworkName): string {
  const dir = path.join(DEPLOYMENTS_DIR, net);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readJson<T>(net: NetworkName, file: string): T | undefined {
  const p = path.join(deploymentsDir(net), file);
  if (!fs.existsSync(p)) return undefined;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

export function requireJson<T>(net: NetworkName, file: string, hint: string): T {
  const v = readJson<T>(net, file);
  if (!v) throw new Error(`deployments/${net}/${file} not found. ${hint}`);
  return v;
}

export function writeJson(net: NetworkName, file: string, data: unknown): string {
  const p = path.join(deploymentsDir(net), file);
  fs.writeFileSync(p, JSON.stringify(data, bigintReplacer, 2) + '\n');
  return p;
}

export function bigintReplacer(_k: string, v: unknown) {
  return typeof v === 'bigint' ? v.toString() : v;
}

// ---- file shapes ----

export type TokensFile = {
  network: NetworkName;
  parentChainId: number;
  nativeToken: `0x${string}`;
  nativeTokenSymbol: string;
  weth?: `0x${string}`;
  feeTokenPricer?: `0x${string}`;
  feeTokenPricerExchangeRate?: string;
  txHashes: Record<string, `0x${string}`>;
  deployedAt: string;
};

export type CreatorFile = {
  network: NetworkName;
  parentChainId: number;
  nitroContractsVersion: string;
  /** Contracts recompiled with nitro-bsc/patches (ArbitrumChecker gas cap); see RESEARCH.md §7.12. */
  bscPatchedContracts?: string[];
  maxDataSize: string;
  rollupCreator: `0x${string}`;
  bridgeCreator: `0x${string}`;
  osp: `0x${string}`;
  challengeManager: `0x${string}`;
  rollupAdminLogic: `0x${string}`;
  rollupUserLogic: `0x${string}`;
  upgradeExecutor: `0x${string}`;
  validatorWalletCreator: `0x${string}`;
  deployHelper: `0x${string}`;
  weth: `0x${string}`;
  transactionHash: `0x${string}`;
  deployer: `0x${string}`;
  deployedAt: string;
  gasUsedTotal?: string;
  reader4844?: `0x${string}`;
  /** The 12 bridge templates registered in BridgeCreator. */
  templates?: Record<string, `0x${string}`>;
  /** Deployment tx per contract label. */
  txHashes?: Record<string, `0x${string}`>;
};

export type RollupFile = {
  network: NetworkName;
  parentChainId: number;
  childChainId: number;
  chainName: string;
  transactionHash: `0x${string}`;
  deployedAtBlockNumber: number;
  chainOwner: `0x${string}`;
  batchPosters: `0x${string}`[];
  validators: `0x${string}`[];
  stakeToken: `0x${string}`;
  nativeToken: `0x${string}`;
  feeTokenPricer: `0x${string}`;
  wasmModuleRoot: `0x${string}`;
  coreContracts: Record<string, `0x${string}` | number | undefined>;
  chainConfig: unknown;
  timing: Record<string, string | Record<string, string>>;
  gasUsed?: string;
  deployedAt: string;
};
