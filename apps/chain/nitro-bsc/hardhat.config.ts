import type { HardhatUserConfig } from 'hardhat/config';

/**
 * Compiles nitro-contracts v3.2.0 (copied from node_modules/@arbitrum/nitro-contracts/src into ./src by
 * scripts/build-nitro-bsc.ts) with ONE patch applied: libraries/ArbitrumChecker.sol caps the gas forwarded to the
 * ArbSys probe (see patches/ArbitrumChecker.sol and RESEARCH.md §7.12).
 *
 * Compiler settings are copied verbatim from nitro-contracts v3.2.0 hardhat.config.ts so every unpatched contract
 * reproduces the upstream bytecode (solc 0.8.17, london, bytecodeHash none, runs 2000 / 20 for the rollup logic).
 */
const commonSetting = {
  metadata: { bytecodeHash: 'none' as const },
  optimizer: { enabled: true, runs: 2000 },
  evmVersion: 'london',
};

const config: HardhatUserConfig = {
  solidity: {
    compilers: [{ version: '0.8.17', settings: { ...commonSetting } }],
    overrides: {
      'src/rollup/RollupUserLogic.sol': {
        version: '0.8.17',
        settings: { ...commonSetting, optimizer: { ...commonSetting.optimizer, runs: 20 } },
      },
      'src/rollup/RollupAdminLogic.sol': {
        version: '0.8.17',
        settings: { ...commonSetting, optimizer: { ...commonSetting.optimizer, runs: 20 } },
      },
      'src/challengeV2/EdgeChallengeManager.sol': {
        version: '0.8.17',
        settings: { ...commonSetting, optimizer: { ...commonSetting.optimizer, runs: 200 } },
      },
    },
  },
  paths: {
    sources: './src',
    artifacts: './artifacts',
    cache: './cache',
  },
};

export default config;
