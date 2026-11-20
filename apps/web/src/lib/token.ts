/**
 * $AGENT on Flap — Portal read ABI (from apps/chain/scripts/launch-agent-token.ts)
 * and wallet_watchAsset params. Read-only; no trading route lives in this site.
 */
import { parseAbi } from "viem";
import { AGENT_TOKEN } from "./spec";

export const flapPortalAbi = parseAbi([
  "struct TokenStateV8Safe { uint8 status; uint256 reserve; uint256 circulatingSupply; uint256 price; uint8 tokenVersion; uint256 r; uint256 h; uint256 k; uint256 dexSupplyThresh; address quoteTokenAddress; bool nativeToQuoteSwapEnabled; bytes32 extensionID; uint256 buyTaxRate; uint256 sellTaxRate; address pool; uint256 progress; uint8 lpFeeProfile; uint8 dexId; }",
  "function getTokenV8Safe(address token) view returns (TokenStateV8Safe)",
]);

export const agentErc20Abi = parseAbi([
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function buyTaxRate() view returns (uint16)",
  "function sellTaxRate() view returns (uint16)",
  "function taxExpirationTime() view returns (uint256)",
]);

/** wallet_watchAsset payload for $AGENT. */
export const AGENT_WATCH_ASSET = {
  type: "ERC20",
  options: {
    address: AGENT_TOKEN.address,
    symbol: AGENT_TOKEN.symbol,
    decimals: AGENT_TOKEN.decimals,
    image: "https://agent-chain.agency/token-logo.png",
  },
} as const;
