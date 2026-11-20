/**
 * AGENT CHAIN MCP server configuration.
 * All values can be overridden with environment variables so the same binary
 * serves devnet today and testnet/mainnet later.
 */

export const CONFIG = {
  /** AGENT CHAIN JSON-RPC (devnet today). */
  rpcUrl: process.env.AGENTCHAIN_RPC_URL ?? "https://rpc.agent-chain.agency",
  /** Explorer base URL; `/api/head` is used for the head snapshot. */
  explorerUrl: process.env.AGENTCHAIN_EXPLORER_URL ?? "https://explorer.agent-chain.agency",
  /** Expected chain id (devnet 11190, testnet 111900, mainnet 1119). */
  chainId: Number(process.env.AGENTCHAIN_CHAIN_ID ?? 11190),
  /** Native gas symbol shown in outputs. */
  gasSymbol: process.env.AGENTCHAIN_GAS_SYMBOL ?? "tANTB",

  contracts: {
    agentRegistry: (process.env.AGENTCHAIN_AGENT_REGISTRY ??
      "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`,
    genesisSeat: (process.env.AGENTCHAIN_GENESIS_SEAT ??
      "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512") as `0x${string}`,
    feeKeeper: (process.env.AGENTCHAIN_FEE_KEEPER ??
      "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0") as `0x${string}`,
  },

  /** BSC mainnet (chain id 56), used only for the optional Agent ID balance check. */
  bsc: {
    rpcUrl: process.env.BSC_RPC_URL ?? "https://bsc-dataseed.bnbchain.org",
    /** Binance Agent ID ERC-721. */
    agentIdContract: (process.env.BSC_AGENT_ID_CONTRACT ??
      "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F") as `0x${string}`,
  },

  /** HTTP variant listen port. */
  httpPort: Number(process.env.PORT ?? 8080),
} as const;

export const SERVER_INFO = {
  name: "agentchain-mcp",
  version: "0.1.0",
} as const;

export const DISCLAIMER =
  "AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. " +
  "Nothing here is investment advice. Devnet tokens have no value.";
