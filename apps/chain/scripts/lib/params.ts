import { parseEther, type Address, type Hex } from 'viem';
import type { NetworkDescriptor } from './networks';

/**
 * Rollup parameters that depend on the PARENT chain's block time.
 *
 * The Arbitrum chain SDK only ships defaults for Ethereum / Arbitrum / Base parents and throws for a
 * custom parent, so we reproduce its formulas with BSC's 0.45 s block time (measured 0.450 s on
 * mainnet and 0.452 s on testnet, 2026-11-20). All *Blocks values are BSC block counts.
 *
 * SDK reference formulas (src/getDefault*.js in @arbitrum/chain-sdk 0.28.0):
 *   confirmPeriodBlocks        = 7 days (mainnet) / 30 min (testnet)
 *   challengeGracePeriodBlocks = 2 days
 *   minimumAssertionPeriod     = 15 min
 *   validatorAfkBlocks         = 28 days
 *   sequencerInboxMaxTimeVariation = { delay: 4 days, future: 1 hour } (seconds + equivalent blocks)
 */
export type RollupTimingParams = {
  confirmPeriodBlocks: bigint;
  challengeGracePeriodBlocks: bigint;
  minimumAssertionPeriod: bigint;
  validatorAfkBlocks: bigint;
  sequencerInboxMaxTimeVariation: {
    delayBlocks: bigint;
    futureBlocks: bigint;
    delaySeconds: bigint;
    futureSeconds: bigint;
  };
};

export function blocksFor(seconds: number, blockTimeSeconds: number): bigint {
  return BigInt(Math.round(seconds / blockTimeSeconds));
}

export function rollupTimingParams(net: NetworkDescriptor): RollupTimingParams {
  const bt = net.parentBlockTimeSeconds;
  const DAY = 86_400;
  const HOUR = 3_600;
  const MIN = 60;
  // Testnet: 1 hour confirm period (SDK uses 30 min for testnets; we want a bit more slack to watch BoLD).
  const confirmSeconds = net.isMainnet ? 7 * DAY : 1 * HOUR;
  const graceSeconds = net.isMainnet ? 2 * DAY : 1 * DAY;
  const minAssertionSeconds = 15 * MIN;
  const afkSeconds = 28 * DAY;
  const delaySeconds = 4 * DAY;
  const futureSeconds = 1 * HOUR;
  return {
    confirmPeriodBlocks: blocksFor(confirmSeconds, bt),
    challengeGracePeriodBlocks: blocksFor(graceSeconds, bt),
    minimumAssertionPeriod: blocksFor(minAssertionSeconds, bt),
    validatorAfkBlocks: blocksFor(afkSeconds, bt),
    sequencerInboxMaxTimeVariation: {
      delayBlocks: blocksFor(delaySeconds, bt),
      futureBlocks: blocksFor(futureSeconds, bt),
      delaySeconds: BigInt(delaySeconds),
      futureSeconds: BigInt(futureSeconds),
    },
  };
}

/**
 * maxDataSize baked into the SequencerInbox/Inbox templates AND passed to createRollup.
 * 117964 = the value Arbitrum uses when the parent is an L1 (Ethereum). BSC is an L1 with a
 * 128 KiB transaction size limit, so the L1 value applies. (104857 is for L3s on top of an L2.)
 */
export const MAX_DATA_SIZE = 117_964n;

/** consensus-v61 (ArbOS 61 "Elara") — final root per docs.arbitrum.io/run-arbitrum-node/arbos-releases/arbos61 */
export const WASM_MODULE_ROOT_CONSENSUS_V61: Hex =
  '0xc10cd7ec6acaf1c441a3f6bd0900ad20f15855ba775a96f1939118cbc629dc97';
export const INITIAL_ARBOS_VERSION = 61;

/**
 * BoLD base stake in the stake token (WBNB), in whole-token units.
 * Validators are allow-listed at launch, so the stake is a liveness bond rather than an anti-griefing deposit.
 * Mainnet Beta default 0.02 WBNB (was 1 WBNB in the original plan); override with BOLD_BASE_STAKE=<wbnb> in .env.
 * Raise later via the UpgradeExecutor → RollupAdminLogic.increaseBaseStake (nitro-contracts ≥ v3.1).
 */
export const BOLD_BASE_STAKE_DEFAULT_MAINNET = '0.02';
export const BOLD_BASE_STAKE_DEFAULT_TESTNET = '0.01';
export function baseStakeFor(net: NetworkDescriptor): bigint {
  const override = process.env.BOLD_BASE_STAKE?.trim();
  if (override) return parseEther(override as `${number}`);
  return parseEther(net.isMainnet ? BOLD_BASE_STAKE_DEFAULT_MAINNET : BOLD_BASE_STAKE_DEFAULT_TESTNET);
}

/** Nitro default; kept explicit so the three mini-stake levels are visible. */
export const MINI_STAKE_VALUES: readonly bigint[] = [0n, 1n, 1n];

/**
 * Explicit gas limit for RollupCreator.createRollup. Measured usage on the local dry run: 7,762,260 gas;
 * eth_estimateGas over-reports ~23.3M, which BSC rejects (EIP-7825 / BEP-652 cap = 16,777,216 per tx).
 */
export const CREATE_ROLLUP_GAS_LIMIT = 12_000_000n;
export const BSC_TX_GAS_CAP = 16_777_216n;

/** Gas price bid (in the L2 native token, ANTB-wei) used for the factory-deployment retryables. */
export const MAX_FEE_PER_GAS_FOR_RETRYABLES = 1_000_000_000n; // 1 gwei-equivalent in ANTB

export const ARB_OWNER: Address = '0x0000000000000000000000000000000000000070';
export const ARB_OWNER_PUBLIC: Address = '0x000000000000000000000000000000000000006b';
export const ARB_GAS_INFO: Address = '0x000000000000000000000000000000000000006c';
export const ARB_SYS: Address = '0x0000000000000000000000000000000000000064';

/**
 * SPEC §3 fee formula.
 *   minBaseFee[wei/gas] = (USD_PER_MGAS / 1e6) / ANTB_USD * 1e18
 * With USD_PER_MGAS = 0.045 and ANTB_USD = 97.17 → 463,105,382 wei (SPEC: ≈ 463,105,000).
 */
export function minBaseFeeWei(usdPerMgas: number, antbUsd: number): bigint {
  if (!(usdPerMgas > 0) || !(antbUsd > 0)) throw new Error('prices must be > 0');
  // Do the arithmetic in integers to avoid float drift: scale USD prices to micro-USD.
  const usdPerGasMicro = BigInt(Math.round((usdPerMgas / 1e6) * 1e12)); // µUSD * 1e6 per gas
  const antbUsdMicro = BigInt(Math.round(antbUsd * 1e6));
  // wei = usdPerGas / antbUsd * 1e18 = (usdPerGasMicro / 1e12) / (antbUsdMicro / 1e6) * 1e18
  return (usdPerGasMicro * 10n ** 12n) / antbUsdMicro;
}

/**
 * Exchange rate for the fee-token pricer: ANTB-wei per 1 BNB, 18 decimals.
 * rate = BNB_USD / ANTB_USD * 1e18
 */
export function antbPerBnbRate(bnbUsd: number, antbUsd: number): bigint {
  const bnbMicro = BigInt(Math.round(bnbUsd * 1e6));
  const antbMicro = BigInt(Math.round(antbUsd * 1e6));
  return (bnbMicro * 10n ** 18n) / antbMicro;
}

/**
 * L1 pricing reward rate (ArbOwner.setL1PricingRewardRate), in ANTB-wei per L1 "data unit".
 * A data unit ≈ 1 byte of compressed batch data charged at 16 parent gas. We charge what that byte
 * actually costs on BSC (16 gas × bscGasPriceWei, converted BNB→ANTB) × a safety multiplier.
 */
export function l1RewardRatePerUnit(bscGasPriceWei: bigint, bnbUsd: number, antbUsd: number, multiplier = 1.25): bigint {
  const bnbWeiPerUnit = bscGasPriceWei; // per unit (1 unit = 1 L1 gas-equivalent)
  const rate = antbPerBnbRate(bnbUsd, antbUsd); // ANTB-wei per BNB (1e18)
  const antbWeiPerUnit = (bnbWeiPerUnit * rate) / 10n ** 18n;
  return (antbWeiPerUnit * BigInt(Math.round(multiplier * 1000))) / 1000n;
}
