# AGENT CHAIN

**Intelligence is gas.** An agent-native Layer 2 on BNB Smart Chain, built with the Arbitrum Nitro stack.

- **Gas is tokenized AI equity.** The native gas token is **ANTB** — bStocks' tokenized Anthropic stock (BEP-20 on BSC, `0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53`), bridged 1:1 into AGENT CHAIN. Fees are quoted in USD and settled in ANTB; a fee keeper re-prices the base fee from the ANTB market every 5 minutes.
- **Accounts are Binance Agent IDs.** The sequencer only includes transactions from addresses holding a Binance Agent ID (ERC-721, one per KYC'd human, non-transferable) or a BAB token. Every address is a verified human's agent. No bots, no sybils, no sandwiches.
- **Genesis is human.** Agent ID holders are snapshotted on BSC and written into block 0, each with a numbered, non-transferable **Genesis Seat** and a small native balance.
- **Settles to BSC.** Rollup mode, calldata posted to BSC, BoLD fraud proofs, permissioned validators at launch.
- **Fast.** 250 ms blocks, first-come-first-served ordering, no public mempool, signed preconfirmations, Stylus (Rust/WASM) enabled.

## Live

| | URL |
|---|---|
| Website | <https://agent-chain.agency> |
| Explorer | <https://explorer.agent-chain.agency> |
| Devnet RPC (chainId `11190` / `0x2BB6`) | <https://rpc.agent-chain.agency> |
| MCP server (read-only, Streamable HTTP) | <https://agentchain-mcp.fly.dev/mcp> |
| Agent skill | [`skills/agent-chain/SKILL.md`](skills/agent-chain/SKILL.md) |
| Whitepaper | [EN](docs/whitepaper.en.md) · [中文](docs/whitepaper.zh.md) |

Devnet tokens (tANTB) have no value.

## BSC mainnet contracts (chainId 56)

Deployed 2026-11-20, source-verified on BscScan. Owner: deployer EOA `0x0F03F1c68d4105dd97011c15cC61467164583A4C`. Owner permissions are documented in [`contracts/bsc/README.md`](contracts/bsc/README.md).

| Contract | Address | Purpose |
|---|---|---|
| `AgentRegistryMirror` | [`0x9C5488f9Aa9468B1db3Cc6B71143A8B2Ca810CF0`](https://bscscan.com/address/0x9C5488f9Aa9468B1db3Cc6B71143A8B2Ca810CF0#code) | `register()` — opt-in registry for Agent ID / BAB holders |
| `GenesisSeatClaim` | [`0x3972579dd0128BF0b6778cB3B457ba1d14D1695b`](https://bscscan.com/address/0x3972579dd0128BF0b6778cB3B457ba1d14D1695b#code) | `claim()` — soulbound ERC-721 `SEAT`, on-chain SVG metadata |
| `Bridge` | [`0x9eF8CA94a74B7Fbc5ae0b1F7a2dCaFCa14eE2A92`](https://bscscan.com/address/0x9eF8CA94a74B7Fbc5ae0b1F7a2dCaFCa14eE2A92#code) | `deposit(amount, l2Recipient)` — ANTB escrow, Beta caps, credited 1:1 on AGENT CHAIN by the Beta relayer within minutes, ordered by nonce ([status](https://agentchain-relayer.fly.dev/status)) |
| `$AGENT` token | not launched | will launch on Flap with an ANTB pool |

Credentials checked by all three: Agent ID [`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`](https://bscscan.com/address/0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F) or BAB [`0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8`](https://bscscan.com/address/0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8).

The Bridge is a Beta escrow: the owner has a `withdrawTo` function, and deposit caps apply (`perAddressCap`, `globalCap`). This is disclosed next to every deposit UI together with the trading-risk warning.

## Repository layout

```
apps/web/            Next.js 15 website (hero, whitepaper, roadmap, genesis, bridge)
apps/explorer/       Next.js 15 block explorer for any EVM JSON-RPC (viem) + /api/*
apps/devnet/         Hardhat devnet (chainId 11190, 250 ms blocks), L2 contracts, activity bot
apps/chain/          Nitro rollup deployment on BSC: RollupCreator, fee-token pricer, node config, gateway
apps/mcp/            Read-only MCP server (head, block, tx, is_agent, fee_estimate, genesis_stats)
contracts/bsc/       BSC-side contracts: AgentRegistryMirror, GenesisSeatClaim, Bridge (Hardhat)
skills/agent-chain/  Agent skill in Binance Skills Hub format (SKILL.md + references/)
docs/                Whitepaper, roadmap, FAQ (EN / 中文), hackathon submission notes
brand/               Logos and social assets
SPEC.md              Shared build spec — source of truth for every sub-project
```

Each app has its own `package.json`, `Dockerfile` and `fly.toml` and deploys with `fly deploy --remote-only` from its directory. Node 20+.

## Running locally

```bash
# Website / explorer
cd apps/web      && npm install && npm run dev        # http://localhost:3000
cd apps/explorer && npm install && npm run dev        # set NEXT_PUBLIC_RPC_URL (see .env.example)

# Devnet (single node, 250 ms blocks) + L2 contracts + activity bot
cd apps/devnet && npm install
npm run node                                          # :8545, chainId 11190
npm run deploy && npm run bot                         # writes deployments/devnet.json

# BSC contracts
cd contracts/bsc && npm install
cp .env.example .env                                  # DEPLOYER_PRIVATE_KEY, BSCSCAN_API_KEY
npm test && npm run test:fork                         # unit + BSC mainnet-fork tests
npm run deploy:testnet / deploy:mainnet / verify:mainnet

# Nitro rollup on BSC (see apps/chain/README.md for the full launch runbook)
cd apps/chain && npm install && cp .env.example .env && npm run keys:generate

# MCP server
cd apps/mcp && npm install && npm run build
npm run smoke                                         # calls every tool against the live devnet
npm start                                             # stdio;  npm run start:http → :8080/mcp
```

## Agent skill

[`skills/agent-chain/`](skills/agent-chain/) lets an agent check the user's Agent ID, register, claim a Genesis Seat, bridge ANTB through the user's own Binance Agentic Wallet (`baw contract-call preview` → explicit confirmation → `execute`), and read status/fees on AGENT CHAIN. Every write requires a calldata preview and an explicit user confirmation; approvals are exact-amount only; there is no name-based wallet lookup and no credential collection. See [`skills/README.md`](skills/README.md) for install instructions.

## Security

- Private keys and API keys live only in gitignored `.env` files. Nothing in this repository contains a key; public operational addresses are listed in [`apps/chain/keys/ADDRESSES.md`](apps/chain/keys/ADDRESSES.md).
- Contract design, owner permissions, test coverage and known limitations of the BSC contracts: [`contracts/bsc/README.md`](contracts/bsc/README.md). The contracts have **not** been externally audited. Bridge deposits are Beta escrow with caps; use small amounts.
- Report vulnerabilities privately via GitHub Security Advisories on this repository.

## License

[MIT](LICENSE) © AGENT CHAIN contributors.

## Disclaimers

AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules; bStocks are not available to US persons and are restricted in other jurisdictions.

Nothing here is investment advice. $AGENT confers no rights to revenue, equity, or returns; fee distributions are protocol parameters that governance can change. Genesis Seats are identity and priority credentials. Devnet tokens have no value.
