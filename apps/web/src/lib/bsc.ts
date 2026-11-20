/**
 * BSC mainnet (chainId 56) configuration: contracts from SPEC §8, minimal ABIs,
 * and a shared viem public client with RPC fallback. Usable on server and client.
 */
import { createPublicClient, defineChain, fallback, http, parseAbi } from "viem";

export const BSC_CHAIN_ID = 56;
export const BSC_CHAIN_ID_HEX = "0x38";

export const BSC_RPCS = [
  "https://bsc-dataseed.bnbchain.org",
  "https://bsc-rpc.publicnode.com",
  "https://binance.llamarpc.com",
] as const;

export const BSCSCAN = "https://bscscan.com";
export const bscTx = (hash: string) => `${BSCSCAN}/tx/${hash}`;
export const bscAddr = (addr: string) => `${BSCSCAN}/address/${addr}`;
export const bscCode = (addr: string) => `${BSCSCAN}/address/${addr}#code`;

/** wallet_addEthereumChain params for BSC mainnet. */
export const BSC_CHAIN_PARAMS = {
  chainId: BSC_CHAIN_ID_HEX,
  chainName: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: [...BSC_RPCS],
  blockExplorerUrls: [BSCSCAN],
} as const;

/** SPEC §8 — LIVE on BSC mainnet, deployed 2026-11-20, BscScan-verified. */
export const BSC_CONTRACTS = {
  AgentRegistryMirror: "0x9C5488f9Aa9468B1db3Cc6B71143A8B2Ca810CF0",
  GenesisSeatClaim: "0x3972579dd0128BF0b6778cB3B457ba1d14D1695b",
  Bridge: "0x9eF8CA94a74B7Fbc5ae0b1F7a2dCaFCa14eE2A92",
  /** Credentials and gas token (third-party contracts). */
  AgentId: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
  BAB: "0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8",
  ANTB: "0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53",
} as const satisfies Record<string, `0x${string}`>;

export const BSC_OWNER = "0x0F03F1c68d4105dd97011c15cC61467164583A4C" as const;
export const BSC_DEPLOYED_AT = "2026-11-20";

/**
 * Deployment blocks, located via the constructor `OwnershipTransferred` logs
 * (contract-creation receipts on 2026-11-20 ≈ 05:48–05:49 UTC).
 */
export const BSC_DEPLOY_BLOCKS = {
  AgentRegistryMirror: 134_641_983,
  GenesisSeatClaim: 134_642_090,
  Bridge: 134_642_093,
} as const;

/** Agent ID holder snapshot (contracts/bsc/snapshots/agent-id-holders.json). */
export const AGENT_ID_SNAPSHOT = {
  holders: 236_355,
  block: 134_639_601,
  date: "2026-11-20",
} as const;

// ------------------------------------------------------------------ ABIs --

export const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

/** Agent ID + BAB (ERC-721): only `balanceOf` is ever read. */
export const erc721BalanceAbi = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);

export const agentGateErrorsAbi = parseAbi([
  "error NotAgent(address account)",
  "error ZeroAddress()",
  "error OwnableUnauthorizedAccount(address account)",
  "error EnforcedPause()",
  "error ExpectedPause()",
]);

export const registryAbi = parseAbi([
  "function register() returns (uint256 index)",
  "function count() view returns (uint256)",
  "function isRegistered(address account) view returns (bool)",
  "function indexOf(address account) view returns (uint256)",
  "function registeredAt(address account) view returns (uint256)",
  "function agentAt(uint256 index) view returns (address)",
  "function isAgent(address account) view returns (bool)",
  "event AgentRegistered(address indexed agent, uint256 index)",
  "error AlreadyRegistered(address agent)",
  "error IndexOutOfRange(uint256 index)",
  "error NotAgent(address account)",
  "error ZeroAddress()",
]);

export const seatClaimAbi = parseAbi([
  "function claim() returns (uint256 seatId)",
  "function seatOf(address holder) view returns (uint256)",
  "function totalSeats() view returns (uint256)",
  "function claimOpen() view returns (bool)",
  "function claimDeadline() view returns (uint256)",
  "function paused() view returns (bool)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function isAgent(address account) view returns (bool)",
  "event SeatClaimed(address indexed holder, uint256 indexed seatId)",
  "error AlreadyClaimed(address holder)",
  "error ClaimClosed(uint256 deadline)",
  "error NonTransferable()",
  "error NotAgent(address account)",
  "error EnforcedPause()",
]);

export const bridgeAbi = parseAbi([
  "function deposit(uint256 amount, address l2Recipient) returns (uint256 nonce)",
  "function antb() view returns (address)",
  "function perAddressCap() view returns (uint256)",
  "function globalCap() view returns (uint256)",
  "function totalDeposited() view returns (uint256)",
  "function totalWithdrawn() view returns (uint256)",
  "function depositedBy(address account) view returns (uint256)",
  "function depositCount() view returns (uint256)",
  "function pendingDeposits() view returns (uint256)",
  "function remainingFor(address account) view returns (uint256)",
  "function remainingGlobal() view returns (uint256)",
  "function paused() view returns (bool)",
  "function inbox() view returns (address)",
  "function isAgent(address account) view returns (bool)",
  "event Deposited(address indexed from, address indexed l2Recipient, uint256 amount, uint256 indexed nonce)",
  "event EscrowWithdrawn(address indexed to, uint256 amount)",
  "event CapsUpdated(uint256 perAddressCap, uint256 globalCap)",
  "error ZeroAmount()",
  "error ZeroAddress()",
  "error NotAgent(address account)",
  "error PerAddressCapExceeded(address account, uint256 attempted, uint256 cap)",
  "error GlobalCapExceeded(uint256 attempted, uint256 cap)",
  "error InsufficientEscrow(uint256 requested, uint256 available)",
  "error EnforcedPause()",
]);

// ---------------------------------------------------------------- client --

/** BSC mainnet chain definition (local, so we don't pull the whole viem/chains bundle). */
export const bscChain = defineChain({
  id: BSC_CHAIN_ID,
  name: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: { default: { http: [...BSC_RPCS] } },
  blockExplorers: { default: { name: "BscScan", url: BSCSCAN, apiUrl: "https://api.bscscan.com/api" } },
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11", blockCreated: 15_921_452 } },
});

/** Shared read-only client. `fallback()` rotates to the next RPC on failure. */
export const publicClient = createPublicClient({
  chain: bscChain,
  batch: { multicall: { wait: 16 } },
  transport: fallback(
    BSC_RPCS.map((url) => http(url, { timeout: 8_000, retryCount: 1 })),
    { rank: false },
  ),
});

/** Human-readable mainnet contract list (for Builders / Footer / tables). */
export const BSC_CONTRACT_ROWS = [
  {
    name: "AgentRegistryMirror",
    address: BSC_CONTRACTS.AgentRegistryMirror,
    purpose: "Opt-in registry: Agent ID / BAB holders call register() once; read by AGENT CHAIN infrastructure.",
    deployBlock: BSC_DEPLOY_BLOCKS.AgentRegistryMirror,
  },
  {
    name: "GenesisSeatClaim",
    address: BSC_CONTRACTS.GenesisSeatClaim,
    purpose: "Soulbound ERC-721 'SEAT': claim() once per Agent ID / BAB holder; on-chain SVG; mirrored into L2 genesis.",
    deployBlock: BSC_DEPLOY_BLOCKS.GenesisSeatClaim,
  },
  {
    name: "Bridge",
    address: BSC_CONTRACTS.Bridge,
    purpose: "ANTB deposit side (Beta escrow). deposit(amount, l2Recipient) after ANTB.approve; the Beta relayer credits native ANTB 1:1 on chain 1119, by nonce.",
    deployBlock: BSC_DEPLOY_BLOCKS.Bridge,
  },
] as const;

/** Mirrors contracts/bsc/README.md "Owner permissions". */
export const BSC_OWNER_PERMISSIONS = [
  {
    contract: "all three",
    fn: "setBab(address)",
    why: "BAB is an upgradeable proxy and an alternative credential; owner can enable, rotate or disable it. The Agent ID path is immutable and cannot be turned off.",
    risk: "Can only widen or narrow who counts via BAB. Emits BabUpdated.",
  },
  {
    contract: "all three",
    fn: "transferOwnership / renounceOwnership",
    why: "Hand over to a multisig; renounce to freeze parameters.",
    risk: "Standard OpenZeppelin Ownable two-event flow.",
  },
  {
    contract: "GenesisSeatClaim",
    fn: "pause() / unpause()",
    why: "Stop claims if the Agent ID contract or BAB misbehaves.",
    risk: "Existing seats unaffected.",
  },
  {
    contract: "GenesisSeatClaim",
    fn: "setClaimDeadline(uint256)",
    why: "Close the claim window before genesis is written.",
    risk: "Only blocks new claims; 0 reopens.",
  },
  {
    contract: "Bridge",
    fn: "pause() / unpause()",
    why: "Emergency stop for deposits.",
    risk: "Escrow untouched.",
  },
  {
    contract: "Bridge",
    fn: "setCaps(uint256,uint256)",
    why: "Genesis Deposit window: 0.1 ANTB / address, 100 ANTB total. Raised to 1 / 500 when the Nitro chain is live.",
    risk: "Only affects future deposits.",
  },
  {
    contract: "Bridge",
    fn: "setInbox(address)",
    why: "Placeholder for the real Nitro Inbox.",
    risk: "No effect on funds in this version.",
  },
  {
    contract: "Bridge",
    fn: "withdrawTo(address,uint256)",
    why: "Beta escrow. The Nitro Inbox for AGENT CHAIN is not yet live on BSC, so deposits are held in this contract and credited on L2 from Deposited events. withdrawTo moves escrowed ANTB into the real Inbox once it exists, or returns it to depositors if Beta is wound down.",
    risk: "Trusted step during Beta, bounded by the escrowed balance; every call emits EscrowWithdrawn. Removed when the Inbox replaces this contract.",
  },
] as const;

export const BRIDGE_DISCLOSURES = {
  genesisDeposit:
    "Relayer credit: ANTB deposited here is credited 1:1 as native ANTB on AGENT CHAIN (chain 1119) by the Beta relayer, usually within minutes, in deposit-nonce order.",
  escrow:
    "Beta escrow: Funds are held by the Bridge contract; the owner key can withdraw them (withdrawTo) — see owner permissions.",
  trading:
    "Trading / price risk: ANTB is a tokenized stock whose price moves with the underlying and with DEX liquidity. Bridged ANTB is a gas token on AGENT CHAIN, not an investment. Deposit only what you are prepared to have escrowed under Beta terms.",
  notLive: "Mainnet Beta: single sequencer, BoLD validation, no finalized tag. Withdrawals L2 → BSC go through the Nitro Outbox after assertion confirmation; there is no self-service withdrawal UI yet.",
} as const;
