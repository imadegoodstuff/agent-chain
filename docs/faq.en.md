---
title: "AGENT CHAIN FAQ"
version: 0.1
date: 2026-11-20
lang: en
---

# AGENT CHAIN FAQ

## 1. What is AGENT CHAIN?

AGENT CHAIN is an agent-native Layer 2 on BNB Smart Chain, built with the Arbitrum Nitro stack in rollup mode (calldata posted to BSC, BoLD fraud proofs, permissioned validators at launch). It differs from other rollups in three ways: gas is paid in ANTB (tokenized Anthropic stock) at a USD-stable rate; only addresses holding a Binance Agent ID or BAB token can transact; and every Agent ID holder on BSC is written into the genesis block with a numbered Genesis Seat. It runs 250 ms blocks, first-come-first-served ordering, no public mempool, tips off.

## 2. Why price gas in a stock token?

Fees on AGENT CHAIN are quoted in USD, not in ANTB. The base rate is $0.045 per 1,000,000 gas (illustrative); a fee keeper converts that into ANTB every 5 minutes using `minBaseFee = baseRate / P × 1e18`, where `P` is the ANTB/USD price. ANTB is the settlement asset because it is a liquid, Binance-issued BEP-20 that already exists on BSC and because the chain is built for the agents of the company it represents. The USD quote is what makes the model work for agents: a budget written in dollars stays valid regardless of where ANT trades.

## 3. What happens to my fees if ANT moves?

Your USD cost per transaction stays the same; the amount of ANTB deducted changes. A 21,000-gas transfer costs ≈ $0.000945 at every price level:

| ANT price | ANTB per transfer |
|---|---|
| $60 | 0.00001575 |
| $97.17 | 0.0000097 |
| $150 | 0.0000063 |
| $300 | 0.00000315 |

The keeper updates every 5 minutes, writes only on a ≥ 0.5% move, changes at most 5% per write, writes at most once per 60 s, and rejects readings outside ±5% of the last close. Your ANTB *balance* is exposed to the ANT price (what it can buy changes), but the per-transaction USD cost is not. Figures are illustrative.

## 4. Is AGENT CHAIN affiliated with Anthropic or Binance?

No. AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules; bStocks are not available to US persons and are restricted in other jurisdictions. AGENT CHAIN uses ANTB and Binance Agent ID as existing on-chain assets; it does not issue, control, or speak for either.

## 5. Do I need ANTB to use it?

Not necessarily. Native ANTB is the gas token, but an ERC-4337 paymaster (EntryPoint v0.8) lets you pay in BNB or USDT: you request a quote (valid 60 seconds), include the paymaster signature in your user operation, and the paymaster pays ANTB on L2 on your behalf. If you prefer to hold ANTB directly, bridge it 1:1 from BSC (contract `0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53`). During Mainnet Beta, deposits are capped at 1 ANTB per address and 500 ANTB total. ANTB eligibility rules of the issuer apply; it is not available to US persons.

## 6. How does Agent ID gating work?

The Binance Agent ID is an ERC-721 on BSC (`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`), one per KYC'd account, non-transferable. An L2 contract, `AgentRegistry`, mirrors Agent ID state via bridge messages and exposes `isAgent(address)`. Before the sequencer orders a transaction it checks `isAgent(tx.origin)`; if false, the transaction is rejected at the RPC and never enters a block. BAB tokens are also accepted. Because every address is backed by one human, there are no bots, no sybils and no sandwich attacks. Handles are public aliases; AGENT CHAIN never sees KYC data.

## 7. What is a Genesis Seat?

Before mainnet, all Agent ID holders on BSC are snapshotted at a published block. Each is written into block 0 with a numbered, non-transferable `GenesisSeat` token (numbered by first-registration order) and a small native ANTB balance. Genesis Seat holders collectively receive 40% of sequencer revenue, pro-rata, one seat one share. Distributions are protocol parameters that governance can change; a seat confers no rights to equity or returns.

## 8. Is mainnet live?

No. The Devnet is live: chain ID 11190, RPC `https://rpc.agent-chain.agency`, explorer `https://explorer.agent-chain.agency`, 250 ms blocks, single node, test token tANTB with no value. Testnet on BSC Testnet (chain ID 111900) is Phase 1, targeted Dec 2026. Mainnet Beta (chain ID 1119) is Phase 2, also targeted Dec 2026, with bridge caps of 1 ANTB per address and 500 ANTB total. Dates are targets.

## 9. Is it EVM compatible?

Yes. AGENT CHAIN runs Arbitrum Nitro, which is EVM-equivalent: Solidity contracts, Hardhat, Foundry, viem, ethers and MetaMask work unchanged. The native currency has 18 decimals like ETH. Stylus is also enabled, so contracts can be written in Rust or any language that compiles to WASM. Two differences from a generic EVM chain: the sequencer requires `isAgent(tx.origin)` to be true, and priority tips do not affect ordering.

## 10. How fast is it?

Three numbers. **Block time** is 250 ms. **Perceived latency** is 50–100 ms: the sequencer signs a preconfirmation receipt `(txHash, seq, timestamp, sig)` as soon as it receives a valid transaction, and the sequencer is in Singapore, so round-trip time dominates for clients in the region. **Finality**: batches are posted to BSC, whose fast finality is 1.5–4 s; state assertions are confirmed after the BoLD challenge window. Phase 3 (Q1 2027) adds 50 ms streamed sub-blocks and edge RPC in SIN/TYO/FRA/IAD.

---

AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules; bStocks are not available to US persons and are restricted in other jurisdictions. Nothing here is investment advice. $AGENT confers no rights to revenue, equity, or returns; fee distributions are protocol parameters that governance can change. Devnet tokens have no value.
