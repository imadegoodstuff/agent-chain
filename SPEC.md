# AGENT CHAIN — Shared Build Spec (source of truth for all sub-projects)

Everything in this repo (web, explorer, devnet, docs) MUST follow this file. If something here conflicts with your judgment, follow this file and note the concern in your final report.

## 1. What AGENT CHAIN is

**AGENT CHAIN** is an agent-native Layer 2 on BNB Smart Chain, built with the Arbitrum Nitro stack.

- **Gas is Anthropic.** The native gas token is **ANTB**, Binance's bStocks tokenized Anthropic stock (BEP-20 on BSC, `0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53`, 18 decimals), bridged 1:1 into AGENT CHAIN as the native currency. Fees are quoted in USD and settled in ANTB; a fee keeper re-prices the base fee from the ANTB market every 5 minutes.
- **Accounts are Binance Agent IDs.** The sequencer only includes transactions from addresses that hold a Binance Agent ID (ERC-721 on BSC, `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`, one per KYC'd human, non-transferable) or a BAB token. Every address on AGENT CHAIN is a verified human's agent. No bots, no sybils, no sandwiches.
- **Genesis is human.** Before mainnet, all Agent ID holders are snapshotted on BSC and written into the genesis block: each receives a numbered **Genesis Seat** and a small native ANTB balance. The chain launches with its citizens already inside block 0.
- **Settles to BSC.** Rollup mode, calldata posted to BSC. BoLD fraud proofs, permissioned validators at launch. BSC fast finality (1.5–4 s) backs the sequencer's preconfirmations.
- **Speed.** 250 ms blocks, first-come-first-served ordering, no public mempool, tips off. The sequencer signs a preconfirmation receipt on receipt of a tx; perceived latency 50–100 ms. Stylus (Rust/WASM) enabled. Sequencer in Singapore.
- **Token.** `$AGENT` launches on Flap (flap.sh) with the ANTB pool as an open launch: any wallet can buy, hold and trade $AGENT on BSC — no Agent ID gate, no per-wallet cap. Agent ID is required to transact on the chain, never to hold the token. Sequencer fee split at launch (a governance-controlled protocol parameter, never described as a promise of returns; Genesis Seats are identity + priority credentials): 40% to Genesis Seats, 40% buys and burns $AGENT, 20% operations. No team swap fee. Arbitrum Expansion Program: 10% of protocol net revenue.

Tagline (hero): **Intelligence is gas.**
Sub-line: **Blockspace priced in Anthropic. Every account is a human's agent.**
Chinese tagline: **智能即燃料。** 副标题：**区块空间以 Anthropic 计价，每个账户背后是一个真人的 agent。**

## 2. Network facts (use exactly these)

| | Devnet (live now) | Testnet (Phase 1) | Mainnet (Phase 2) |
|---|---|---|---|
| Name | AGENT CHAIN Devnet | AGENT CHAIN Testnet | AGENT CHAIN |
| Chain ID | `11190` (0x2BB6) | `111900` | `1119` (reserved) |
| RPC | `https://rpc.agent-chain.agency` | TBA | TBA |
| Explorer | `https://explorer.agent-chain.agency` | TBA | TBA |
| Gas token | tANTB (test, no value) | tANTB | ANTB |
| Parent | — (devnet, single node) | BSC Testnet (97) | BSC (56) |
| Block time | 250 ms | 250 ms | 250 ms |

Website URL: `https://agent-chain.agency`
Fly.io region: `sin` (Singapore). Fly org: default (personal).

Custom domain (bound after first deploy; use these as the canonical public URLs in copy once live):
- `https://agent-chain.agency` (+ `www`) → web
- `https://explorer.agent-chain.agency` → explorer
- `https://rpc.agent-chain.agency` → devnet RPC
- `https://docs.agent-chain.agency` → reserved

## 3. Fee model numbers (illustrative, keep consistent)

- Compute unit: 1 CU = 1 gas. Base rate **$0.045 per 1,000,000 gas**.
- Simple transfer 21,000 gas ≈ **$0.001**; agent call ≈ **$0.002**; contract deploy ≈ **$0.008**.
- At ANT = $97.17 (IPO day close, 2026-11-19): min base fee ≈ 463,105,000 wei/gas; transfer ≈ 0.0000097 ANTB.
- Keeper: every 5 min, write on ≥0.5% move, ≤5% change per write, 1 write / 60 s.
- Price sources: Binance Oracle / Chainlink ANTB-USD during US market hours; PancakeSwap ANTB/USDT 30-min TWAP off-hours; ±5% band vs last close; fallback to last valid price.

## 4. Roadmap (use exactly these phases)

- **Phase 0 — Devnet (Live, Nov 2026):** single-node devnet, 250 ms blocks, public RPC + explorer, AgentRegistry + GenesisSeat contracts, website, whitepaper v0.1.
- **Phase 1 — Testnet on BSC Testnet (Dec 2026):** Nitro rollup settling to BSC Testnet, tANTB as custom gas token, bridge + faucet, Agent ID-gated sequencing, paymaster (pay in BNB/USDT), fee keeper live, Skill published to Binance Skills Hub.
- **Phase 2 — Mainnet Beta (Dec 2026):** Agent ID snapshot → genesis → launch on BSC. ANTB native gas. Bridge caps (1 ANTB/address, 500 ANTB total) during Beta. $AGENT launch on Flap (ANTB pool, open to all wallets). Submission to Binance Agent ID Hackathon (deadline Dec 9, 2026).
- **Phase 3 — Streaming preconfirmations (Q1 2027):** 50 ms streamed sub-blocks via sequencer feed, multi-region edge RPC (SIN/TYO/FRA/IAD), ERC-8004 agent registry + x402 facilitator + MCP endpoint predeploys, Stylus agent SDK.
- **Phase 4 — Scale & settlement (2027):** execution engine upgrade when throughput demands it; ZK validity settlement when the Arbitrum stack ships it; external validators; bridge caps lifted.

## 5. Brand

- **Name:** AGENT CHAIN (all caps in display contexts), "Agent Chain" in prose when needed. Never "AntChain" (trademark of Ant Group). Never put "Binance", "BNB", "Anthropic" or "Claude" in product names, token names or domains. Referencing them factually in copy is fine.
- **Metaphor:** a swarm of agents self-organizing into a network (Anthropic's ticker is ANT — an ant colony is the visual nod, never the name). Visuals: particles converging into a hexagonal lattice / a living chain of nodes; warm light on deep ink.
- **Palette:**
  - Ink (background): `#0B0C10`
  - Surface: `#121319`, Surface-2: `#1A1B23`
  - Line: `#262833`
  - Bone (primary text): `#EDE6DA`
  - Muted text: `#9A948A`
  - **Amber (accent):** `#F0B35B`; Amber-deep `#C9842E`
  - Signal green (live): `#5BD39A`; Signal red: `#E5604F`
- **Type:** Display/body: `Inter` (or Geist) ; Mono labels/numbers: `JetBrains Mono`. Uppercase tracked mono labels for section numbers ("01 / GENESIS").
- **Tone:** precise, engineering, no hype words ("revolutionary", "moon"). Short declarative sentences. Numbers everywhere. Think Linear / Vercel / Arbitrum docs — not meme.
- **Required disclaimers (footer + whitepaper + bridge):**
  - "AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules; bStocks are not available to US persons and are restricted in other jurisdictions."
  - "Nothing here is investment advice. $AGENT confers no rights to revenue, equity, or returns; fee distributions are protocol parameters that governance can change."
  - Beta notice on bridge/devnet pages: "Devnet tokens have no value."

## 6. Repo layout

```
agent-chain/              (absolute path: E:\scash\agent-chain)
  SPEC.md                 ← this file
  apps/web/               ← Next.js 15 website (hero 3D, whitepaper, roadmap, builders, genesis, bridge preview)
  apps/explorer/          ← Next.js 15 block explorer (reads any EVM JSON-RPC via viem)
  apps/devnet/            ← Hardhat node devnet (chainId 11190, 250 ms interval), contracts, activity bot, Dockerfile, fly.toml
  docs/whitepaper.en.md   ← whitepaper v0.1 (English)
  docs/whitepaper.zh.md   ← 白皮书 v0.1（中文）
  docs/roadmap.en.md / docs/roadmap.zh.md
```

Each app: own `package.json`, `Dockerfile`, `fly.toml`, deployable with `fly deploy --remote-only` from the app directory (no local Docker available). Node 20+ in Docker images.

## 7. Contracts on devnet (apps/devnet deploys, others reference)

- `AgentRegistry` — maps address → bytes32 handleHash + bool active; owner-set mirror of BSC Agent ID state. `isAgent(address) view returns (bool)`.
- `GenesisSeat` — non-transferable ERC-721-like with sequential `seatId`; `mint()` once per address (on devnet: open to anyone; on mainnet: requires Agent ID). Events `SeatMinted(address,uint256)`.
- `FeeKeeper` (stub) — stores `usdPerGas` and `antbUsdPrice`, emits `BaseFeeUpdated`.
Addresses are written by the devnet deploy script to `apps/devnet/deployments/devnet.json` and should be read by the website at build time if present (fallback to "TBA").

## 8. Binance integration surface (Phase 1–2)

Hackathon scoring (Agent ID Hackathon, submissions until 2026-12-09 08:00 UTC) counts **only BSC-side contracts** interacted with by Agent ID holders. The L2 itself is not scored. Therefore:

- **Scored BSC contracts (mainnet, BscScan-verified, open source, owner permissions documented in README):** `Bridge` (deposit ANTB → L2), `GenesisSeatClaim` (Agent ID holders claim their seat; mirrors to L2), `$AGENT` token (Flap), `AgentRegistryMirror` (BSC-side registry read by the bridge). Submit all four addresses.
- **Agent ID check:** `IERC721(0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F).balanceOf(addr) > 0` (or BAB). Claimed only inside the Binance App (Wallet → banner → Agent ID); website onboarding step 1 says exactly this.
- **Agentic Wallet (`baw` CLI, npm `@binance/agentic-wallet`):** supports `wallet agent-id`, `contract-call preview` / `contract-call execute` (dev mode) and `wallet send`. Our Skill drives BSC-side steps through `baw contract-call`; L2-side steps go through our RPC. The L2 cannot be added to Agentic Wallet's chain list (controlled by Binance) — do not promise it.
- **Skill (`skills/agent-chain/SKILL.md` in Skills Hub format):** frontmatter + command-routing table + `references/`. Routes: check Agent ID → bridge ANTB → claim Genesis Seat → my seat → send / call on AGENT CHAIN → fee estimate. Every state-changing step requires explicit user confirmation; no prompt may bypass confirmation; no "look up someone's wallet by name" capability.
- **MCP server (optional, small):** `get_head`, `get_block`, `get_tx`, `is_agent`, `fee_estimate`, `bridge_quote` over our RPC + explorer `/api/*`, for Agent OS.
- **LIVE on BSC mainnet (chainId 56), deployed 2026-11-20, BscScan-verified, owner = deployer EOA `0x0F03F1c68d4105dd97011c15cC61467164583A4C`:**
  - `AgentRegistryMirror` `0x9C5488f9Aa9468B1db3Cc6B71143A8B2Ca810CF0` — `register()` (Agent ID/BAB holders, once), `count()`, `isRegistered(a)`, `indexOf(a)`, `registeredAt(a)`, `agentAt(i)`; event `AgentRegistered(address indexed agent, uint256 index)`.
  - `GenesisSeatClaim` `0x3972579dd0128BF0b6778cB3B457ba1d14D1695b` — ERC-721 `SEAT`, `claim()` once per Agent ID/BAB holder, `seatOf(a)`, `totalSeats()`, `claimOpen()`, on-chain SVG `tokenURI`; non-transferable; event `SeatClaimed(address indexed holder, uint256 indexed seatId)`.
  - `Bridge` `0x9eF8CA94a74B7Fbc5ae0b1F7a2dCaFCa14eE2A92` — `deposit(uint256 amount, address l2Recipient)` after `ANTB.approve`; **Genesis Deposit window is OPEN**: caps `perAddressCap = 0.1 ANTB`, `globalCap = 100 ANTB` (owner `setCaps` raises to 1/500 when the Nitro chain is live); views `depositedBy(a)`, `remainingFor(a)`, `remainingGlobal()`, `totalDeposited()`, `depositCount()`, `pendingDeposits()`, `paused()`; event `Deposited(address indexed from, address indexed l2Recipient, uint256 amount, uint256 indexed nonce)`. Rule: every deposit made before mainnet launch is credited 1:1 as a native ANTB balance in block 0 of AGENT CHAIN, ordered by nonce ("first across"). Beta escrow: owner `withdrawTo` exists and MUST be disclosed next to every deposit UI, together with the trading risk warning.
  - Credentials: Agent ID `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` or BAB `0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8`. ANTB `0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53`.
  - `$AGENT` token: NOT launched yet (explicit decision; do not show a contract address or "buy" CTA).
- **Submission package:** project name, website, 4 contract addresses, Agent ID usage description, GitHub (open source), risk warning on bridge/trading pages, no "returns" language (Genesis Seat described as identity + priority; fee distribution described as a governance parameter, not a promise).

