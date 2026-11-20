---
title: "AGENT CHAIN FAQ"
version: 0.1
date: 2026-11-20
lang: en
---

# AGENT CHAIN FAQ

## 1. What is AGENT CHAIN?

AGENT CHAIN is an agent-native Layer 2 on BNB Smart Chain (chain ID 1119, Mainnet Beta live since 2026-11-20), built with the Arbitrum Nitro stack in rollup mode (calldata posted to BSC, BoLD fraud proofs, permissioned validators at launch). It differs from other rollups in three ways: gas is paid in ANTB (tokenized Anthropic stock) at a USD-stable rate; only addresses holding a Binance Agent ID or BAB token can transact; and every Agent ID holder on BSC can claim a numbered Genesis Seat that is mirrored to the L2. It runs 250 ms blocks, first-come-first-served ordering, no public mempool, tips off.

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

Not necessarily. Native ANTB is the gas token, but an ERC-4337 paymaster (EntryPoint v0.8) lets you pay in BNB or USDT: you request a quote (valid 60 seconds), include the paymaster signature in your user operation, and the paymaster pays ANTB on L2 on your behalf. If you prefer to hold ANTB directly, bridge it 1:1 from BSC (contract `0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53`). During Mainnet Beta, deposits through the Bridge (`0x9eF8CA94a74B7Fbc5ae0b1F7a2dCaFCa14eE2A92`) are capped at 0.1 ANTB per address and 100 ANTB total and are credited on L2 by the Beta relayer within minutes. ANTB eligibility rules of the issuer apply; it is not available to US persons.

## 6. How does Agent ID gating work?

The Binance Agent ID is an ERC-721 on BSC (`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`), one per KYC'd account, non-transferable. An L2 contract, `AgentRegistry`, mirrors Agent ID state via bridge messages and exposes `isAgent(address)`. Before the sequencer orders a transaction it checks `isAgent(tx.origin)`; if false, the transaction is rejected at the RPC and never enters a block. BAB tokens are also accepted. Because every address is backed by one human, there are no bots, no sybils and no sandwich attacks. Handles are public aliases; AGENT CHAIN never sees KYC data.

## 7. What is a Genesis Seat?

A numbered, non-transferable ERC-721 (`SEAT`) that any Binance Agent ID (or BAB) holder claims once on BSC by calling `GenesisSeatClaim.claim()` at `0x3972579dd0128BF0b6778cB3B457ba1d14D1695b`; seat numbers follow claim order. 236,355 holders were snapshotted at BSC block 134,639,601 and every one of them is eligible. The Beta relayer mirrors seat holders into the L2 `AgentRegistry` on chain 1119 — the genesis block itself is empty, nothing is airdropped. Genesis Seat holders collectively receive 40% of sequencer revenue, pro-rata, one seat one share. Distributions are protocol parameters that governance can change; a seat confers no rights to equity or returns.

## 8. Is mainnet live?

Yes. **Mainnet Beta launched on 2026-11-20.** AGENT CHAIN is chain ID 1119 (0x45F), an Arbitrum Nitro v3.12.4 / ArbOS 61 rollup settling to BSC (56) with ANTB as native gas, a single sequencer and BoLD validation. RPC: `https://rpc.agent-chain.agency` (an Agent ID gateway — senders without an Agent ID/BAB get JSON-RPC error `-32050`; `finalized`/`safe` block tags are not supported, use `latest`). Explorer: `https://explorer.agent-chain.agency`. Bridge deposits on BSC (`0x9eF8CA94a74B7Fbc5ae0b1F7a2dCaFCa14eE2A92`) are credited 1:1 on L2 by a Beta relayer within minutes, ordered by nonce; caps are 0.1 ANTB per address and 100 ANTB total during Beta. The Devnet (chain ID 11190, test token tANTB with no value) remains available at `https://devnet-rpc.agent-chain.agency` / `https://devnet-explorer.agent-chain.agency`.

Two BSC-specific engineering notes: nitro-contracts' `ArbitrumChecker` probes address `0x64`, which on BSC is a retired precompile that burns all forwarded gas, so 5 contracts were rebuilt with a 100k gas cap on that probe (byte-identical otherwise); and because Nitro sees no finality signal from BSC (`difficulty ≠ 0`), the node runs with `check-batch-finality=false` and `parent-chain-block-time=450ms`. See `apps/chain/RESEARCH.md`.

## 8b. What is $AGENT and where is it?

`$AGENT` (`AGENT CHAIN` / `AGENT`, ERC-20, 18 decimals, 1,000,000,000 supply) launched on **Flap** on 2026-11-20 at `0x8E3318Ef4411b4488429Ff6970602968D7307777` on BSC — an open launch on an ANTB bonding curve: any wallet can buy, hold and trade it, no Agent ID needed. It is a Flap tax token V3: 1% buy / 1% sell tax for 365 days, 100% of the tax goes to the creator treasury wallet `0xD800D290F7A87590b9A99295A21dA87D7443FcaB`; no dividends, no burn. It migrates to a PancakeSwap V2 pool once 80% of supply is sold. The creator bought 0.6 ANTB worth at launch (15,060,562.91 AGENT, ≈1.5% of supply) and then burned all of it to `0x…dEaD` (tx `0x0b5a7bc2bde943b5d615bcb6a139800465133b3912ef7aa14eb150b40382e68c`) — the team holds 0 $AGENT; the live burned balance is shown on the site. $AGENT does not pay for gas (ANTB does) and promises no yield; the 40% buy-and-burn share of sequencer revenue is a governance parameter, not a promise. Flap: https://flap.sh/bnb/0x8E3318Ef4411b4488429Ff6970602968D7307777 · BscScan: https://bscscan.com/token/0x8E3318Ef4411b4488429Ff6970602968D7307777. Crypto assets can lose all value; nothing here is investment advice.

## 9. Is it EVM compatible?

Yes. AGENT CHAIN runs Arbitrum Nitro, which is EVM-equivalent: Solidity contracts, Hardhat, Foundry, viem, ethers and MetaMask work unchanged. The native currency has 18 decimals like ETH. Stylus is also enabled, so contracts can be written in Rust or any language that compiles to WASM. Two differences from a generic EVM chain: the sequencer requires `isAgent(tx.origin)` to be true, and priority tips do not affect ordering.

## 10. How fast is it?

Three numbers. **Block time** is 250 ms. **Perceived latency** is 50–100 ms: the sequencer signs a preconfirmation receipt `(txHash, seq, timestamp, sig)` as soon as it receives a valid transaction, and the sequencer is in Singapore, so round-trip time dominates for clients in the region. **Finality**: batches are posted to BSC, whose fast finality is 1.5–4 s; state assertions are confirmed after the BoLD challenge window. Phase 3 (Q1 2027) adds 50 ms streamed sub-blocks and edge RPC in SIN/TYO/FRA/IAD.

---

AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules; bStocks are not available to US persons and are restricted in other jurisdictions. Nothing here is investment advice. $AGENT confers no rights to revenue, equity, or returns; fee distributions are protocol parameters that governance can change. Devnet tokens have no value.
