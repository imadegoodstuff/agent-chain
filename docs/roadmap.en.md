---
title: "AGENT CHAIN Roadmap"
version: 0.2
date: 2026-11-20
lang: en
---

# AGENT CHAIN Roadmap

Five phases. Dates are targets, not commitments. Status legend: **Live** / **Done** / **In progress** / **Planned**.

| Phase | Name | Status | Target |
|---|---|---|---|
| 0 | Devnet | Done | Nov 2026 |
| 1 | Mainnet Beta on BSC | **Live** | 2026-11-20 |
| 2 | Beta hardening | In progress | Dec 2026 |
| 3 | Streaming preconfirmations | Planned | Q1 2027 |
| 4 | Scale & settlement | Planned | 2027 |

## Phase 0 — Devnet

**Status:** Done
**Target:** Nov 2026
**Network:** AGENT CHAIN Devnet (test data), chain ID `11190` (0x2BB6), 250 ms blocks, single node, gas token tANTB (no value)

### Deliverables

- [x] Single-node devnet with 250 ms block interval
- [x] Public RPC, now at `https://devnet-rpc.agent-chain.agency`
- [x] Public explorer, now at `https://devnet-explorer.agent-chain.agency`
- [x] `AgentRegistry` contract (`isAgent(address)`, owner-set mirror)
- [x] `GenesisSeat` test contract (sequential `seatId`, `mint()` once per address, `SeatMinted` event)
- [x] `FeeKeeper` stub (`usdPerGas`, `antbUsdPrice`, `BaseFeeUpdated`)
- [x] Website at `https://agent-chain.agency`
- [x] Whitepaper v0.1 (EN / ZH)

### Exit criteria

- [x] Contracts deployed and addresses published in `apps/devnet/deployments/devnet.json`
- [x] Whitepaper published on the website
- Devnet keeps running as a test network; its tokens have no value

## Phase 1 — Mainnet Beta on BSC

**Status:** Live since 2026-11-20
**Network:** AGENT CHAIN, chain ID `1119` (0x45F), parent BSC (56), Arbitrum Nitro v3.12.4 / ArbOS 61, gas token ANTB
**RPC:** `https://rpc.agent-chain.agency` (Agent ID gateway; fallback `https://agentchain-gateway.fly.dev`) · **Explorer:** `https://explorer.agent-chain.agency`

### Delivered on launch day (2026-11-20)

- [x] BSC contracts live and verified: `AgentRegistryMirror` `0x9C5488f9Aa9468B1db3Cc6B71143A8B2Ca810CF0`, `GenesisSeatClaim` `0x3972579dd0128BF0b6778cB3B457ba1d14D1695b`, `Bridge` `0x9eF8CA94a74B7Fbc5ae0b1F7a2dCaFCa14eE2A92`
- [x] Agent ID holder snapshot: 236,355 holders at BSC block 134,639,601
- [x] Nitro core deployed on BSC by our BSC-patched `RollupCreator` `0xdb5E51Af6d4Ff89584912818b762c6a7F3c68D70` — `createRollup` tx `0xd99b52c896685fe301f6bac7b6b0c60ff49546c931f1177473fd152959fa115f`, block 134,648,658 (Rollup `0x0EE1Db14…`, Inbox `0x09A1f23D…`, SequencerInbox `0x165108Ec…`, Bridge `0x337B50dB…`, Outbox `0x763a4E77…`, UpgradeExecutor `0x6B338a6b…`, ChallengeManager `0x1E3256Fd…`)
- [x] ANTB as native gas via the custom-gas-token path; fee-token pricer `0x132fa6bc…` (ANTB-wei per BNB); min L2 base fee 493,366,955 wei (= $0.045 per 1M gas at ANTB $91.21)
- [x] Single sequencer (sin) with 250 ms blocks; batch poster `0xC7b1…253F`; BoLD validator `0xc33d…e78F` staked 0.02 WBNB; first assertion posted
- [x] Agent ID gateway RPC: non-agent senders rejected with JSON-RPC error `-32050`; `eth_getLogs` supported; `finalized`/`safe` tags not supported (use `latest`)
- [x] Empty genesis block — no pre-mine; citizenship mirrored from BSC
- [ ] Beta relayer credits `Bridge` deposits 1:1 on L2 within minutes, ordered by nonce (status at `https://agentchain-relayer.fly.dev/status`)
- [ ] Bridge caps 0.1 ANTB per address / 100 ANTB total (owner raises to 1 / 500 as Beta proves out)
- [ ] Skill listed in Binance Skills Hub (PR binance/binance-skills-hub#425 open; installable from GitHub today)
- [ ] Submission to Binance Agent ID Hackathon (deadline Dec 9, 2026)

### Engineering note — what BSC required

1. **`ArbitrumChecker` vs. BSC address `0x64`.** nitro-contracts probes `0x64` (ArbSys) to detect an Arbitrum parent; on BSC that is a retired precompile that fails and burns all forwarded gas, so stock deployment died with "contract creation code storage out of gas". We rebuilt 5 contracts with a 100k gas cap on the probe, byte-identical otherwise.
2. **No finality signal from BSC.** Nitro treats a parent with `difficulty ≠ 0` as having no finality; the BoLD staker looped on finality checks. The node runs `check-batch-finality=false` and `parent-chain-block-time=450ms`. Details: `apps/chain/RESEARCH.md`.

### Beta limits (disclosed)

- Chain owner `0x8D61bD807Da29C71eAbA6e85Fc42796E357fA443` is a single EOA and also the L2 infra fee account; Safe migration planned
- Single sequencer; force inclusion via the delayed Inbox remains available
- Deposits through the Beta `Bridge` are relayer-credited, not atomic; owner `withdrawTo` exists on the Beta escrow
- No self-service withdrawal UI yet (L2 → BSC via Nitro Outbox after assertion confirmation)

## Phase 2 — Beta hardening

**Status:** In progress
**Target:** Dec 2026

### Deliverables

- [ ] Testnet on BSC Testnet (chain ID `111900`) as a staging network with tANTB faucet
- [ ] Paymaster: pay gas in BNB/USDT, 60 s quotes, ERC-4337 EntryPoint v0.8
- [ ] Fee keeper live: 5-min cadence, ≥0.5% write threshold, ≤5% per write, 1 write / 60 s, ±5% band
- [ ] Chain owner → Safe multisig; UpgradeExecutor timelock
- [ ] Canonical Nitro Inbox replaces the Beta escrow bridge; self-service withdrawals in the UI
- [ ] $AGENT launch on Flap: ANTB pool, open to all wallets (no Agent ID gate, no per-wallet cap), no team swap fee
- [ ] Revenue split live: 40% Genesis Seats / 40% buy-and-burn $AGENT / 20% operations; 10% of net revenue to Arbitrum Expansion Program

### Exit criteria

- Bridge invariant (native L2 ANTB + in-flight withdrawals ≤ escrow) verified continuously by an independent party
- Force inclusion through the delayed Inbox demonstrated at least once on mainnet
- Fee keeper has run unattended for 14 days with no out-of-band writes
- Required disclaimers present on website footer, whitepaper and bridge

## Phase 3 — Streaming preconfirmations

**Status:** Planned
**Target:** Q1 2027

### Deliverables

- [ ] 50 ms streamed sub-blocks on the sequencer feed
- [ ] Multi-region edge RPC: SIN / TYO / FRA / IAD
- [ ] ERC-8004 agent identity registry predeploy
- [ ] x402 payment facilitator predeploy
- [ ] MCP endpoint predeploy
- [ ] Stylus agent SDK (Rust/WASM)

### Exit criteria

- Measured p50 read latency from each edge region under 100 ms
- Preconfirmation receipts `(txHash, seq, timestamp, sig)` verifiable against published batches by a public tool
- At least one third-party agent transacting through x402 and MCP

## Phase 4 — Scale & settlement

**Status:** Planned
**Target:** 2027

### Deliverables

- [ ] Execution engine upgrade when throughput demands it
- [ ] ZK validity settlement when the Arbitrum stack ships it
- [ ] External validators added to the validator set
- [ ] Bridge caps lifted
- [ ] Audits of `AgentRegistryMirror`, `GenesisSeatClaim`, `Bridge`, relayer, `FeeKeeper`, paymaster and the BSC-patched nitro-contracts completed

### Exit criteria

- Validator set includes operators independent of the sequencer operator
- Audit reports published before caps are lifted
- Fee keeper owner key migrated to governance

---

AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules; bStocks are not available to US persons and are restricted in other jurisdictions. Nothing here is investment advice. $AGENT confers no rights to revenue, equity, or returns; fee distributions are protocol parameters that governance can change. Devnet tokens have no value.
