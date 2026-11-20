/**
 * AGENT CHAIN mainnet (chain 1119) — chain definition, Nitro core contracts on BSC,
 * roles, Beta limits and the BSC-specific engineering notes. Facts from
 * apps/chain/deployments/mainnet/{rollup.json,chain-info.json,LAUNCH-LOG.md} and SPEC §8.
 */
import { defineChain, parseAbi } from "viem";
import { DEVNET, EXPLORER_URL, L2_RPCS, MAINNET } from "./spec";

export const agentChain = defineChain({
  id: MAINNET.chainId,
  name: "AGENT CHAIN",
  nativeCurrency: { name: "ANTB", symbol: "ANTB", decimals: 18 },
  rpcUrls: { default: { http: [...L2_RPCS] } },
  blockExplorers: { default: { name: "AGENT CHAIN Explorer", url: EXPLORER_URL } },
  contracts: {},
});

export const agentChainDevnet = defineChain({
  id: DEVNET.chainId,
  name: "AGENT CHAIN Devnet",
  nativeCurrency: { name: "Test ANTB", symbol: "tANTB", decimals: 18 },
  rpcUrls: { default: { http: [DEVNET.rpc] } },
  blockExplorers: { default: { name: "AGENT CHAIN Devnet Explorer", url: DEVNET.explorer } },
  testnet: true,
});

/** wallet_addEthereumChain params for the mainnet. */
export const MAINNET_CHAIN_PARAMS = {
  chainId: MAINNET.chainIdHex,
  chainName: "AGENT CHAIN",
  nativeCurrency: { name: "ANTB", symbol: "ANTB", decimals: 18 },
  rpcUrls: [MAINNET.rpc],
  blockExplorerUrls: [MAINNET.explorer],
} as const;

export const l2Tx = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;
export const l2Block = (n: number | bigint) => `${EXPLORER_URL}/block/${n}`;

/** JSON-RPC error returned by the Agent ID gateway for non-agent senders. */
export const GATEWAY_NOT_AGENT_CODE = -32050;

// ------------------------------------------------------------ BSC core --

export const NITRO = {
  Rollup: "0x0EE1Db14CC85d5151C6E54711ED7423b90F9EF85",
  Inbox: "0x09A1f23Dc51088949bc043D6A3362d46dEE9b5b6",
  SequencerInbox: "0x165108EcA9Fd180328856c0FE518F2BCAb5bd7E8",
  Bridge: "0x337B50dB3A8b2EF587fd4AB47cF27C2A960b9dFd",
  Outbox: "0x763a4E77d0d0E300dba7527C402947aC86fc6fB3",
  UpgradeExecutor: "0x6B338a6b72fcED9306585aC2586664192958EF1B",
  ChallengeManager: "0x1E3256Fd2ACde0086f3B9c688Ea82C9742140179",
  RollupCreator: "0xdb5E51Af6d4Ff89584912818b762c6a7F3c68D70",
  FeeTokenPricer: "0x132fa6bcc47d0dd51e93d6bde0cb8ee4ca8252aa",
  StakeToken: "0xbb4CdB9CBd36B01bD1cBaEbF2De08d9173bc095c", // WBNB
} as const satisfies Record<string, `0x${string}`>;

export const ROLES = {
  chainOwner: "0x8D61bD807Da29C71eAbA6e85Fc42796E357fA443",
  batchPoster: "0xC7b182073535A8aA849b304Caf834f81aD0F253F",
  validator: "0xc33dCf1d3314506B0f4b06E20bEdC7690c53e78F",
  sequencer: "0xc464b85A4124CA92168ed865078514850b3C1072",
} as const;

export const LAUNCH = {
  createRollupTx: "0xd99b52c896685fe301f6bac7b6b0c60ff49546c931f1177473fd152959fa115f",
  createRollupBlock: 134_648_658,
  baseStakeWbnb: "0.02",
  date: "2026-11-20",
  relayerStatusUrl: "https://agentchain-relayer.fly.dev/status",
  researchUrl: "https://github.com/imadegoodstuff/agent-chain/blob/main/apps/chain/RESEARCH.md",
  repoUrl: "https://github.com/imadegoodstuff/agent-chain",
} as const;

export const NITRO_ROWS = [
  { name: "Rollup (BoLD)", address: NITRO.Rollup, purpose: "Assertion chain and stakes. Validators post assertions; challenges go to ChallengeManager." },
  { name: "Inbox", address: NITRO.Inbox, purpose: "Delayed inbox: L1→L2 messages, retryables and the canonical native-token deposit path (ERC20Inbox)." },
  { name: "SequencerInbox", address: NITRO.SequencerInbox, purpose: "Batch poster publishes L2 transaction batches here (calldata on BSC). batchCount() = batches posted." },
  { name: "Bridge (Nitro)", address: NITRO.Bridge, purpose: "Message accumulator and ANTB escrow for the canonical bridge; sequencerMessageCount() / delayedMessageCount()." },
  { name: "Outbox", address: NITRO.Outbox, purpose: "Executes L2→BSC withdrawals after an assertion is confirmed." },
  { name: "UpgradeExecutor", address: NITRO.UpgradeExecutor, purpose: "Only address allowed to upgrade / reconfigure the core contracts; controlled by the chain owner." },
  { name: "ChallengeManager", address: NITRO.ChallengeManager, purpose: "BoLD edge challenge protocol; resolves disputes between assertions." },
  { name: "RollupCreator (ours)", address: NITRO.RollupCreator, purpose: "BSC-patched nitro-contracts factory that created the chain (createRollup tx below)." },
  { name: "Fee-token pricer", address: NITRO.FeeTokenPricer, purpose: "OwnerAdjustableExchangeRatePricer: ANTB-wei per BNB used to charge L1 gas in ANTB." },
] as const;

export const ROLE_ROWS = [
  {
    role: "Chain owner",
    address: ROLES.chainOwner,
    powers: "ArbOwner precompile on L2 (base fee, L1 pricing params, infra fee account) and, through UpgradeExecutor, every core-contract upgrade and parameter on BSC. Also the L2 infra fee account.",
    disclosure: "Single EOA today; migration to a Safe multisig is planned before caps are lifted.",
  },
  {
    role: "UpgradeExecutor",
    address: NITRO.UpgradeExecutor,
    powers: "Executes upgrades to Rollup, Inbox, SequencerInbox, Bridge, Outbox and ChallengeManager. Executor role = chain owner.",
    disclosure: "Standard Arbitrum pattern; no timelock in Beta.",
  },
  {
    role: "Batch poster",
    address: ROLES.batchPoster,
    powers: "Posts transaction batches to SequencerInbox. Cannot alter state, only order what the sequencer produced. Receives the L1 pricing reward.",
    disclosure: "Hot key on the node (Fly, sin).",
  },
  {
    role: "Validator",
    address: ROLES.validator,
    powers: "Posts BoLD assertions and challenges invalid ones. Staked 0.02 WBNB. One honest validator is enough for safety.",
    disclosure: "Permissioned set of one during Beta; external validators in Phase 4.",
  },
  {
    role: "Sequencer",
    address: ROLES.sequencer,
    powers: "Orders transactions (FCFS, 250 ms blocks) and signs preconfirmations. Enforces the Agent ID gate at the gateway. Can delay but not forge; force-inclusion via the delayed Inbox after the delay window.",
    disclosure: "Single sequencer in Singapore (liveness assumption, not safety).",
  },
] as const;

export const BETA_LIMITS = [
  "Single sequencer (Singapore). If it stops, force-inclusion through the delayed Inbox still works.",
  "No `finalized` / `safe` block tags on the L2 RPC — BSC exposes no finality to Nitro; use `latest`.",
  "Bridge deposits (0x9eF8CA94…) are credited on L2 by the Beta relayer within minutes, ordered by nonce — not atomically.",
  "Bridge caps 0.1 ANTB per address, 100 ANTB total during Beta; owner can raise to 1 / 500.",
  "Chain owner and fee account are one EOA; Safe migration planned.",
  "No self-service withdrawal UI yet; L2→BSC exits go through the Nitro Outbox after assertion confirmation.",
  "Non-agent senders are rejected at the gateway with JSON-RPC error -32050.",
] as const;

export const BSC_FINDINGS = [
  {
    title: "ArbitrumChecker vs. BSC address 0x64",
    body:
      "nitro-contracts probes address 0x64 (ArbSys) to detect whether it runs on an Arbitrum chain. On BSC, 0x64 is a retired precompile that fails and burns every unit of forwarded gas, so stock contract deployment hit \"contract creation code storage out of gas\". We rebuilt 5 contracts with a 100k gas cap on the probe — byte-identical otherwise (see RESEARCH §7.12).",
    bodyZh:
      "nitro-contracts 通过探测地址 0x64（ArbSys）判断是否运行在 Arbitrum 链上。BSC 上的 0x64 是一个已退役的预编译合约，调用会失败并烧光转发的全部 gas，导致原版合约部署报 “contract creation code storage out of gas”。我们给探测调用加了 100k gas 上限并重建了 5 个合约——其余字节完全一致（见 RESEARCH §7.12）。",
  },
  {
    title: "BSC has no finality signal for Nitro",
    body:
      "Nitro treats a parent chain with difficulty ≠ 0 as having no finality, so the BoLD staker looped on batch-finality checks and hammered the RPC. We run with check-batch-finality=false and parent-chain-block-time=450ms (BSC Maxwell); safety still rests on BoLD, liveness on the single sequencer (RESEARCH §7.13).",
    bodyZh:
      "Nitro 把 difficulty ≠ 0 的父链视为没有最终性，BoLD staker 因此在批次最终性检查上死循环并打爆 RPC。我们以 check-batch-finality=false、parent-chain-block-time=450ms（BSC Maxwell）运行；安全性仍由 BoLD 保证，活性依赖单排序器（RESEARCH §7.13）。",
  },
] as const;

// ---------------------------------------------------------------- ABIs --

export const nitroBridgeAbi = parseAbi([
  "function sequencerMessageCount() view returns (uint256)",
  "function delayedMessageCount() view returns (uint256)",
  "function sequencerInbox() view returns (address)",
]);

export const sequencerInboxAbi = parseAbi(["function batchCount() view returns (uint256)"]);

export const pricerAbi = parseAbi(["function getExchangeRate() view returns (uint256)"]);

export const rollupAbi = parseAbi(["function baseStake() view returns (uint256)", "function latestConfirmed() view returns (bytes32)"]);
