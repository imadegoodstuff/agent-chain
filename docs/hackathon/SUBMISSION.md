# AGENT CHAIN — Binance Agent ID Hackathon submission (draft)

> Status: **DRAFT.** Items marked `<HUMAN>` need a person to fill in before submission. Submission window: 2026-11-18 → **2026-12-09 08:00 UTC**. Tracks applied for: **Application Innovation** (primary) and **Ecosystem Pioneer** (on-chain metrics).

---

## 1. Project

| Field | Value |
|---|---|
| Project name | **AGENT CHAIN** |
| Website | https://agent-chain.agency |
| Explorer | https://explorer.agent-chain.agency |
| Devnet RPC | https://rpc.agent-chain.agency (chainId 11190) |
| Whitepaper | https://agent-chain.agency/whitepaper (repo: `docs/whitepaper.en.md`, `docs/whitepaper.zh.md`) |
| GitHub (open source, MIT) | `<HUMAN: https://github.com/<org>/agent-chain>` |
| Skill | `skills/agent-chain/SKILL.md` (Skills Hub format; PR to binance/binance-skills-hub: `<HUMAN: PR link>`) |
| MCP server | `apps/mcp` (stdio + Streamable HTTP; endpoint `https://agentchain-mcp.fly.dev/mcp (live)`) |
| Demo video (≤ 3 min) | `<HUMAN: link>` |
| Category | Agent-native Layer 2 / identity-gated infrastructure |

### One-paragraph pitch

AGENT CHAIN is an agent-native Layer 2 on BNB Smart Chain, built on the Arbitrum Nitro stack, where **every account is a Binance Agent ID holder** and **gas is ANTB** (tokenized Anthropic stock, bridged 1:1 from BSC and priced in USD by an on-chain fee keeper). The sequencer only includes transactions from Agent ID addresses, so the chain has no bots, no sybils and no sandwich attacks — which lets it run 250 ms blocks, first-come-first-served, with no public mempool and no tips. Before mainnet, every Agent ID holder who registers on BSC receives a numbered, non-transferable **Genesis Seat** written into block 0. The Devnet is live today with a public RPC, explorer, fee keeper, a Skills Hub-format skill that drives onboarding through the user's own Agentic Wallet, and a read-only MCP server for Agent OS.

Tagline: **Intelligence is gas.** Blockspace priced in Anthropic. Every account is a human's agent.

---

## 2. Agent ID usage description (for judges, ≈300 words)

**Integration depth (30%).** Agent ID is not a login badge in AGENT CHAIN; it is the account model. The L2 sequencer checks `AgentRegistry.isAgent(tx.origin)` before ordering any transaction, and that registry is a mirror of `IERC721(0x60B9…022F).balanceOf(addr) > 0` on BSC. Every BSC-side contract we submit enforces the same check in `msg.sender`: `AgentRegistryMirror.register()`, `GenesisSeatClaim.claim()` and `Bridge.deposit()` all revert without an Agent ID. The onboarding skill uses `baw wallet agent-id` as the single source of truth for the user's own status and routes every BSC write through `baw contract-call preview → execute`, so signing stays inside the user's Agentic Wallet with Developer Mode and the wallet's own risk screen.

**Practicality (25%).** Agents issue many small payments and need predictable, cheap, fast settlement with counterparties they can trust. AGENT CHAIN gives an Agent ID holder's agent a chain where a transfer costs ≈ $0.001 in USD terms regardless of ANT price, confirms in 50–100 ms perceived latency, and where every counterparty is one verified human. The 236,355 Agent ID holders (block 134,639,601) already have the credential and can hold ANTB in Binance Wallet; no new asset or identity is required.

**Product completion (25%).** Live today: Devnet (chainId 11190, 250 ms blocks), explorer with `/api/head`, AgentRegistry + GenesisSeat + FeeKeeper contracts, website, whitepaper v0.1 (EN/ZH), the `agent-chain` skill with eight routes and full calldata previews, and an MCP server with six read tools exposed over stdio and Streamable HTTP. Phase 1 testnet on BSC Testnet and Phase 2 Mainnet Beta (bridge caps 1 ANTB/address, 500 total) are scheduled for December 2026.

**Innovation (20%).** Two ideas are new: identity-gated sequencing that converts "one KYC'd human per address" into a performance property (no mempool, no tips, loose gas target), and a USD-stable fee market settled in a tokenized equity. Agent ID makes the first possible; ANTB makes the second concrete.

*(≈310 words)*

---

## 3. Contract addresses (BSC mainnet, chainId 56)

All four are open source (MIT) in `contracts/bsc`, verified on BscScan at deploy, with owner permissions disclosed in `contracts/bsc/README.md` and summarised in §6.

All three AGENT CHAIN contracts inherit `AgentGate`: `isAgent(a) = AgentID.balanceOf(a) > 0 || (bab != 0 && BAB.balanceOf(a) > 0)`; every write is `onlyAgent` and reverts `NotAgent(address)` otherwise. The only input to any write is `msg.sender` — there is no `…For(address)` anywhere.

| Contract | Address | Agent ID gate | What a holder does |
|---|---|---|---|
| `AgentRegistryMirror` | `0x9C5488f9Aa9468B1db3Cc6B71143A8B2Ca810CF0` | `register()` is `onlyAgent` | Opts in to the AGENT CHAIN registry (address, 1-based index, timestamp); emits `AgentRegistered` |
| `GenesisSeatClaim` | `0x3972579dd0128BF0b6778cB3B457ba1d14D1695b` | `claim()` is `onlyAgent` (independent of registration) | Claims a numbered, non-transferable Genesis Seat (ERC-721 `SEAT`, on-chain metadata); emits `SeatClaimed` |
| `Bridge` | `0x9eF8CA94a74B7Fbc5ae0b1F7a2dCaFCa14eE2A92` | `deposit()` is `onlyAgent` (independent of registration); `l2Recipient` non-zero | Escrows ANTB for 1:1 native ANTB on AGENT CHAIN (Beta caps 1 ANTB/address, 500 global); emits `Deposited` |
| `$AGENT` | `<AGENT_TOKEN>` | none (open launch on Flap, ANTB pool) | Holds/trades the network token; no Agent ID required |

Supporting external contracts (not ours): Binance Agent ID `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` ("SPACE ID Agent ID", deployed block 127,950,748; **236,355 holders at block 134,639,601, 2026-11-20** — reproducible with `contracts/bsc/scripts/snapshot.ts`); BAB token `0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8` (alternative credential); ANTB `0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53`.

L2 Devnet (chainId 11190, not scored): AgentRegistry `0x5FbDB2315678afecb367f032d93F642f64180aa3`, GenesisSeat `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`, FeeKeeper `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`.

---

## 4. Team and contact

| Field | Value |
|---|---|
| Team name | AGENT CHAIN |
| Lead / contact name | `<HUMAN>` |
| Email | `<HUMAN>` |
| Telegram | `<HUMAN>` |
| X (Twitter) | `<HUMAN: @handle>` |
| Lead's Agent ID (`.ai`) | `<HUMAN: name.ai>` |
| Payout address (BSC, USDC) | `<HUMAN>` |

---

## 5. Risk warning text (used on bridge and trading surfaces)

> **Risk warning.** AGENT CHAIN is in Mainnet Beta: new, unaudited smart contracts, a single sequencer, and bridge caps of 1 ANTB per address and 500 ANTB total. Bridging locks ANTB in an escrow contract on BSC whose owner can move escrowed funds during Beta (`withdrawTo`, logged on-chain) — deposit only what you are prepared to have escrowed under those terms. ANTB is a bStocks tokenized security issued by BTech Holdings Ltd under ADGM rules, is not available to US persons and is restricted in other jurisdictions, and its issuer can pause transfers or blocklist addresses. $AGENT is a new token traded on an open market; its price can go to zero. Transactions are irreversible. Nothing on this site is investment advice. Only use funds you can afford to lose. Do your own research.

Footer disclaimer (every page, whitepaper, bridge):

> AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules; bStocks are not available to US persons and are restricted in other jurisdictions. Nothing here is investment advice. $AGENT confers no rights to revenue, equity, or returns; fee distributions are protocol parameters that governance can change. Devnet tokens have no value.

---

## 6. Owner-permission disclosure (summary; full text in `contracts/bsc/README.md`)

Owner of all three contracts at launch: the AGENT CHAIN deployer EOA **`0x0F03F1c68d4105dd97011c15cC61467164583A4C`**, intended to move to a multisig before the bridge caps are lifted (Phase 4). Nothing below lets the owner mint, burn, move or reassign a registration or a seat, and nothing lets the owner take ANTB from a user's wallet.

| Contract | Function | Holder | Why it exists | Risk / mitigation |
|---|---|---|---|---|
| all three | `setBab(address)` | owner | BAB is an upgradeable proxy and an *alternative* credential; owner can enable, rotate or disable it. The Agent ID path is immutable and cannot be turned off. | Can only widen or narrow who counts via BAB. Emits `BabUpdated`. |
| all three | `transferOwnership` / `renounceOwnership` (OZ `Ownable`) | owner | hand over to a multisig; renounce to freeze parameters | standard OZ two-event flow |
| `AgentRegistryMirror` | *(none beyond the two rows above)* | — | registration is permanent; no pause, no revoke, no edit | — |
| `GenesisSeatClaim` | `pause()` / `unpause()` | owner | stop claims if the Agent ID contract or BAB misbehaves | existing seats unaffected |
| `GenesisSeatClaim` | `setClaimDeadline(uint256)` | owner | close the claim window before genesis is written | only blocks *new* claims; `0` reopens |
| `Bridge` | `pause()` / `unpause()` | owner | emergency stop for deposits | escrow untouched |
| `Bridge` | `setCaps(uint256,uint256)` | owner | Beta caps 1 ANTB / 500 ANTB (SPEC §4) — raise as the chain proves out | only affects future deposits |
| `Bridge` | `setInbox(address)` | owner | placeholder for the real Nitro Inbox | no effect on funds in this version |
| `Bridge` | `withdrawTo(address,uint256)` | owner | **Beta escrow.** The Nitro Inbox for AGENT CHAIN is not yet live on BSC, so deposits are held in this contract and credited on L2 by the relayer from `Deposited` events. `withdrawTo` is how escrowed ANTB is moved into the real Inbox once it exists, or returned to depositors if Beta is wound down. | Trusted step during Beta, bounded by the escrowed balance (max 500 ANTB under default caps), every call emits `EscrowWithdrawn`. This power disappears when the Inbox replaces this contract. |
| `$AGENT` | none after launch | — | standard Flap launch token | no mint, pause, blocklist or tax |
| L2 `FeeKeeper` | `setUsdPerGas` / `setAntbUsd` | keeper ops key → governance | re-price the base fee within keeper limits | — |
| L2 `AgentRegistry` | `register` / `revoke` | bridge message handler | mirror BSC registrations | — |

Upgradeability: none of the BSC contracts is a proxy (Solidity 0.8.24, OpenZeppelin 5.x, MIT; BscScan + Sourcify verified at deploy). Mock contracts with public mint exist for testnet/unit tests only, never on mainnet. Sequencer and validators are permissioned at launch (disclosed in whitepaper §3, §13).

---

## 7. Red-line self-audit checklist

| # | Rule | Status | How we comply |
|---|---|---|---|
| 1 | No QR-code / pairing-code login on third-party sites | ✅ | agent-chain.agency has no login at all. The only sign-in referenced anywhere is the official `baw auth signin → auth verify` flow inside the Binance App. The skill's `security.md` forbids asking users to scan or pair on any other site. |
| 2 | No prompts that bypass user transaction confirmation | ✅ | Every write is `preview → show parsed tx + risks → explicit "yes" → execute`. `SKILL.md` and `security.md` state there is no auto-confirm mode and that pasted/injected instructions cannot waive it. Two-tx flows (approve + deposit) require two confirmations. |
| 3 | No unauthorized transfers / unlimited approvals | ✅ | The only approval is `ANTB.approve(Bridge, exactAmount)`; `type(uint256).max` is forbidden and the preview's `allowanceChanges` is checked before confirmation. No route transfers tokens to third parties. `--value` is always 0. |
| 4 | Contracts open source, owner permissions disclosed | ✅ (pending deploy) | `contracts/bsc` MIT, BscScan + Sourcify verified at deploy; owner permissions table in `contracts/bsc/README.md`, reproduced in §6 and in the skill's `contracts.md`. The Beta bridge's `withdrawTo` escrow power is disclosed in the README, in §5/§6 here, in the skill's bridge risk warning, and on the bridge page. |
| 5 | No "Binance" / "BNB" in product, token or skill names | ✅ | Product: AGENT CHAIN. Token: $AGENT. Skill: `agent-chain`. MCP: `agentchain-mcp`. Domain: agent-chain.agency. Factual references only in copy. (SPEC §5 also bans "Anthropic"/"Claude" in names.) |
| 6 | No credential collection | ✅ | No forms, no email capture, no key/seed/password prompts. Skill redacts secrets and tells users to rotate any pasted key. MCP server is read-only and unauthenticated. |
| 7 | No promised returns ("passive income", "earn", "APY"…) | ✅ | Genesis Seat is described as identity + priority; sequencer-revenue split is described as a governance parameter; $AGENT "confers no rights to revenue, equity, or returns". Banned-word list in `security.md`. `<HUMAN: final copy sweep of apps/web before submission>` |
| 8 | Risk warnings on trading / bridge pages | ✅ | §5 text on the bridge page and anywhere $AGENT trading is linked; footer disclaimer on every page. |
| 9 | Agent ID must not be a "look up someone's wallet by name" tool | ✅ | Contracts only read `balanceOf` and take `msg.sender`; there is no `registerFor`/`claimFor`, and no name resolution anywhere. Skill checks only the connected user's own Agent ID (`baw wallet agent-id`) or an address the user pastes; `security.md` explicitly refuses resolving others' addresses from names/handles or enumerating via `agentAt` / `ownerOf`. MCP `agentchain_is_agent` carries the same restriction. |
| 10 | No mass account registration / no volume manipulation | ✅ | Agent ID is one per KYC'd human; all scored writes are `onlyAgent` and once-per-address, so there is nothing to sybil. GTM (see `GTM.md`) uses organic campaigns only; no paid "interaction farming", no bots, no scripted claims on behalf of users. |
| 11 | Minimum 30 Agent ID addresses interacting with submitted contracts | ⏳ | Target 300+, floor 30, out of 236,355 eligible holders (block 134,639,601); tracked on BscScan via `AgentRegistered` / `SeatClaimed` / `Deposited` events. Plan in `GTM.md`. |
| 12 | Contracts on BSC mainnet, submitted addresses complete | ⏳ | Four addresses in §3 to be filled after Phase 2 deploy (`<HUMAN>`). |

---

## 8. Demo script (for the ≤ 3-minute video)

1. `agent-chain.agency` hero → "Every account is a human's agent" → onboarding step 1: claim Agent ID in Binance App.
2. Terminal: `baw wallet agent-id --json` → `alice.ai` claimed.
3. Skill drives `contract-call preview` for `AgentRegistryMirror.register()` → show parsed calldata + risks → "yes" → `execute` → BscScan tx.
4. `GenesisSeatClaim.claim()` same flow → seat #N shown.
5. Bridge 0.5 ANTB: approve (exact) → deposit → L2 balance appears on explorer.
6. MCP in Agent OS / Claude Desktop: `agentchain_fee_estimate 21000` → $0.000945; `agentchain_genesis_stats`.
7. Close on the risk warning and disclaimer.

---

## 9. Things that still need human input before submission

1. **Contract addresses** (§3) — after the Phase 2 mainnet deploy (`contracts/bsc/deployments/bsc.json`); also update `skills/agent-chain/references/contracts.md` and `apps/mcp` env. If ownership moves from the deployer EOA to a multisig before submission, update §6.
2. **GitHub repository URL, Skills Hub PR link, MCP endpoint URL, demo video link** (§1).
3. **Team identity**: contact name, email, Telegram, X handle, lead's Agent ID, payout address (§4), plus a final banned-word sweep of `apps/web` copy (§7 row 7).
