import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

// AGENT CHAIN — BSC-side (parent chain) contracts. See ../../SPEC.md sections 1, 5, 8.

export const BSC_CHAIN_ID = 56;
export const BSC_TESTNET_CHAIN_ID = 97;

export const BSC_RPC_URL = process.env.BSC_RPC_URL ?? "https://bsc-rpc.publicnode.com";
export const BSC_TESTNET_RPC_URL =
  process.env.BSC_TESTNET_RPC_URL ?? "https://bsc-testnet-rpc.publicnode.com";

/** Well-known mainnet addresses (chainId 56). */
export const MAINNET = {
  /** Binance Agent ID — ERC-721 "SPACE ID Agent ID" (AI), non-transferable, one per KYC'd human. */
  AGENT_ID: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
  /** Binance Account Bound Token (BABT) — ERC-721 soulbound, transparent proxy. */
  BAB: "0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8",
  /** ANTB — bStocks tokenized Anthropic, BEP-20, 18 decimals, beacon proxy, non-rebasing. */
  ANTB: "0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53",
  /** Block in which the Agent ID registry was deployed (2026-10-16). */
  AGENT_ID_DEPLOY_BLOCK: 127_950_748,
} as const;

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
const accounts = deployerKey && /^0x[0-9a-fA-F]{64}$/.test(deployerKey) ? [deployerKey] : [];

const forkUrl = process.env.BSC_FORK_URL?.trim();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // Default evmVersion for 0.8.24 is "shanghai"; OpenZeppelin 5.x requires "cancun"
      // (MCOPY). BSC mainnet and testnet support Cancun since the Pascal hardfork (2025).
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      ...(forkUrl
        ? {
            forking: {
              url: forkUrl,
              ...(process.env.BSC_FORK_BLOCK ? { blockNumber: Number(process.env.BSC_FORK_BLOCK) } : {}),
            },
          }
        : {}),
    },
    bscTestnet: {
      url: BSC_TESTNET_RPC_URL,
      chainId: BSC_TESTNET_CHAIN_ID,
      accounts,
      timeout: 120_000,
    },
    bsc: {
      url: BSC_RPC_URL,
      chainId: BSC_CHAIN_ID,
      accounts,
      timeout: 120_000,
    },
  },
  etherscan: {
    // hardhat-verify >= 2.1 talks to the Etherscan V2 API; one key works for BscScan too.
    // A single string key selects the Etherscan V2 endpoint (chainid-routed); the legacy
    // per-network object form hits api.bscscan.com v1, which now returns HTML.
    apiKey: process.env.BSCSCAN_API_KEY ?? "",
  },
  sourcify: {
    enabled: false, // Sourcify v1 API is removed; BscScan (Etherscan V2) is the verification of record.
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    artifacts: "./artifacts",
    cache: "./cache",
  },
  mocha: {
    timeout: 120_000,
  },
};

export default config;
