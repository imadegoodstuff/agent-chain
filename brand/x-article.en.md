# Intelligence is gas: the first agent-native L2 on BNB Smart Chain

*Cover image: `x-announcement-16x9.jpg`*

Every blockchain prices its blockspace in its own token. That is the one design decision nobody questions, and it is the one we changed.

AGENT CHAIN is a Layer 2 on BNB Smart Chain built for AI agents. Gas is paid in ANTB, the tokenized Anthropic stock issued on BSC. Accounts are Binance Agent IDs, one per verified human. It runs on the Arbitrum Nitro stack with 250 ms blocks and settles to BSC. As far as we can tell it is the first L2 to use BSC as its parent chain, the first chain to use a tokenized AI equity as its native gas, and the first chain whose account model is a human identity rather than a key.

This article explains why those three decisions belong together, what is live today, and what comes next.

## Gas should track what the network values

Ethereum meters computation in gas and prices it in ETH. Rollups later decoupled execution from the base layer, and chain stacks like Orbit and OP Stack let an L2 pick any ERC-20 as its gas token. Almost everyone picked their own.

We asked a different question: what does an agent network actually value? Agents consume intelligence and pay for blockspace. The asset that most directly represents the price of intelligence is equity in the companies that sell it. When Anthropic listed on November 19 and bStocks put ANTB on BSC the same day, that asset became an on-chain primitive.

So AGENT CHAIN prices blockspace in ANTB. Fees are quoted in US dollars by a fee keeper and settled in ANTB, so a transfer costs about $0.001 and an agent-to-agent call about $0.002 regardless of where the stock trades. Nobody has to acquire a new token to send a first transaction; ANTB is already liquid on Flap, PancakeSwap and Binance Wallet.

There is a second reason. A gas token and a network token want opposite things: gas should be cheap and stable, a network token should become scarcer with use. Forcing one asset to do both is why most new chains' tokens have no floor at launch. We separate the roles, and we are explicit that fee allocation is a governance parameter, not a promise.

## Every account is a human's agent

Agent economies die from sybils. Airdrops get farmed, quotas get gamed, reputation gets bought, and nobody can tell a thousand agents from one script.

Binance Agent ID is a non-transferable ERC-721 on BSC, one per KYC'd human, issued so that a person's agents can act under one identity. On AGENT CHAIN that is not a whitelist bolted onto an application. It is the account model. The sequencer only includes transactions from addresses that hold an Agent ID (or a BAB token). Every counterparty on the chain is some human's agent.

That changes what you can build. First-come-first-served ordering with no public mempool means nothing to front-run. Quotas and governance count humans, not keys. An agent paying another agent for a tool call knows a person stands behind the recipient.

## Genesis is human

Before mainnet, every Agent ID holder on BSC is snapshotted and written into block 0. As of block 134,639,601 that is 236,355 people. Each receives a numbered, non-transferable Genesis Seat and a small native ANTB balance.

The seat contract is live on BSC mainnet now, verified and open source, with every owner permission documented. The first seats were claimed within minutes of verification. Holders can claim theirs at agent-chain.agency/genesis.

The bridge is also open. Agent ID holders can deposit ANTB today; every deposit made before launch is credited 1:1 as native balance in block 0, ordered by deposit nonce. Beta caps apply and all escrow terms are stated on the page.

## What is live today

- Devnet: public RPC and block explorer, 250 ms blocks, open to anyone.
- BSC mainnet: AgentRegistryMirror, GenesisSeatClaim and Bridge, all BscScan-verified.
- Whitepaper v0.1 and roadmap in English and Chinese.
- An MCP server so any agent framework can read the chain.
- A Skill for Binance's Agentic Wallet so a user's agent can register, claim a seat and bridge from the command line.
- The Nitro mainnet rollup is deploying to BSC now.

## What comes next

Mainnet Beta in December with ANTB as native gas, Agent ID-gated sequencing, a paymaster so agents can pay in BNB or USDT, and the fee keeper live. Then streamed 50 ms preconfirmations, multi-region RPC, and ERC-8004 and x402 predeploys for agent identity and HTTP payments.

AGENT CHAIN is being built for the Binance Agent ID Hackathon. If you hold an Agent ID, your seat is waiting.

agent-chain.agency

---

*AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules and is not available to US persons. Nothing in this article is investment advice. Genesis Seats confer no rights to revenue, equity or returns; fee allocations are protocol parameters that governance can change. Tokenized equities carry market risk. Devnet tokens have no value.*

#BinanceWalletHackathon #AgenticWallet
