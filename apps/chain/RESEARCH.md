# AGENT CHAIN L2 on BSC — research & deployment design

Status: **mainnet launched 2026-11-20** (chain 1119 on BSC 56; see README and `deployments/mainnet/LAUNCH-LOG.md`). The local dry run (Hardhat "fake BSC") missed two BSC behaviours that only show on the real chain — §7.12 (retired precompile at `address(100)` burns all gas → nitro-contracts needed a one-line patch and a rebuild) and §7.13 (Nitro treats BSC as a chain without finality because `header.difficulty != 0`). Both are fixed in the repo; costs in §4 were confirmed within 2 % (73.45M gas for the factory set, 7.96M for `createRollup`).

Everything below follows `../../SPEC.md`. Where the stack forces a deviation it is called out in §9.

---

## 1. Versions chosen

| Component | Choice | Why / source |
|---|---|---|
| Nitro node image | `offchainlabs/nitro-node:v3.12.4-960ca0a-stripped` (released 2026-11-19; `-stripped` = binaries without debug symbols, 644 MB) | Latest stable; fixes JSON-RPC decode stall that blocked block production under bursts. Verified on Fly remote build that `/home/user/target/machines` contains consensus v50, v51, v51.1 **and v61** replay machines. [Releases](https://github.com/OffchainLabs/nitro/releases), [Docker Hub](https://hub.docker.com/r/offchainlabs/nitro-node/tags) |
| ArbOS version | **61 "Elara"** (`InitialArbOSVersion: 61`) | Final since 2026-06; live on Arbitrum One/Nova since 2026-08-20 (> 4-week safety buffer recommended by OCL). Needs Nitro ≥ 3.11.3. Brings Stylus 96 KB contracts, priority-fee collection (kept off: "tips off"), compliance filtering hooks. [ArbOS 61 page](https://docs.arbitrum.io/run-arbitrum-node/arbos-releases/arbos61) |
| WASM module root | `0xc10cd7ec6acaf1c441a3f6bd0900ad20f15855ba775a96f1939118cbc629dc97` (consensus-v61) | Same hash as `consensus-v61-rc.2` in the Nitro `Dockerfile`; the docs mark it final. Present in the image (see above). |
| Parent-chain contracts | `@arbitrum/nitro-contracts` **v3.2.0** (2026-01-22) | BoLD challenge protocol, custom-DA interface, deterministic factory deployment, `increase/decreaseBaseStake`. v3.1.0 is the minimum for *custom-gas-token rollup mode* (fee-token pricer). [Release](https://github.com/OffchainLabs/nitro-contracts/releases/tag/v3.2.0) |
| Deployment SDK | `@arbitrum/chain-sdk` **0.28.0** (npm, 2026-09-11; renamed from `@arbitrum/orbit-sdk`, whose last release is 0.26.0) | 0.28 added exactly what BSC needs: `deployRollupCreator`, `deployWeth`, `deployTokenBridgeCreator`, `registerCustomParentChain`, RollupCreator v3.2 ABIs, consensus-v61 root. Peer dep viem `^1.20` (we use 1.21.4 for scripts; the gateway uses viem 2.x separately). [Releases](https://github.com/OffchainLabs/arbitrum-chain-sdk/releases) |
| Parent chains | BSC Testnet (97) → BSC Mainnet (56) | Measured 2026-11-20 via public RPC: block time **0.450 s** (mainnet) / 0.452 s (testnet); `baseFeePerGas = 0`; gas price 0.05 gwei (mainnet) / 0.1 gwei (testnet); block gas limit 79.8M (mainnet) / 99.7M (testnet); `finalized`/`safe` tags supported; `eth_feeHistory` OK. |
| Gas token | mainnet **ANTB** `0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53`; testnet **tANTB** (`contracts/TestANTB.sol`, we deploy) | ANTB on-chain probe (§7.4): 18 decimals, 1:1 non-rebasing, `transfer(self, 0)` returns true — meets Nitro's custom-gas-token requirements. |
| Stake token (BoLD) | WBNB — mainnet `0xbb4CdB9CBd36B01bD1cBaEbF2De08d9173bc095c`, testnet `0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd` | Nitro requires an ERC-20 stake token; WBNB is the canonical wrapped native. Base stake **0.02 WBNB (mainnet Beta, was planned as 1)** / 0.01 (testnet); permissioned validators, so the stake is a liveness bond. `BOLD_BASE_STAKE` env overrides; raise later via `increaseBaseStake`. |
| Parent-chain contracts on BSC | v3.2.0 with **one patched library** (`nitro-bsc/patches/ArbitrumChecker.sol`) in SequencerInbox, RollupAdminLogic, RollupUserLogic, RollupEventInbox, ERC20RollupEventInbox | Required by §7.12. All other 21 contracts are byte-identical to the upstream artifacts (verified by recompiling with upstream solc 0.8.17 / london / runs 2000·20·200 and diffing). |
| Hosting | Fly.io `sin`, `fly deploy --remote-only`; node `shared-cpu-4x` 4 GB + 50 GB volume; gateway `shared-cpu-1x` 512 MB | Both images build successfully with `fly deploy --remote-only --build-only` (gateway 53 MB, node 644 MB). |

### Important correction to the brief
**nvdachain.com is not a BSC rollup.** Its own site says it is "an L3 rollup … settles to Robinhood Chain, an Ethereum L2" with NVDA stock token as gas (Robinhood Chain is an Arbitrum chain, and chain-sdk 0.28 ships Robinhood Chain as a built-in parent). So there is no public precedent for Nitro settling to BSC; the feasibility case rests on the facts below (all verified on-chain or in source), not on a reference deployment.

---

## 2. Is a Nitro rollup on BSC feasible? — what we verified

1. **Custom parent chain is first-class in the SDK**: `createRollupPrepareDeploymentParamsConfig` accepts any `Chain`; for a non-built-in parent it *requires* the block-time-dependent params (`confirmPeriodBlocks`, `challengeGracePeriodBlocks`, `minimumAssertionPeriod`, `validatorAfkBlocks`, `sequencerInboxMaxTimeVariation`) and `maxDataSize` to be passed explicitly. `registerCustomParentChain()` carries `rollupCreator`/`weth` addresses. `prepareNodeConfig` requires `parentChainIsArbitrum` for custom parents. (Read from `node_modules/@arbitrum/chain-sdk/dist/*.js`.)
2. **No canonical RollupCreator on BSC** (canonical list: Ethereum, Arbitrum One/Nova, Base, Sepolia, Arb Sepolia, Base Sepolia). The docs say non-canonical factories are "unsupported" but describe how to deploy them; chain-sdk 0.28 ships `deployRollupCreator` = viem port of nitro-contracts `scripts/deploymentUtils.ts`. We dry-ran it: **27 transactions, 73.6M gas**, largest single deploy 5.33M gas (RollupCreator). [Canonical factory docs](https://docs.arbitrum.io/launch-arbitrum-chain/deploy/canonical-factory-contracts)
3. **`createRollup` works and fits BSC's per-tx gas cap** (§7.1): measured **7,762,260 gas used**; it succeeds with an explicit gas limit as low as 8M. We send with 12M.
4. **Custom gas token in *rollup* (calldata) mode** is supported since nitro-contracts v3.1.0 but **requires a fee-token pricer** — `createRollupPrepareTransactionRequest` throws `"params.feeTokenPricer" must be provided for a custom gas token rollup chain` otherwise, and `SequencerInbox.submitBatchSpendingReport` returns early when `isUsingFeeToken && pricer == 0` (no reports → L1 fees never disbursed). We deploy `contracts/OwnerAdjustableExchangeRatePricer.sol` (`getExchangeRate()` = ANTB-wei per BNB, 18 dec). [Custom gas token rollup docs](https://docs.arbitrum.io/launch-arbitrum-chain/chain-config/costs/custom-gas-token-rollup)
5. **Nitro node vs BSC RPC surface**: Nitro needs `eth_getBlockByNumber(finalized|safe)`, `eth_feeHistory`, `eth_getLogs`, EIP-1559 txs. BSC supports all (fast finality since Luban 2023; Fermi 2026 tightened it). Blob reader must be disabled (`node.dangerous.disable-blob-reader: true`, as the SDK does for non-Ethereum parents); sequencer backlog pricing must be `CalldataPrice` (default `BlobPrice` silently falls back). [Sequencer config ref](https://docs.arbitrum.io/launch-arbitrum-chain/chain-config/sequencer/sequencer-config-reference)
6. **Batch size vs BSC tx size**: BSC (geth) tx size limit is 128 KiB; Nitro's `max-calldata-batch-size` default 100,000 B + ABI overhead fits. `maxDataSize = 117964` (the "parent is an L1" value) is used both in the factory templates and in `createRollup` (they must match).
7. **250 ms blocks** are Nitro's default (`execution.sequencer.max-block-speed` default `250ms`); no deviation needed. Nitro does not produce empty blocks, so an idle chain posts nothing.

---

## 3. Deployment procedure (testnet, then mainnet)

All scripts are in `scripts/` (TypeScript, Node 20, `npx tsx`), read `.env` (gitignored), and write JSON to `deployments/<network>/`. Exact commands are in `README.md`. The procedure is identical for testnet and mainnet except for `NETWORK=` and the gas token.

| # | Step | Script / command | Output |
|---|---|---|---|
| 0 | Generate keys (chain owner, batch poster, validator, sequencer) | `npm run keys:generate` | `.env` (keys), `keys/ADDRESSES.md` |
| 1 | Fund chain owner (BNB + gas token), batch poster (BNB), validator (BNB + WBNB) | manual | — |
| 2 | *(testnet only)* deploy tANTB | `npm run deploy:tantb` | `tokens.json`, `TANTB_ADDRESS` |
| 3 | Deploy fee-token pricer (ANTB per BNB) | `npm run deploy:pricer` | `tokens.json#feeTokenPricer` |
| 4 | Deploy the nitro-contracts v3.2.0 factory set (27 txs) | `npm run deploy:creator` | `creator.json` |
| 5 | `RollupCreator.createRollup` (1 approve + 1 tx, gas limit 12M) | `npm run create:rollup` | `rollup.json`, `config/chain-config.<net>.json` |
| 6 | Produce `chain-info.json` + node config | `npm run write:chain-info` | `chain-info.json`, prints `fly secrets set …` |
| 7 | Fly: create volume, set secrets, deploy node | `fly volumes create …`, `fly secrets set …`, `fly deploy --remote-only` | node running |
| 8 | Fly: deploy gateway | `cd gateway && fly deploy --remote-only` | public RPC |
| 9 | Bridge gas token to the chain owner on L2 | `npx tsx scripts/deposit-native.ts 2` | L2 balance |
| 10 | Set ArbOS params (min base fee, L1 reward, fee accounts) | `npm run set:l2-params` | on-chain |
| 11 | Smoke test | `npm run smoke` | PASS/FAIL |

Alternative for step 4 (official Hardhat path, equivalent output): clone `OffchainLabs/nitro-contracts` at `v3.2.0`, `yarn install && yarn build:all`, set `CUSTOM_RPC_URL/CUSTOM_PRIVKEY/CUSTOM_CHAINID` in `.env`, `maxDataSize = 117964` in `scripts/config.ts`, then `yarn deploy-factory --network custom`. We use the SDK port because it runs with plain viem on Windows without a Hardhat toolchain.

Not in scope for Phase 1 but required later: **TokenBridgeCreator** (`deployTokenBridgeCreator` + `createTokenBridge`) for ERC-20 bridging and the L2 `UpgradeExecutor`; the native-token bridge (ANTB deposits) already exists after step 5 (`ERC20Inbox.depositERC20`). The **mainnet genesis snapshot** (Genesis Seats + ANTB balances in block 0, SPEC §1) uses Nitro's `genesis-generator` (bundled in the chain-sdk Docker image as `generateGenesis`) and `init.genesis-json-file`; it changes `genesisAssertionState`/`genesisBlockNum` in the createRollup config and must be done *before* step 5 on mainnet.

---

## 4. Cost estimate (BNB)

Prices used: BNB ≈ $565, ANTB ≈ $97.17 (SPEC), BSC mainnet gas price 0.05 gwei, testnet 0.1 gwei. Gas numbers are **measured** on the local dry run (identical bytecode).

### One-time (mainnet)
| Item | Gas | BNB @0.05 gwei | USD |
|---|---|---|---|
| Factory set (26 deploys, incl. Reader4844, 12 templates, 4 OSP + entry, EdgeChallengeManager, logic, UpgradeExecutor, ValidatorWalletCreator, DeployHelper, RollupCreator) | 72,860,182 | 0.00364 | $2.06 |
| Fee-token pricer | 234,888 | 0.00001 | $0.01 |
| ERC-20 approve | ~46,000 | 0.000002 | — |
| `createRollup` | 7,762,260 | 0.00039 | $0.22 |
| Retryable fees for L2 factory deployment (paid in gas token) | — | **0.1248 ANTB** (SDK constant for custom-gas-token chains) | ≈ $12.1 |
| **Total** | ≈ 80.9M | **≈ 0.0041 BNB + 0.1248 ANTB** | ≈ $14.5 |

Fund the chain owner with **0.15 BNB** (≥ 30× margin for a gas-price spike to ~1 gwei) and **0.2 ANTB**. Testnet: same gas at 0.1 gwei → ≈ 0.0081 tBNB; fund 0.5 tBNB from the faucet.

### Recurring (mainnet)
| Item | Per unit | Notes |
|---|---|---|
| Full calldata batch (100 KB brotli, mostly non-zero bytes) | ≈ 1.7M gas → 0.000085 BNB ≈ **$0.048** | ≈ 700–900 simple txs per batch → ≈ $0.00006 L1 cost per tx. SPEC's $0.001 transfer fee covers it ~16×. |
| Small batch (few txs) | ≈ 100k gas → $0.003 | `max-delay 1m` on mainnet; no batches when idle (Nitro makes no empty blocks). |
| BoLD assertion | ≈ 0.4–0.6M gas → ≈ $0.015 | `assertion-posting-interval` 1 h mainnet (≈ $0.36/day), 15 min testnet. Confirmations ≈ 150k gas each. |
| **Idle chain** | **≈ 0.001 BNB/day (≈ $0.5)** | assertions only |
| **Busy chain (1 tx/s)** | ≈ 100 full batches/day → 0.0085 BNB/day (≈ $4.8) + assertions | fully recovered via L1 pricing reward (§6) |
| Fly node (shared-cpu-4x, 4 GB) + 50 GB volume | ≈ $35–45 / month | add a dedicated BSC RPC (NodeReal/QuickNode) ≈ $0–50 / month — public dataseeds **disable `eth_getLogs`** which the inbox reader needs. |
| Fly gateway (shared-cpu-1x, 512 MB) | ≈ $3 / month | |

Keep the batch poster at ≥ 0.1 BNB and top up monthly; validator ≥ 0.05 BNB + 1.1 WBNB.

---

## 5. Chain config and node config (what and why)

### `config/chain-config.<net>.json` (Nitro genesis parameters, embedded in `chainConfig` of createRollup)
Generated with `prepareChainConfig` (key order matters — Nitro hashes the string):
- `chainId`: 111900 (testnet) / 1119 (mainnet)
- `arbitrum.EnableArbOS: true`, `InitialArbOSVersion: 61`, `DataAvailabilityCommittee: false` (rollup / calldata), `InitialChainOwner`: chain owner EOA `0x8D61bD807Da29C71eAbA6e85Fc42796E357fA443`, `MaxCodeSize: 24576`, `MaxInitCodeSize: 49152`, `GenesisBlockNum: 0`, `AllowDebugPrecompiles: false`; all Ethereum fork blocks at 0.

### RollupCreator params (`scripts/lib/params.ts`), scaled to BSC's 0.45 s blocks
| Param | Testnet | Mainnet | Formula |
|---|---|---|---|
| `confirmPeriodBlocks` | 8,000 (1 h) | 1,344,000 (7 d) | SDK uses 7 d mainnet / 30 min testnet |
| `challengeGracePeriodBlocks` | 192,000 (1 d) | 384,000 (2 d) | SDK: 2 d |
| `minimumAssertionPeriod` | 2,000 (15 min) | 2,000 | SDK: 15 min |
| `validatorAfkBlocks` | 5,376,000 (28 d) | 5,376,000 | SDK: 28 d |
| `sequencerInboxMaxTimeVariation` | delay 768,000 blk / 345,600 s; future 8,000 blk / 3,600 s | same | SDK: 4 d / 1 h |
| `baseStake` | 0.01 WBNB | **0.02 WBNB** (Beta; `BOLD_BASE_STAKE` override) | permissioned validators → liveness bond, raise with `increaseBaseStake` |
| `miniStakeValues` | [0, 1, 1] | same | SDK default |
| `wasmModuleRoot` | consensus-v61 | same | |
| `maxDataSize` | 117,964 | same | L1-parent value |
| `feeTokenPricer` | deployed | deployed | mandatory |
| `deployFactoriesToL2` | true | true | CREATE2 factories at canonical addresses on L2 |

### `config/node-config.<net>.json` (one node = sequencer + batch poster + validator)
Key choices (all key names checked against the [CLI flags reference](https://docs.arbitrum.io/run-a-node/nitro/cli-flags-reference)):
- `chain.info-files: ["/home/user/.arbitrum/chain-info.json"]` — the entrypoint writes the `CHAIN_INFO_JSON` secret there; `parent-chain.id` 97/56; `parent-chain-is-arbitrum: false` in chain info.
- `node.sequencer: true`, `node.dangerous.no-sequencer-coordinator: true` (single sequencer), `execution.sequencer.max-block-speed: 250ms`, `expected-surplus-gas-price-mode: CalldataPrice`.
- `node.dangerous.disable-blob-reader: true`, `node.batch-poster.post-4844-blobs: false` — BSC has no EIP-4844 blob *reading* for Nitro batches (BEP-657 limits blob txs anyway).
- Batch poster: `max-calldata-batch-size 100000`, `max-delay 2m/1m`, `poll-interval 10s/5s`, `l1-block-bound: latest`; data poster `min-tip-cap-gwei 0.1 (testnet) / 0.05 (mainnet)` — BSC's price is the *priority fee* (base fee is 0), `max-tip-cap-gwei 5/3`, `target-price-gwei 1`, `wait-for-l1-finality: true` (BSC finality ≈ 2 blocks).
- Delayed sequencer: `use-merge-finality: true` (uses BSC's `finalized` tag), `finalize-distance 20` (fallback).
- Staker: `enable: true`, `strategy: MakeNodes`, EOA wallet; `node.bold.assertion-posting-interval 15m/1h`; `node.bold.parent-chain-block-time 450ms` (default 12 s would schedule confirmations 27× too late); `node.bold.state-provider-config.check-batch-finality false` (§7.13); `node.block-validator.enable: true` (in-process JIT validation; the `-stripped` image has the machines).
- Inbox reader `max-blocks-to-read 2000` — below the 5,000-block `eth_getLogs` range limit of BSC clients (`--rpc.rangelimit` default 5000).
- HTTP 8547 (`eth,net,web3,arb,txpool,debug`), WS 8548, feed 9642. `execution.caching.archive`: false on testnet, true on mainnet (explorer traces).
- Secrets are substituted by `node/entrypoint.sh` with `envsubst` restricted to our variables; `SEQUENCER_SENDER_WHITELIST` is appended as a CLI flag only when set (an empty JSON array would block everyone).

---

## 6. L1 pricing on BSC — the base-fee-is-zero problem and the fix

Nitro's parent-chain fee recovery works like this: `SequencerInbox` emits a *batch spending report* containing `block.basefee` (× the fee-token pricer rate for custom-gas-token chains); ArbOS computes `cost = reportedBaseFee × dataGas`, credits the batch poster, and moves the per-unit L1 price toward equilibrium between fees collected and costs reported.

**On BSC `block.basefee` is always 0** (verified: `baseFeePerGas: 0x0` on mainnet and testnet; the 0.05 gwei is pure priority fee). Therefore every spending report says the batch cost 0, the dynamic L1 price decays to ~0, and the batch poster is never reimbursed for the BNB it actually spends. Multiplying 0 by any exchange rate does not help, so the pricer alone cannot fix it.

Fix (all chain-owner precompile calls, implemented in `scripts/set-l2-params.ts`):
1. Keep a non-zero fee-token pricer so reports are *sent* (they still trigger the L1 pricer update, which is what pays rewards).
2. `ArbOwner.setL1PricingRewardRate(weiPerUnit)` — a fixed ANTB-wei charge per L1 data unit (≈ one compressed byte × 16 gas), independent of the reported base fee: `rate = bscGasPriceWei × (BNB_USD / ANTB_USD) × 1.25` → at 0.05 gwei, $565/$97.17: **≈ 3.63e8 ANTB-wei/unit** (≈ $0.00008 per simple transfer, vs. actual BNB cost ≈ $0.00006).
3. `ArbOwner.setL1PricingRewardRecipient(opsWallet)` — the wallet that refills the batch poster's BNB (defaults to the batch poster itself).
4. `ArbOwner.setL1PricePerUnit(rate)` as the starting estimate, `setPerBatchGasCharge(27000)` (fixed per-batch overhead).
5. Re-tune when BNB/ANTB moves (fee keeper job, SPEC §3 cadence).

Also set: `setMinimumL2BaseFee` = `0.045e-6 USD/gas ÷ ANTB_USD` → **463,105,382 wei at $97.17** (SPEC: ≈ 463,105,000), `setL2BaseFee` to the same floor, `setNetworkFeeAccount`/`setInfraFeeAccount` to the treasury that performs the 40/40/20 split, speed limit 7M gas/s, max tx gas 32M (Nitro defaults).

---

## 7. Known risks

### 7.1 BSC EIP-7825 per-transaction gas cap (16,777,216) — handled
BSC's **Mendel** hard fork (2026-04-28, BEP-652) enforces EIP-7825 on mainnet and testnet. `eth_estimateGas` for `createRollup` returns ~23.3M (estimation artefact; measured usage 7.76M), so the SDK's stock `createRollup()` (estimate → send) would be **rejected by BSC**. `create-rollup.ts` therefore uses `createRollupPrepareTransactionRequest` with an explicit `gasLimit = 12,000,000` (validated locally: succeeds at ≥ 8M). All 26 factory deploys are ≤ 5.34M. Future nitro-contracts versions must be re-checked against the cap. [BEP-652](https://github.com/bnb-chain/BEPs/blob/master/BEPs/BEP-652.md)

### 7.2 Zero base fee → no automatic L1 cost recovery — handled by §6
Operational consequence: the batch poster's BNB is refilled from the reward recipient, not by ArbOS. Monitor `ArbGasInfo.getL1RewardRate()` and the batch poster balance.

### 7.3 `block.number`-based timing on a 0.45 s chain
BoLD and the SequencerInbox count *parent blocks*. All block parameters are scaled (§5). `uint64` fields are fine (max 1.3M). If BSC changes block time again (Jenner hard fork WIP), `confirmPeriodBlocks` etc. change meaning (shorter block time = shorter challenge period) — re-evaluate and use `setConfirmPeriodBlocks` via the UpgradeExecutor.

### 7.4 ANTB token behaviour (issuer control)
On-chain probe of `0x38Dd…Fc53` (2026-11-20): **beacon proxy** (beacon `0x156d…93a3`, implementation `0xcfed…4e46`, beacon owner `0x4333…8d0c`), AccessControl, `burn(uint256)`, 18 decimals, no `pause/blacklist/freeze` selectors found, self-transfer of 0 succeeds. Risks: the issuer can **upgrade** the token (could add transfer restrictions or blocklist the `ERC20Bridge` escrow); bStocks are restricted for US persons — the bridge contract holding ANTB is not a "person" but issuer policy is not under our control. Mitigation: bridge caps during Beta (SPEC), monitor `Upgraded` events on the beacon, keep the pricer/exchange-rate honest, and have a documented exit (ERC20MigrationOutbox exists in v3.1.1+).

### 7.5 Public BSC RPCs are not enough for the node
`bsc-dataseed.*` endpoints **disable `eth_getLogs`** and rate-limit at 10k/5 min; the Nitro inbox reader and staker need logs. Use a dedicated provider (NodeReal, QuickNode, publicnode) as `PARENT_CHAIN_RPC_URL`; keep `max-blocks-to-read ≤ 2000`.

### 7.6 Single node = single point of failure
Sequencer, batch poster and validator share one Fly machine and one volume. Acceptable for Phase 1; for mainnet add a separate validator (watchtower → MakeNodes), a feed relay, and snapshots of the volume (`fly volumes snapshots`). Memory: 4 GB is the floor; block validation with JIT may need 8 GB under load.

### 7.7 Non-canonical factories are "unsupported" by Offchain Labs
Upgrades (ArbOS/consensus) will have to be executed by us with the SDK's upgrade actions against our own `RollupCreator`-deployed contracts; `getNitroContractVersions` in chain-sdk helps. No OCL support SLA.

### 7.8 Arbitrum Expansion Program (AEP) — 10 % of Protocol Net Revenue
Chains not settling to Arbitrum One/Nova must pay 10 % of **net** protocol revenue (gross fees minus settlement costs = `l1BaseFee` share) to the Arbitrum Foundation. For a **non-Ethereum L1 parent the automatic fee router cannot be used; fees must be transferred manually** to a Foundation-controlled address, with periodic reporting. Budget it in the 20 % operations share (SPEC §1). [AEP terms](https://docs.arbitrum.foundation/aep/ArbitrumExpansionProgramTerms.pdf), [fee formula](https://docs.arbitrum.foundation/calculate-aep-fees)

### 7.9 Fee-token retryable constant
Custom-gas-token chains pay a fixed **0.1248 gas tokens** for the L2 factory retryables at `createRollup`; the deployer must hold ≥ that amount of ANTB *on BSC* before step 5 (the script checks).

### 7.10 Re-running `createRollup` with identical params reverts
`RollupProxy` is deployed with CREATE2 and `salt = keccak256(deployParams)`; a byte-identical retry hits an address collision and reverts without reason. Change a parameter (e.g. `chainId` on local, or owner/validator set) to redeploy. Observed on the dry run.

### 7.11 Preconfirmation receipts and "no public mempool"
Nitro's sequencer has no mempool to expose (FCFS queue) but does not sign per-tx receipts. The SPEC's signed preconfirmation is a gateway feature (sign `{txHash, seqNo, timestamp}` with `SEQUENCER_PRIVATE_KEY` once the sequencer accepts the tx) — not implemented in this pass; the `node.feed.output` (port 9642) already streams sequenced txs for Phase 3.

### 7.12 `address(100)` is a retired BSC precompile that burns all forwarded gas — nitro-contracts must be patched (found on mainnet, fixed)
nitro-contracts v3.2.0 detects "am I on an Arbitrum chain?" with `ArbitrumChecker.runningOnArbitrum()`: `address(100).staticcall(abi.encodeWithSelector(ArbSys.arbOSVersion.selector))`, forwarding **all** remaining gas. On Ethereum `0x…64` is an empty account (call returns `ok=true`, empty data → "not Arbitrum"). On BSC `0x…64` is the Beacon-chain-era `tmHeaderValidate` precompile, which since its deprecation fails with the error `"deprecated"` — and the EVM consumes every unit of gas forwarded to a failing precompile (only explicit `REVERT` refunds). The probe therefore burns 63/64 of the caller's gas:
- `SequencerInbox`, `RollupCore` (→ `RollupAdminLogic`, `RollupUserLogic`) call it in the **constructor** (immutable `hostChainIsArbitrum`): deploying needs ≥ 64 × code-storage gas ≈ 280M > the 16,777,216 cap. Observed: `eth_estimateGas` → "contract creation code storage out of gas" (dataseed/NodeReal) / "gas required exceeds 16777216" (publicnode); the first `deploy:creator` attempt aborted there after Reader4844 + Bridge (0.00008 BNB lost).
- `RollupEventInbox.rollupInitialized()` / `ERC20RollupEventInbox` call it at **runtime inside `createRollup`**, which would have starved the rest of the 12M-gas tx.
- The local Hardhat dry run cannot show this (0x64 is empty there); the SDK's own `isRunningOnArbitrum` probe also breaks on BSC (eth_call returns the `deprecated` error instead of empty data) — the BSC port skips the probe (BSC is never Arbitrum).

Fix: `nitro-bsc/patches/ArbitrumChecker.sol` caps the probe at `staticcall{gas: 100_000}` (semantics unchanged on real Arbitrum parents; on BSC it returns `false` after burning ≤ 100k). `scripts/build-nitro-bsc.ts` copies `@arbitrum/nitro-contracts/src`, swaps the library, compiles with the upstream settings and writes the 5 affected artifacts to `nitro-bsc/artifacts-bsc/` (+5 bytes each, all < 24,576 B). Verified: unpatched contracts compile byte-identical to the upstream artifacts; patched SequencerInbox deploys in 4.86M gas. `scripts/lib/deploy-rollup-creator-bsc.ts` is a resumable port of the SDK's `deployRollupCreator` using these artifacts. Consequence: the AGENT CHAIN templates are not the canonical v3.2.0 bytecode — document this in any audit / BscScan verification (source = upstream v3.2.0 + the one-line library change). Any future nitro-contracts upgrade on BSC needs the same patch (grep for `ArbitrumChecker` and `address(100)`).

### 7.13 Nitro thinks BSC has no finality (`header.difficulty != 0`) — BoLD staker and finality tags (found on mainnet, mitigated)
`util/headerreader.HeaderIndicatesFinalitySupport()` returns true only for PoS Ethereum (`difficulty == 0`) or Arbitrum headers. BSC/Parlia headers carry `difficulty` 1 or 2, so every `LatestFinalizedBlockNr`/`LatestSafeBlockNr` call fails with `block number not supported: finalized block not found` even though the RPC answers `finalized`/`safe` correctly. Effects and mitigations:
- **BoLD staker** (`check-batch-finality` default true) could never post an assertion and retried in a tight loop (~5 attempts/s, each several RPC calls) → the public RPC rate-limited the node (429) and *everything* else started failing. Mitigation: `node.bold.state-provider-config.check-batch-finality: false` (BSC finality is ~2 blocks and the batch poster already waits for `finalized` nonces). First assertion posted 3 min after the change.
- **Delayed sequencer**: `use-merge-finality` silently falls back to `finalize-distance` (20 blocks ≈ 9 s) — acceptable.
- **L2 `finalized`/`safe` block tags** are not served (`eth_getBlockByNumber("finalized")` errors on the L2); explorers/indexers must use `latest`.
- Direct RPC `finalized` tag users (data poster nonce, BoLD `rpc-block-number`) are fine because they bypass the header reader.
- Permanent fix needs a Nitro change (parent-chain finality override) — worth an upstream issue.

### 7.14 Public BSC RPCs for the node — measured
`bsc-rpc.publicnode.com`: `eth_getLogs` OK, `finalized` 12/12, 30 parallel calls OK, no key; occasional `403 Archive requests require a personal token` for old blocks (watch after the chain has history). NodeReal free key: per-second cap hit immediately under the §7.13 retry storm. `bsc.drpc.org` public: rate-limited at ~10 req/s; `1rpc.io`: `eth_getLogs` ≤ 50 blocks; `blastapi` public: logs rate-limited; `rpc-bsc.48.club`: OK on all probes (fallback candidate); `bsc-dataseed*`: no `eth_getLogs`. Also: the chain-sdk's viem flow silently exited mid-deploy twice on Windows (no error, exit 0) — the BSC port uses its own receipt polling with a keep-alive timer and checkpoints every tx.

---

## 8. Agent ID gate (sequencer-side)

Nitro has **no dynamic per-sender allowlist**. What exists:
- `execution.sequencer.sender-whitelist` — a **static**, comma-separated allowlist read at startup; non-listed senders get `transaction sender is not on the whitelist`. Useful as a hard backstop for bootstrap (ops wallets only), not for 10k+ agents that change over time. Wired through `SEQUENCER_SENDER_WHITELIST` in the entrypoint.
- `execution.transaction-filtering.*` (ArbOS 61 "compliance filtering") — an S3-backed **blocklist** of hashed addresses with a 7-day enable delay; the wrong polarity for us.
- Delayed-inbox txs (sent directly to BSC `Inbox`) bypass any sequencer filter by design — the chain can never be 100 % gated at the protocol level without a State Transition Function change.

Chosen design:

**(a) Now — `gateway/` (deployed as `agentchain-gateway`), raw sequencer private.**
- Plain Node 20 `http` server, viem 2; CORS `*`; `GET /health`.
- Forwards every JSON-RPC request (single or batch, ids preserved) to `http://agentchain-node.internal:8547` over Fly 6PN; the node has no public service.
- `eth_sendRawTransaction`: decodes with `recoverTransactionAddress` (legacy/2930/1559/4844/7702), then `AgentChecker.check(sender)`:
  1. static `GATEWAY_ALLOWLIST` (ops wallets)
  2. in-memory cache, TTL **60 s** positive / 15 s negative
  3. `AgentRegistry.isAgent(sender)` on the L2 (SPEC §7 contract, address `AGENT_REGISTRY_ADDRESS`)
  4. fallback: parent-chain `IERC721(AgentID).balanceOf(sender) > 0` (`0x60B9…022F`), optional `BAB_TOKEN_ADDRESS`
  - rejection: JSON-RPC error **`-32050`** "sender 0x… does not hold a Binance Agent ID (or BAB) …" with `data: {sender, chainId, source}`. Lookup failures are not cached (fail-closed per request, no 60 s lockout).
- Blocks `admin_/debug_/personal_/miner_/arbdebug_/arbtrace_/txpool_` (−32601). `GATEWAY_ENFORCE=false` gives an observe-only mode for rollout.
- Tested locally against Hardhat: forwards `eth_chainId`, rejects a random sender with −32050 (source `parent`), forwards a holder's tx (returns tx hash), handles batches, hits the cache on the second call, answers OPTIONS preflight.
- Gaps: WebSocket pass-through (subscriptions) not implemented — point `wss` clients at a second gateway instance later or expose WS read-only; no rate limiting (add Fly `concurrency` limits + a token bucket per IP next).

**(b) Longer term — sequencer patch (optional, ~50 lines Go).** In `execution/gethexec/sequencer.go` `PublishTransaction`, after sender recovery, call a cached `isAgent(sender)` that reads the `AgentRegistry` storage slot from the latest L2 state (`statedb.GetState`) — no RPC hop, applies to the raw endpoint too, hot-reloadable registry. Keep the gateway for CORS/limits. This creates a fork to maintain across Nitro releases, so only do it once the gateway is proven.

---

## 9. Deviations from SPEC / open items

| SPEC item | Status |
|---|---|
| 250 ms blocks | **Met** (Nitro default `max-block-speed 250ms`). |
| "Agent ID-gated sequencing" | Met at the **public RPC** layer (gateway) + static backstop. Protocol-level gating is impossible for delayed-inbox txs; see §8. |
| "Sequencer signs a preconfirmation receipt" | Not in Nitro; gateway feature to add (§7.11). |
| "BoLD fraud proofs, permissioned validators" | Met (nitro-contracts v3.2, `MakeNodes`, 1 validator). |
| "Fees quoted in USD, settled in ANTB; keeper every 5 min" | `set-l2-params.ts` implements the floor formula; the periodic keeper is a cron to add (same precompile calls). |
| Genesis Seats in block 0 (mainnet) | **Not in block 0**: mainnet was created 2026-11-20 with an empty genesis (launch decision). Seats / pre-launch Bridge deposits have to be credited by chain-owner distribution txs on L2 (or a future re-genesis). |
| nvdachain as proof BSC works | Incorrect premise (it is an L3 on Robinhood Chain); feasibility is established by §2 instead. |
| Custom domain `rpc.agent-chain.agency` | SPEC maps it to the devnet RPC today; the gateway should take it over when testnet goes live (`fly certs add`). |

---

## 10. Source links

- Nitro releases: https://github.com/OffchainLabs/nitro/releases — Docker tags: https://hub.docker.com/r/offchainlabs/nitro-node/tags
- Nitro Dockerfile (consensus roots): https://github.com/OffchainLabs/nitro/blob/master/Dockerfile
- ArbOS 61: https://docs.arbitrum.io/run-arbitrum-node/arbos-releases/arbos61
- nitro-contracts v3.2.0: https://github.com/OffchainLabs/nitro-contracts/releases/tag/v3.2.0 — `SequencerInbox.sol` (spending reports / pricer): https://github.com/OffchainLabs/nitro-contracts/blob/v3.2.0/src/bridge/SequencerInbox.sol
- Chain SDK: https://github.com/OffchainLabs/arbitrum-chain-sdk/releases (0.28.0) — custom chains PR #731
- Deploy a chain: https://docs.arbitrum.io/launch-arbitrum-chain/deploy/deploy-chain — canonical factories: https://docs.arbitrum.io/launch-arbitrum-chain/deploy/canonical-factory-contracts
- Custom gas token rollup: https://docs.arbitrum.io/launch-arbitrum-chain/chain-config/costs/custom-gas-token-rollup
- Node roles / batch poster: https://docs.arbitrum.io/run-a-node/assign-node-roles , https://docs.arbitrum.io/launch-arbitrum-chain/run-a-node/batch-poster
- Sequencer config reference: https://docs.arbitrum.io/launch-arbitrum-chain/chain-config/sequencer/sequencer-config-reference — CLI flags: https://docs.arbitrum.io/run-a-node/nitro/cli-flags-reference
- Gas & fees (L1 pricing): https://docs.arbitrum.io/how-arbitrum-works/deep-dives/gas-and-fees
- Compliance filtering: https://docs.arbitrum.io/launch-arbitrum-chain/chain-config/sequencer/compliance-filtering
- AEP terms: https://docs.arbitrum.foundation/aep/ArbitrumExpansionProgramTerms.pdf — formula: https://docs.arbitrum.foundation/calculate-aep-fees
- BSC: Fermi (0.45 s) https://docs.bnbchain.org/announce/fermi-bsc/ — Mendel / BEP-652 gas cap https://docs.bnbchain.org/announce/mendel-bsc/ — public RPC limits https://docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/json-rpc-endpoint/ — gas tracker https://bscscan.com/gastracker
- NVDA CHAIN (for the record): https://nvdachain.com/
