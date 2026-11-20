import type { HardhatUserConfig } from 'hardhat/config';

/**
 * Hardhat is used here for two things only:
 *   1. compiling the small helper contracts in ./contracts (tANTB test token, fee-token pricer)
 *   2. running a local "fake BSC" (chainId 31337, baseFee forced to 0 like BSC, 60M gas blocks)
 *      so every deployment script can be dry-run end to end without funds.
 *
 * The real deployments target BSC via the viem scripts in ./scripts, not via Hardhat networks.
 */
const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  paths: {
    sources: './contracts',
    artifacts: './artifacts',
    cache: './cache',
  },
  networks: {
    hardhat: {
      chainId: 31337,
      // BSC (Fermi/Pasteur, 2026) is Prague-level: no EIP-7825 per-transaction gas cap (16.7M), which
      // Hardhat's default Osaka hardfork would apply and which would reject createRollup (~23.3M gas).
      hardfork: 'prague',
      // Hardhat 2.29 still enforces the 2^24 per-tx cap unless blockGasLimit is this magic value
      // (the one solidity-coverage uses), see hardhat/internal/hardhat-network/provider/provider.js.
      blockGasLimit: 0x1fffffffffffff,
      // BSC has a 0 base fee (gas price is priority-fee driven); mimic it so the dry-run
      // exercises the same code paths (SequencerInbox spending reports with basefee 0).
      initialBaseFeePerGas: 0,
      allowUnlimitedContractSize: false,
      accounts: { count: 10, accountsBalance: '1000000000000000000000000' },
    },
  },
};

export default config;
