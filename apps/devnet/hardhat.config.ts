import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";

// AGENT CHAIN Devnet — see ../../SPEC.md section 2.
// Chain ID 11190 (0x2BB6), 250 ms blocks, native currency tANTB (test, no value).

export const DEVNET_CHAIN_ID = 11190;
export const DEVNET_RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";

// Hardhat default mnemonic. Devnet only — never use it with real funds.
export const DEVNET_MNEMONIC =
  "test test test test test test test test test test test junk";

// SPEC section 3: min base fee at ANT = $97.17 ≈ 463,105,000 wei/gas.
const INITIAL_BASE_FEE_PER_GAS = 463_105_000;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // `hardhat node` uses this network config.
    hardhat: {
      chainId: DEVNET_CHAIN_ID,
      mining: { auto: false, interval: 250 },
      // Hardhat normally forces strictly increasing integer timestamps, so 4 blocks/s
      // would push chain time ~3 s ahead of wall clock every second. Allowing equal
      // timestamps lets block.timestamp track wall-clock (several blocks share a second).
      allowBlocksWithSameTimestamp: true,
      allowUnlimitedContractSize: true,
      initialBaseFeePerGas: INITIAL_BASE_FEE_PER_GAS,
      accounts: {
        mnemonic: DEVNET_MNEMONIC,
        count: 20,
        accountsBalance: "10000000000000000000000", // 10000 tANTB
      },
    },
    // Target for `hardhat run scripts/*.ts --network devnet` against a running node.
    devnet: {
      url: DEVNET_RPC_URL,
      chainId: DEVNET_CHAIN_ID,
      accounts: { mnemonic: DEVNET_MNEMONIC, count: 20 },
      timeout: 60_000,
    },
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
    cache: "./cache",
  },
};

export default config;
