---
title: "AGENT CHAIN Whitepaper"
version: 0.1
date: 2026-11-20
lang: en
---

# AGENT CHAIN Whitepaper v0.1

**Intelligence is gas.** Blockspace priced in Anthropic. Every account is a human's agent.

> All fee figures in this document are illustrative. Protocol parameters are subject to change by governance. See *Legal & disclaimers* at the end.

## Abstract

AGENT CHAIN is an agent-native Layer 2 on BNB Smart Chain (BSC), built with the Arbitrum Nitro stack and operated in rollup mode with calldata posted to BSC. Three design choices distinguish it from general-purpose rollups.

First, the native gas token is **ANTB**, the BEP-20 bStocks token representing tokenized Anthropic stock, bridged 1:1 from BSC. Fees are quoted in US dollars and settled in ANTB: a fee keeper re-prices the minimum base fee from the ANTB market every 5 minutes, so the cost of a unit of compute is stable in USD regardless of ANT price movement.

Second, the sequencer only includes transactions from addresses that hold a **Binance Agent ID** (ERC-721 on BSC, one per KYC'd human, non-transferable) or a BAB token. Every address on AGENT CHAIN is therefore the agent of a verified human. There are no bots, no sybils and no sandwich attacks, which in turn allows an aggressive performance profile: 250 ms blocks, first-come-first-served ordering, no public mempool, priority tips disabled.

Third, **genesis is human**. Before mainnet, every Agent ID holder on BSC is snapshotted and written into block 0 with a numbered Genesis Seat and a small native ANTB balance. Seats are identity and priority credentials; the launch fee split allocates 40% of sequencer fees to seats as a governance-controlled parameter (§8, §10), not a promise of returns.

This document describes the architecture, fee model, identity layer, genesis procedure, account abstraction stack, latency targets, token and fee flow, agent infrastructure, roadmap and risks of AGENT CHAIN v0.1. The Devnet (chain ID 11190) is live. Testnet (Phase 1) and Mainnet Beta (Phase 2) are scheduled for December 2026.

## 01 Why an agent chain

### 1.1 The agent workload

Autonomous software agents issue transactions differently from humans. A human signs a few transactions per day and tolerates a 12-second confirmation. An agent calling a tool, paying for an API response, or settling with another agent issues hundreds of small transactions per hour and expects the response profile of an HTTP API: tens to low hundreds of milliseconds, deterministic cost, no surprises.

Three requirements follow.

| Requirement | What an agent needs | What it gets on most chains |
|---|---|---|
| Settlement latency | Confirmation in the same time budget as an API call (≤ 100 ms perceived) | 2–12 s block times; probabilistic inclusion |
| Account integrity | Counterparties that are provably backed by one human each | Free, unlimited anonymous accounts; sybils and bots dominate flow |
| Fee predictability | Compute priced in USD so a budget can be planned | Fees denominated in a volatile asset and auctioned under congestion |

### 1.2 Why existing chains fail agents

**Latency.** Ethereum L1 produces a block every 12 s. BSC produces one every 0.75 s with fast finality in 1.5–4 s. General-purpose L2s typically run 250 ms–2 s blocks but then expose transactions to a public mempool and priority-fee auction, so the time from submission to a useful receipt is not bounded.

**Sybils and MEV.** Permissionless account creation is a feature for humans and a liability for agents. An agent negotiating a price, posting a bid or paying for a result cannot distinguish one counterparty from a thousand puppets of the same operator. Searchers in a public mempool front-run and sandwich agent orders, converting the agent's own predictability into a tax.

**Fee volatility.** Gas priced in a chain's native token means an agent's compute budget moves with that token's market. An agent tasked with executing 10,000 calls per day cannot plan a budget if the per-call cost halves or doubles within a week, and it cannot pass costs through to a user in a currency the user recognises.

### 1.3 The AGENT CHAIN answer

AGENT CHAIN resolves the three requirements by construction rather than by policy:

- **Latency:** a single sequencer in Singapore (Fly.io region `sin`) produces 250 ms blocks, orders first-come-first-served, keeps no public mempool and signs a preconfirmation receipt on receipt of a transaction. Perceived latency is 50–100 ms for clients in the region.
- **Account integrity:** the sequencer checks `isAgent(tx.origin)` against an on-chain `AgentRegistry` mirrored from the Binance Agent ID contract on BSC. One KYC'd human, one Agent ID, one agent account.
- **Fee predictability:** compute is priced at $0.045 per 1,000,000 gas (illustrative) and settled in ANTB. A keeper re-prices every 5 minutes so USD cost is constant.

## 02 Design principles

1. **Price compute in a unit humans and agents already budget in.** Fees are quoted in USD. ANTB is the settlement asset, not the unit of account.
2. **Every account is a human's agent.** Inclusion requires a Binance Agent ID or BAB token. Identity is enforced at the sequencer, not by social convention.
3. **Inherit security, do not invent it.** AGENT CHAIN is a Nitro rollup settling to BSC with BoLD fraud proofs. No new consensus, no new VM, no new bridge design.
4. **Fast by removing adversaries, not by adding trust.** Because sybils and sandwiches are structurally excluded, the chain can run FCFS with no mempool and no tips without opening an MEV surface.
5. **Launch with citizens, not with a treasury.** Genesis allocates seats and dust to every Agent ID holder. No pre-mine to insiders is written into block 0.
6. **State every number and every risk.** Parameters are published in one table (Section 14). Dependencies on third parties (ANTB issuer, BSC, Arbitrum stack, oracles) are enumerated with a response for each (Section 13).

## 03 Architecture

### 3.1 Layering

```
BSC (L1, chain ID 56)
  ├── ANTB BEP-20 (0x38Dd...Fc53)        ← escrow for native bridging
  ├── Binance Agent ID ERC-721 (0x60B9...022F)
  ├── Nitro rollup contracts (inbox, outbox, bridge, SequencerInbox, RollupCore, BoLD challenge manager)
  └── calldata batches posted by the AGENT CHAIN batch poster
        ▲
        │ 1:1 ANTB bridging, Agent ID state messages, batch data, assertions
        ▼
AGENT CHAIN (L2, chain ID 1119 mainnet)
  ├── Sequencer (Singapore), 250 ms blocks, FCFS, no public mempool, tips off
  ├── Nitro execution (EVM + Stylus Rust/WASM)
  ├── Predeploys: AgentRegistry, GenesisSeat, FeeKeeper, ArbSys, EntryPoint v0.8
  └── Validators (permissioned at launch) posting assertions and running BoLD challenges
```

### 3.2 Settlement: Nitro rollup mode on BSC

AGENT CHAIN runs the Arbitrum Nitro stack in **rollup mode**: every batch of L2 transactions is posted as **calldata to BSC**, so the full history is reconstructible from the parent chain alone. The alternative, AnyTrust mode with an off-chain data availability committee, is not used.

State assertions are secured by **BoLD** (Bounded Liquidity Delay) fraud proofs. A single honest validator is sufficient to reject an invalid assertion within a bounded challenge window. At launch the validator set is **permissioned**; opening it to external validators is a Phase 4 deliverable.

The parent chain is BSC (chain ID 56) for mainnet and BSC Testnet (chain ID 97) for the Phase 1 testnet. The Devnet runs as a single node without a parent chain. Running Nitro against a non-Arbitrum, non-Ethereum parent is a less-travelled path; see Risk R06.

### 3.3 Sequencer

One sequencer, located in Singapore, receives transactions, orders them first-come-first-served, executes them in 250 ms blocks and streams the resulting feed to RPC nodes. There is **no public mempool**: a transaction is visible only to the sequencer until it is included. **Priority tips are disabled**; a transaction that sets a priority fee is accepted but the tip does not affect ordering.

Before ordering, the sequencer performs a pre-check: `AgentRegistry.isAgent(tx.origin)` must return `true` (Section 06). Transactions failing this check are rejected at the RPC boundary and never enter a block.

### 3.4 Force inclusion

A single sequencer is a liveness assumption, not a safety assumption. If the sequencer censors or stops, any user may submit a transaction directly to the delayed inbox on BSC. After the force-inclusion delay (Nitro default 24 hours, published as a parameter at launch) the transaction can be forced into the L2 ordering without the sequencer's cooperation. Withdrawals via ArbSys likewise do not depend on the sequencer.

### 3.5 Execution and Stylus

Execution is standard Nitro: EVM-equivalent, with the same opcodes, precompiles and gas accounting as Arbitrum One, plus **Stylus**, which allows contracts written in Rust (or any language compiling to WASM) to run alongside Solidity with 10–100× cheaper compute for heavy workloads. Stylus is enabled from Devnet. Solidity tooling (Hardhat, Foundry, viem, ethers) works unchanged.

### 3.6 Network facts

| | Devnet (live) | Testnet (Phase 1) | Mainnet (Phase 2) |
|---|---|---|---|
| Name | AGENT CHAIN Devnet | AGENT CHAIN Testnet | AGENT CHAIN |
| Chain ID | `11190` (0x2BB6) | `111900` | `1119` (reserved) |
| RPC | `https://rpc.agent-chain.agency` | TBA | TBA |
| Explorer | `https://explorer.agent-chain.agency` | TBA | TBA |
| Gas token | tANTB (test, no value) | tANTB | ANTB |
| Parent | — (single node) | BSC Testnet (97) | BSC (56) |
| Block time | 250 ms | 250 ms | 250 ms |

Website: `https://agent-chain.agency`. Devnet tokens have no value.

## 04 The gas asset: ANTB

### 4.1 Token facts

| Property | Value |
|---|---|
| Token | ANTB — bStocks tokenized Anthropic stock |
| Issuer | BTech Holdings Ltd (bStocks), under ADGM rules |
| Standard | BEP-20 on BSC |
| Contract | `0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53` |
| Decimals | 18 |
| Upgradeability | Beacon-proxy upgradeable by the issuer |
| Issuer controls | Pause and blocklist functions exist at the issuer's discretion |
| Eligibility | Not available to US persons; restricted in other jurisdictions |
| Role on AGENT CHAIN | Native gas token, bridged 1:1 |

AGENT CHAIN does not issue ANTB, hold a relationship with its issuer, or alter its terms. It consumes ANTB as a Nitro **custom gas token**.

### 4.2 Native bridging

ANTB is bridged 1:1 using the Nitro custom-gas-token bridge. Depositing ANTB into the bridge escrow on BSC mints the same amount of native ANTB on AGENT CHAIN. Native ANTB is used exactly as ETH is used on Arbitrum: it pays gas, is transferred with `msg.value`, and has 18 decimals.

Withdrawals are initiated on L2 through the **ArbSys** precompile (`0x0000000000000000000000000000000000000064`). After the assertion containing the withdrawal is confirmed on BSC (the BoLD challenge window), the user executes the outbox transaction on BSC and receives BEP-20 ANTB from escrow.

### 4.3 Supply invariant

The bridge maintains the invariant

```
native ANTB supply on L2  +  ANTB in in-flight withdrawals  ≤  ANTB held in BSC escrow
```

Genesis allocations (Section 07) are the only native ANTB not minted by a deposit; the corresponding ANTB is deposited into escrow by the operator before the bridge is opened, so the invariant holds from block 0.

### 4.4 Mainnet Beta caps

During Phase 2 (Mainnet Beta) deposits are capped at **1 ANTB per address** and **500 ANTB total**. Caps are lifted in Phase 4.

### 4.5 Issuer risk

Because ANTB is an upgradeable, pausable, blocklist-enabled security token, the issuer can in principle freeze the escrow contract's balance or pause transfers on BSC. This would halt deposits and withdrawals but not L2 execution. See Risk R01 for the response.

## 05 Fee model

### 5.1 Unit of account

One compute unit (CU) equals one gas. The protocol targets a **base rate of $0.045 per 1,000,000 gas** (illustrative). Every fee the user sees is this rate converted into ANTB at the current keeper price.

### 5.2 Formula

```
minBaseFee (wei/gas) = baseRate (USD/gas) / P (USD/ANTB) × 1e18
```

where `baseRate = 0.045 / 1e6 = 4.5e-8 USD/gas` and `P` is the ANTB/USD price written by the keeper. Nitro's L2 base fee floor is set to `minBaseFee`; the standard Nitro gas-target controller may raise the base fee above the floor under sustained load, but because Agent ID gating removes spam, the gas target is configured loosely and the base fee sits at the floor in normal operation.

### 5.3 Worked example at P = $97.17

ANT closed at $97.17 on its IPO day, 2026-11-19.

```
minBaseFee = 4.5e-8 / 97.17 × 1e18 ≈ 463,105,000 wei/gas
```

| Operation | Gas (illustrative) | ANTB | USD |
|---|---|---|---|
| Simple transfer | 21,000 | ≈ 0.0000097 | ≈ $0.001 |
| Agent call | ≈ 45,000 | ≈ 0.0000208 | ≈ $0.002 |
| Contract deploy | ≈ 180,000 | ≈ 0.0000834 | ≈ $0.008 |

### 5.4 USD cost is invariant to ANT price

The same 21,000-gas transfer at four ANTB prices:

| P (USD/ANTB) | minBaseFee (wei/gas) | ANTB per transfer | USD per transfer |
|---|---|---|---|
| $60.00 | 750,000,000 | 0.00001575 | ≈ $0.000945 |
| $97.17 | 463,105,000 | 0.0000097 | ≈ $0.000945 |
| $150.00 | 300,000,000 | 0.0000063 | ≈ $0.000945 |
| $300.00 | 150,000,000 | 0.00000315 | ≈ $0.000945 |

The ANTB column moves inversely with price; the USD column does not move.

### 5.5 Fee keeper

The `FeeKeeper` contract stores `usdPerGas` and `antbUsdPrice` and emits `BaseFeeUpdated` on every write. The keeper process:

| Parameter | Value |
|---|---|
| Cadence | Evaluates every 5 minutes |
| Write threshold | Writes only if price moved ≥ 0.5% since last write |
| Max change per write | ≤ 5% |
| Rate limit | 1 write per 60 s |
| Deviation band | ±5% vs last official close; readings outside the band are rejected |
| Fallback | Last valid price |

Writes are owner-only at launch; the owner key is held by operations and will migrate to governance.

### 5.6 Price sources

| Window | Source |
|---|---|
| US market hours | Binance Oracle / Chainlink ANTB-USD feed |
| Off-hours, weekends, holidays | PancakeSwap ANTB/USDT 30-minute TWAP |

Guards applied to every reading:

- **Deviation:** reject if outside ±5% of the last official close.
- **Staleness:** reject if the oracle round or TWAP window is older than the keeper's staleness threshold (parameter, published at launch).
- **Liquidity:** reject the TWAP source if the pool's depth is below the keeper's minimum (parameter, published at launch).

If all sources are rejected, the keeper does not write and the last valid price remains in force.

### 5.7 What the user pays

Gas × base fee, in native ANTB. No priority tips. Users without ANTB can pay through a paymaster in BNB or USDT (Section 08). The sequencer collects the base fee as revenue, which is then split as described in Section 10.

## 06 Identity layer: Binance Agent ID

### 6.1 The credential

| Property | Value |
|---|---|
| Name | Binance Agent ID |
| Standard | ERC-721 on BSC |
| Contract | `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` |
| Issuance | One per KYC'd Binance account |
| Transferability | Non-transferable |
| Also accepted | BAB (Binance Account Bound) token |

### 6.2 AgentRegistry on L2

`AgentRegistry` is an L2 predeploy mapping `address → (bytes32 handleHash, bool active)`. It is a mirror of Agent ID state on BSC. On Devnet the mirror is owner-set. On Testnet and Mainnet it is synced via retryable bridge messages: minting, revocation or address rebinding on BSC produces a message that updates the L2 registry. The public interface is:

```
function isAgent(address account) external view returns (bool);
```

### 6.3 Sequencer gating

For every incoming transaction the sequencer evaluates `isAgent(tx.origin)`. For ERC-4337 user operations, the check is applied to the account's registered owner. Transactions failing the check are rejected with a distinct RPC error and do not consume gas or a nonce.

### 6.4 Consequences

- **No bots.** An address must be bound to a KYC'd human.
- **No sybils.** One human, one Agent ID, one agent account. Airdrops, governance and Genesis Seats can be allocated per human rather than per key.
- **No sandwiches.** There is no public mempool to observe and no tip to outbid with; the only parties who could front-run are identified humans subject to Binance's terms.
- **Loose gas target.** Because spam is bounded by the number of verified humans, the Nitro gas controller is configured with a loose target and the base fee stays at the USD floor.

### 6.5 Privacy

Agent ID handles are **public aliases**. The registry stores a hash of the handle, and the handle itself is public on BSC. AGENT CHAIN does not receive, store or process KYC documents; it only reads token ownership. Users should assume that their L2 activity is linkable to their public Agent ID handle.

## 07 Genesis

### 7.1 Snapshot

Before mainnet, a **snapshot block** on BSC is published in advance. At that block, every address holding a Binance Agent ID is recorded, together with the order in which it first registered.

### 7.2 Genesis allocation

The genesis state of AGENT CHAIN (chain ID 1119) contains, for every snapshotted address:

| Item | Detail |
|---|---|
| Genesis Seat | One non-transferable `GenesisSeat` token with a sequential `seatId` |
| Seat numbering | By first-registration order of the Agent ID on BSC |
| Native ANTB | A small native ANTB balance, sufficient for initial transactions; amount published with the snapshot block |

`GenesisSeat` emits `SeatMinted(address, uint256)` for each allocation. On Devnet, `mint()` is open to any address once; on Mainnet, minting is limited to the genesis allocation and to Agent ID holders.

### 7.3 Seat economics

Genesis Seat holders collectively receive **40% of sequencer revenue**, distributed pro-rata: **one seat, one share**. Seats are non-transferable; the share follows the Agent ID holder. Distributions are protocol parameters and can be changed by governance (see Legal & disclaimers).

## 08 Accounts & paymasters

### 8.1 Account abstraction

AGENT CHAIN predeploys the **ERC-4337 EntryPoint v0.8** and supports **EIP-7702**, which lets an externally owned account delegate to smart-account code. Agents can therefore operate from either a smart account or an upgraded EOA with the same tooling.

### 8.2 Paymasters

A verifying paymaster lets a user pay for gas in **BNB or USDT** on BSC while the paymaster pays native ANTB on L2. The flow:

1. The client requests a quote from the paymaster service. The quote is valid for **60 seconds** and states the ANTB/BNB or ANTB/USDT rate and maximum gas.
2. The user operation includes the paymaster's signature over the quote.
3. The paymaster sponsors the operation on L2 and settles with the user in BNB/USDT.

The Agent ID gate still applies: the paymaster does not relax the `isAgent` requirement on the account owner.

### 8.3 Session keys

Smart accounts support session keys that are:

- **Scoped** — limited to a list of target contracts and function selectors;
- **Rate-limited** — a maximum number of operations and maximum spend per window;
- **Expiring** — a hard `validUntil` timestamp.

Session keys are how an agent runtime holds signing authority without holding the owner's root key.

## 09 Speed

### 9.1 Three kinds of fast

| Dimension | Definition | AGENT CHAIN target |
|---|---|---|
| Confirmation latency | Time from submission to a receipt the client can act on | 50–100 ms perceived (preconfirmation); 250 ms block |
| Throughput | Transactions per second the sequencer sustains | Nitro-class; execution upgrade in Phase 4 when demanded |
| Finality | Time until the transaction cannot be reverted | BSC fast finality 1.5–4 s for data posting; BoLD challenge window for assertion confirmation |

### 9.2 Physics

For a client within the sequencer's region, round-trip time (RTT) dominates everything else. Execution of a simple transfer takes microseconds; the 250 ms block interval is an upper bound on inclusion, and the RTT Singapore ↔ Singapore is low single-digit milliseconds. Clients in Tokyo, Frankfurt or Virginia see 70–250 ms RTT, which is why Phase 3 adds edge RPC in SIN/TYO/FRA/IAD.

### 9.3 Preconfirmation receipt

On receipt of a valid transaction the sequencer returns a signed receipt:

```
preconf = (txHash, seq, timestamp, sig)
```

- `txHash` — the transaction hash;
- `seq` — the sequencer's monotonically increasing position for this transaction;
- `timestamp` — sequencer wall-clock time in milliseconds;
- `sig` — sequencer signature over the three fields.

The receipt is a commitment to include the transaction at position `seq`. A client can treat it as a confirmation for low-value actions; a sequencer that violates its receipts is detectable by comparing `seq` with the published batch.

### 9.4 Phase 3: streamed sub-blocks

Phase 3 introduces **50 ms streamed sub-blocks** on the sequencer feed. Blocks remain 250 ms for settlement purposes; the feed exposes partial state every 50 ms so that regional edge nodes can serve near-real-time reads.

### 9.5 Finality backing

Batches are posted to BSC, whose **fast finality (1.5–4 s)** means posted data cannot be reorganised after a few seconds. Preconfirmations are therefore backed by a parent chain that finalises in seconds rather than minutes.

## 10 Token & fee flow

### 10.1 $AGENT

`$AGENT` launches on **Flap** (flap.sh) with the following configuration:

| Parameter | Value |
|---|---|
| Pool asset | ANTB |
| Launch gate | None — open launch. Any wallet can buy, hold and trade $AGENT on BSC |
| Per-wallet cap | None |
| Agent ID | Required to transact on AGENT CHAIN, not to hold $AGENT. Bridging $AGENT to the chain requires an Agent ID account |
| Team swap fee | None |

#### Why ANTB is gas and $AGENT is not

A gas asset and a value-capture asset want opposite things. Gas should be cheap, stable in purchasing power, and already in the user's wallet; a network token should become scarcer as the network is used. Forcing one token to do both is the failure mode of most new chains: at launch there is no gas demand, so the token has no floor, and users are asked to buy an unfamiliar asset before they can send a single transaction.

AGENT CHAIN splits the two roles:

- **ANTB is the fuel.** It is liquid on BSC (Flap, PancakeSwap, Binance Wallet), already held by the users we target, and priced in USD by the fee keeper so fees stay flat regardless of ANT's price. Nobody has to acquire a new asset to use the chain.
- **$AGENT is where usage flows.** 40% of all sequencer revenue (collected in ANTB) is used to buy $AGENT on the open market and burn it. The busier the chain, the more is burned. $AGENT does not need to be spent to be useful; it is the index of the chain's fee revenue.

This mirrors how Arbitrum and Base settle in ETH while their network tokens sit outside the fee path. The split is also a disclosure point: the 40/40/20 revenue allocation is a governance-controlled protocol parameter, not a promise of returns (see §14).

### 10.2 Sequencer revenue split

Sequencer revenue (base fees collected in ANTB) is split:

| Recipient | Share |
|---|---|
| Genesis Seat holders (pro-rata, one seat one share) | 40% |
| Buy-and-burn of $AGENT | 40% |
| Operations (infrastructure, audits, keeper, BSC posting) | 20% |

### 10.3 Arbitrum Expansion Program

As a Nitro chain settling outside Ethereum, AGENT CHAIN contributes **10% of protocol net revenue** to the Arbitrum Expansion Program (AEP). Net revenue is fees collected minus BSC data-posting cost.

### 10.4 Worked split of 1.000 ANTB

Assume 1.000 ANTB of net sequencer revenue in a period. The AEP contribution is taken first, then the 40/40/20 split applies to the remainder:

```
1.000 ANTB net revenue
  − 0.100 ANTB  → Arbitrum Expansion Program (10%)
  = 0.900 ANTB distributable
      0.360 ANTB → Genesis Seat holders (40%)
      0.360 ANTB → buy-and-burn $AGENT (40%)
      0.180 ANTB → operations (20%)
```

All figures are illustrative. $AGENT confers no rights to revenue, equity or returns.

## 11 Agent infrastructure

Phase 3 predeploys a set of standard endpoints. For an agent developer each provides a concrete capability:

| Component | Standard | What it does for you |
|---|---|---|
| Agent identity registry | ERC-8004 | Register an agent's metadata, capabilities and reputation pointers under its Agent ID-gated address, so other agents can discover and verify it on-chain |
| Agent commerce | ERC-8183 | Standard escrow and job-settlement interface between agents: post a task, lock payment in ANTB, release on delivery or dispute |
| Payment facilitator | x402 | An HTTP 402 facilitator that lets any web endpoint charge per request, settled on AGENT CHAIN; your agent pays for an API call in the same round-trip it makes the call |
| MCP endpoint | Model Context Protocol | A hosted MCP server exposing chain reads, writes and fee quotes as tools, so any MCP-capable model can use AGENT CHAIN without custom integration |
| Skills Hub skill | Binance Skills Hub | A published skill that teaches Binance-ecosystem agents how to hold ANTB, check their Agent ID, and transact on AGENT CHAIN |
| Stylus agent SDK | Rust/WASM | Write agent-side on-chain logic in Rust with Stylus compute pricing |

## 12 Roadmap

| Phase | Name | Target | Deliverables |
|---|---|---|---|
| 0 | Devnet | Live, Nov 2026 | Single-node devnet, 250 ms blocks, public RPC + explorer, AgentRegistry + GenesisSeat contracts, website, whitepaper v0.1 |
| 1 | Testnet on BSC Testnet | Dec 2026 | Nitro rollup settling to BSC Testnet, tANTB as custom gas token, bridge + faucet, Agent ID-gated sequencing, paymaster (pay in BNB/USDT), fee keeper live, Skill published to Binance Skills Hub |
| 2 | Mainnet Beta | Dec 2026 | Agent ID snapshot → genesis → launch on BSC. ANTB native gas. Bridge caps (1 ANTB/address, 500 ANTB total) during Beta. $AGENT launch on Flap (ANTB pool, open to all wallets). Submission to Binance Agent ID Hackathon (deadline Dec 9, 2026) |
| 3 | Streaming preconfirmations | Q1 2027 | 50 ms streamed sub-blocks via sequencer feed, multi-region edge RPC (SIN/TYO/FRA/IAD), ERC-8004 agent registry + x402 facilitator + MCP endpoint predeploys, Stylus agent SDK |
| 4 | Scale & settlement | 2027 | Execution engine upgrade when throughput demands it; ZK validity settlement when the Arbitrum stack ships it; external validators; bridge caps lifted |

See `docs/roadmap.en.md` for checklists and exit criteria.

## 13 Risks & dependencies

### R01 — Issuer control of ANTB

ANTB is a beacon-proxy upgradeable token with issuer pause and blocklist controls. The issuer could pause transfers, blocklist the bridge escrow, or upgrade the token's logic.

**Response.** L2 execution does not depend on the BSC token contract; a pause halts deposits and withdrawals, not blocks. Mainnet Beta caps (1 ANTB/address, 500 ANTB total) bound total exposure. The escrow address is published so users can monitor its status. AGENT CHAIN is independent of the issuer and makes no representation about ANTB's terms; users are directed to the issuer's documentation and eligibility rules.

### R02 — Oracle and liquidity

The fee keeper depends on an oracle during market hours and on a PancakeSwap TWAP off-hours. A thin pool or a stale feed could produce a wrong price.

**Response.** Every reading passes a ±5% deviation band, a staleness check and a liquidity check. Changes per write are capped at 5%, writes at one per 60 s. If every source fails, the last valid price persists. The worst case is a mispriced fee for the duration of the outage, not a halt.

### R03 — Single sequencer

One sequencer in Singapore is a single point of liveness failure and a single point of ordering trust.

**Response.** Force inclusion through the BSC delayed inbox guarantees censorship resistance after the delay window. Withdrawals via ArbSys do not require the sequencer. Preconfirmation receipts are signed and auditable against published batches. Multi-region edge RPC (Phase 3) and external validators (Phase 4) reduce the dependency over time.

### R04 — Parent chain BSC dependency

AGENT CHAIN's data availability and settlement are only as strong as BSC. A BSC outage, reorg beyond fast finality, or governance change affects AGENT CHAIN.

**Response.** BSC fast finality (1.5–4 s) is the assumption AGENT CHAIN builds on; the batch poster waits for finality before considering data posted. The rollup contracts are standard Nitro and can be redeployed against an alternative parent if required, at the cost of a migration.

### R05 — Gas balance exposure to ANT price

Holding ANTB to pay gas exposes a user to ANT equity price movement. A balance that pays for 10,000 transactions today may pay for 5,000 or 20,000 next month.

**Response.** USD cost per transaction is constant by design; only the ANTB inventory required changes. Paymasters let users pay in BNB or USDT without holding ANTB. Agents should hold a small ANTB float and top up rather than pre-fund large balances.

### R06 — Nitro on a non-Arbitrum parent is an undocumented path

Nitro is documented for Ethereum and Arbitrum parents. Running it against BSC, a different client with different finality semantics, is less tested.

**Response.** Phase 1 runs the full stack on BSC Testnet before any real value is at risk. Mainnet launches as Beta with bridge caps. Deviations from Nitro defaults are documented and published. Upstream changes in the Arbitrum stack are tracked and adopted conservatively.

### R07 — New contracts unaudited at launch

`AgentRegistry`, `GenesisSeat`, `FeeKeeper`, the paymaster and bridge-message handlers are new code. They are not audited at Devnet and may not be fully audited at Mainnet Beta.

**Response.** Contracts are small, open source and published with the deployment addresses. Mainnet Beta caps limit value at risk. Audits are funded from the 20% operations share and are a Phase 4 exit requirement before caps are lifted.

### R08 — Regulation

ANTB is a tokenized security issued under ADGM rules and not available to US persons. $AGENT is a new token. Rules governing either may change.

**Response.** AGENT CHAIN does not sell ANTB and routes users to the issuer's eligibility requirements. $AGENT confers no rights to revenue, equity or returns. Fee distributions are protocol parameters subject to governance change. The project publishes its disclaimers on every surface (footer, whitepaper, bridge).

## 14 Specification table

| Parameter | Value |
|---|---|
| Stack | Arbitrum Nitro, rollup mode |
| Parent chain (mainnet) | BSC, chain ID 56 |
| Parent chain (testnet) | BSC Testnet, chain ID 97 |
| Data availability | Calldata posted to BSC |
| Fraud proofs | BoLD |
| Validators at launch | Permissioned |
| Devnet chain ID | 11190 (0x2BB6) |
| Testnet chain ID | 111900 |
| Mainnet chain ID | 1119 (reserved) |
| Block time | 250 ms |
| Ordering | First-come-first-served |
| Public mempool | None |
| Priority tips | Disabled |
| Sequencer location | Singapore (Fly.io `sin`) |
| Preconfirmation receipt | `(txHash, seq, timestamp, sig)` |
| Perceived latency | 50–100 ms |
| Phase 3 sub-blocks | 50 ms streamed |
| Edge RPC regions (Phase 3) | SIN / TYO / FRA / IAD |
| Execution | EVM + Stylus (Rust/WASM) |
| Gas token | ANTB (BEP-20, `0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53`, 18 decimals) |
| ANTB issuer | BTech Holdings Ltd (bStocks), ADGM |
| Bridging | 1:1 native; withdraw via ArbSys |
| Bridge invariant | native L2 ANTB + in-flight withdrawals ≤ escrow |
| Mainnet Beta bridge caps | 1 ANTB / address; 500 ANTB total |
| Compute unit | 1 CU = 1 gas |
| Base rate (illustrative) | $0.045 per 1,000,000 gas |
| Base fee formula | `minBaseFee = baseRate / P × 1e18` |
| Reference price | ANT = $97.17 (IPO day close, 2026-11-19) |
| minBaseFee at $97.17 | ≈ 463,105,000 wei/gas |
| Transfer (21,000 gas) | ≈ 0.0000097 ANTB ≈ $0.001 |
| Agent call | ≈ $0.002 |
| Contract deploy | ≈ $0.008 |
| Keeper cadence | Every 5 min |
| Keeper write threshold | ≥ 0.5% move |
| Keeper max change per write | ≤ 5% |
| Keeper rate limit | 1 write / 60 s |
| Price source (market hours) | Binance Oracle / Chainlink ANTB-USD |
| Price source (off-hours) | PancakeSwap ANTB/USDT 30-min TWAP |
| Deviation band | ±5% vs last close |
| Fallback | Last valid price |
| Identity credential | Binance Agent ID, ERC-721, `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`, one per KYC account, non-transferable |
| Also accepted | BAB token |
| Gating check | `isAgent(tx.origin)` at the sequencer |
| L2 registry | `AgentRegistry`, synced via bridge messages |
| Genesis | Snapshot of Agent ID holders on BSC at a published block |
| Genesis allocation | Numbered Genesis Seat + small native ANTB |
| Seat numbering | First-registration order |
| Seat revenue share | 40% of sequencer revenue, pro-rata, one seat one share |
| Account abstraction | ERC-4337 EntryPoint v0.8; EIP-7702 |
| Paymaster | Pays ANTB; user pays BNB/USDT; 60 s quotes |
| Session keys | Scoped, rate-limited, expiring |
| $AGENT launch | Flap (flap.sh), ANTB pool, open launch — no Agent ID gate, no per-wallet cap |
| Team swap fee | None |
| Revenue split | 40% Genesis Seats / 40% buy-and-burn $AGENT / 20% operations |
| Arbitrum Expansion Program | 10% of protocol net revenue |
| Agent infrastructure (Phase 3) | ERC-8004, ERC-8183, x402, MCP endpoint, Skills Hub skill, Stylus SDK |
| Hackathon | Binance Agent ID Hackathon, deadline Dec 9, 2026 |
| Website | `https://agent-chain.agency` |

## Legal & disclaimers

AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules; bStocks are not available to US persons and are restricted in other jurisdictions.

Nothing here is investment advice. $AGENT confers no rights to revenue, equity, or returns; fee distributions are protocol parameters that governance can change.

Devnet tokens have no value.
