---
title: "AGENT CHAIN Roadmap"
version: 0.1
date: 2026-11-20
lang: en
---

# AGENT CHAIN Roadmap

Five phases. Dates are targets, not commitments. Status legend: **Live** / **In progress** / **Planned**.

| Phase | Name | Status | Target |
|---|---|---|---|
| 0 | Devnet | Live | Nov 2026 |
| 1 | Testnet on BSC Testnet | In progress | Dec 2026 |
| 2 | Mainnet Beta | Planned | Dec 2026 |
| 3 | Streaming preconfirmations | Planned | Q1 2027 |
| 4 | Scale & settlement | Planned | 2027 |

## Phase 0 — Devnet

**Status:** Live
**Target:** Nov 2026
**Network:** AGENT CHAIN Devnet, chain ID `11190` (0x2BB6), 250 ms blocks, single node, gas token tANTB (no value)

### Deliverables

- [x] Single-node devnet with 250 ms block interval
- [x] Public RPC at `https://rpc.agent-chain.agency`
- [x] Public explorer at `https://explorer.agent-chain.agency`
- [x] `AgentRegistry` contract (`isAgent(address)`, owner-set mirror)
- [x] `GenesisSeat` contract (sequential `seatId`, `mint()` once per address, `SeatMinted` event)
- [x] `FeeKeeper` stub (`usdPerGas`, `antbUsdPrice`, `BaseFeeUpdated`)
- [x] Website at `https://agent-chain.agency`
- [x] Whitepaper v0.1 (EN / ZH)

### Exit criteria

- RPC and explorer reachable publicly for 7 consecutive days
- Contracts deployed and addresses published in `apps/devnet/deployments/devnet.json`
- Whitepaper v0.1 published on the website

## Phase 1 — Testnet on BSC Testnet

**Status:** In progress
**Target:** Dec 2026
**Network:** AGENT CHAIN Testnet, chain ID `111900`, parent BSC Testnet (97), gas token tANTB

### Deliverables

- [ ] Nitro rollup (rollup mode, calldata to BSC Testnet) with BoLD fraud proofs and permissioned validators
- [ ] tANTB configured as the Nitro custom gas token
- [ ] Bridge (deposit / withdraw via ArbSys) and tANTB faucet
- [ ] Agent ID-gated sequencing: `isAgent(tx.origin)` pre-check, `AgentRegistry` synced via bridge messages
- [ ] Paymaster: pay gas in BNB/USDT, 60 s quotes, ERC-4337 EntryPoint v0.8
- [ ] Fee keeper live: 5-min cadence, ≥0.5% write threshold, ≤5% per write, 1 write / 60 s, ±5% band
- [ ] Skill published to Binance Skills Hub
- [ ] Public Testnet RPC and explorer

### Exit criteria

- End-to-end deposit → transact → withdraw completed on BSC Testnet
- Sequencer rejects non-Agent ID transactions; registry sync verified against BSC Testnet events
- Fee keeper has run unattended for 14 days with no out-of-band writes
- Force inclusion through the delayed inbox demonstrated at least once

## Phase 2 — Mainnet Beta

**Status:** Planned
**Target:** Dec 2026
**Network:** AGENT CHAIN, chain ID `1119` (reserved), parent BSC (56), gas token ANTB

### Deliverables

- [ ] Agent ID snapshot on BSC at a published block
- [ ] Genesis block: numbered Genesis Seat + small native ANTB for every snapshotted address, seats numbered by first-registration order
- [ ] Launch on BSC with ANTB as native gas
- [ ] Bridge caps enforced during Beta: 1 ANTB per address, 500 ANTB total
- [ ] $AGENT launch on Flap: ANTB pool, open to all wallets (no Agent ID gate, no per-wallet cap), no team swap fee
- [ ] Revenue split live: 40% Genesis Seats / 40% buy-and-burn $AGENT / 20% operations; 10% of net revenue to Arbitrum Expansion Program
- [ ] Submission to Binance Agent ID Hackathon (deadline Dec 9, 2026)

### Exit criteria

- Genesis state verified against the published snapshot by at least one independent party
- Bridge invariant (native L2 ANTB + in-flight withdrawals ≤ escrow) holds continuously since block 0
- First revenue distribution to Genesis Seat holders executed on-chain
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
- [ ] Audits of `AgentRegistry`, `GenesisSeat`, `FeeKeeper`, paymaster and bridge-message handlers completed

### Exit criteria

- Validator set includes operators independent of the sequencer operator
- Audit reports published before caps are lifted
- Fee keeper owner key migrated to governance

---

AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules; bStocks are not available to US persons and are restricted in other jurisdictions. Nothing here is investment advice. $AGENT confers no rights to revenue, equity, or returns; fee distributions are protocol parameters that governance can change. Devnet tokens have no value.
