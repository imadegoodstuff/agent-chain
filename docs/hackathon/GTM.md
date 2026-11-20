# AGENT CHAIN — 19-day go-to-market for the Agent ID Hackathon

Goal: **≥ 30 unique Agent ID addresses** (floor for Application Innovation) and **300+** (target, Ecosystem Pioneer ranking) interacting with our four BSC contracts before **2026-12-09 08:00 UTC**, with zero sybil, zero paid interaction farming, zero bots.

Window: **D0 = Thu 2026-11-20 → D18 = Tue 2026-12-08** (submit D18 evening UTC+8; deadline is 16:00 UTC+8 on Dec 9).

## 0. Principles (compliance first)

| Principle | What it means in practice |
|---|---|
| One human, one Agent ID, one interaction set | Agent ID is non-transferable and one per KYC'd human; all three scored write functions gate on it. There is nothing to farm with extra wallets, and we never suggest otherwise. |
| No payments for interactions | No "claim and receive $AGENT", no referral bounties, no paid raids. The Genesis Seat is the only thing a user gets, and it is identity + priority, not value. |
| No scripted claims on behalf of users | Our skill and bots never hold keys. Every claim is a user's own `baw contract-call execute` or wallet signature after a preview. |
| No return language | Banned: earn, yield, APY, income, passive income, dividend, returns, profit, guaranteed, moon. Allowed: seat, number, priority, membership, genesis, identity, gas, fee, USD-stable. |
| Risk warning everywhere a tx or token is mentioned | Every post that links to claim/bridge/Flap carries the short risk line and the independence disclaimer. |
| No name→wallet lookup | The Genesis page shows seat **counts** and a user's **own** seat (connect or paste own address). No public "find alice.ai" search. |

## 1. What a user actually does (the funnel)

```
Has Binance App ──► claims Agent ID (in-App, Wallet → banner → Agent ID)   [not ours, not scored]
      │
      ▼
agent-chain.agency/genesis  or  skill in their agent
      │
      ├─► 1. AgentRegistryMirror.register()      [scored, gas only]
      ├─► 2. GenesisSeatClaim.claim()  → seat #N  [scored, gas only]   ◄── the hero action
      ├─► 3. Bridge.deposit(≤ 1 ANTB)            [scored, needs ANTB]  ◄── for ANTB holders
      └─► 4. buy/hold $AGENT on Flap             [scored, open to all] ◄── for Flap community
```

The hero action is **claim your Genesis Seat**: it costs only BSC gas, needs no ANTB, is a single `claim()` tx, and gives the user something visible and numbered. `register()` is independent (the contracts do not require it for `claim` or `deposit`), but we ask every user to do both — registration is what gets the address mirrored to the L2 sequencer allow-list — so the standard flow is two txs, each with its own preview and confirmation. Steps 3–4 are for the subset who already hold ANTB or follow Flap launches.

Addressable base: **236,355 Agent ID holders** as of block 134,639,601 (2026-11-20; `contracts/bsc/scripts/snapshot.ts`). The 30-address floor is 0.013% of that; 300 is 0.13%.

Conversion assumptions: 3,000 impressions → 300 site visits → 120 Agent ID holders start → 60–80 complete register + claim. Repeat across channels and days to reach 300.

## 2. Dependencies and dates

| Dependency | Owner | Needed by |
|---|---|---|
| `AgentRegistryMirror` + `GenesisSeatClaim` on BSC mainnet, verified, README with owner permissions | contracts/bsc | **D5 (Nov 25)** — these two do not depend on the L2 mainnet; deploy them first so the claim window is as long as possible |
| Genesis page on agent-chain.agency with live seat counter + "my seat" + Agentic Wallet instructions | apps/web | D5 |
| Skill PR opened to binance/binance-skills-hub | this package | D3 (Nov 23), merge whenever |
| MCP HTTP endpoint deployed (`agentchain-mcp.fly.dev`) | this package | D6 |
| `Bridge` on BSC mainnet (caps 1 / 500) + L2 Mainnet Beta | contracts/bsc, apps/chain | D12 (Dec 2) |
| `$AGENT` launch on Flap (ANTB pool) | team | D13 (Dec 3) |
| Submission form + video | team (`<HUMAN>`) | D18 (Dec 8) |

If Bridge / $AGENT slip, the submission still stands on Mirror + SeatClaim; the 30-address floor should be met by D9 from seats alone.

## 3. Day-by-day plan

| Day | Date | Build | Distribution | Metric checkpoint |
|---|---|---|---|---|
| D0 | Thu Nov 20 | Skill, MCP, submission draft (this package). Devnet live. | Soft teaser on X: devnet is live, 250 ms blocks, "every account is a human's agent". | — |
| D1 | Fri Nov 21 | Testnet contracts on BSC Testnet; dry-run skill end-to-end with a real Agentic Wallet in Developer Mode. | Open Discord + Telegram. Pin "what AGENT CHAIN is / is not" + disclaimers. | — |
| D2 | Sat Nov 22 | Fix anything the dry run surfaced. Record raw footage. | Whitepaper thread (EN) on X. ZH version on Binance Square. | — |
| D3 | Sun Nov 23 | Open Skills Hub PR (`skills/agent-chain`). | Post in BNB Chain developer channels: "skill + MCP for an Agent ID-gated L2". | — |
| D4 | Mon Nov 24 | Mainnet deploy rehearsal; multisig set up; BscScan verification script. | Reach out to 10 Agent ID campaign KOLs / Square creators with the one-pager (no paid promotion, offer early seat numbers only in the sense that seats are sequential). | — |
| **D5** | **Tue Nov 25** | **Deploy `AgentRegistryMirror` + `GenesisSeatClaim` on BSC mainnet.** Genesis page live. | **Launch: "Genesis Seats open" X thread + Binance Square post + TG/Discord announcement.** Community Promotion post with #BinanceWalletHackathon #AgenticWallet. | Day-1 target: 30 seats (floor met) |
| D6 | Wed Nov 26 | Deploy MCP HTTP endpoint; list in Agent OS / MCP directories. | "Ask your agent to check its seat" post showing the skill in Claude/Cursor/OpenClaw. | 50 |
| D7 | Thu Nov 27 | Seat counter milestones automation (bot posts at 50/100/200/300 — counts only, no addresses). | Flap community: ANTB holder post (ZH + EN) — "the chain where ANTB is gas". | 70 |
| D8 | Fri Nov 28 | Fee keeper mainnet dry run. | X Space / Binance Live (30 min): "Why identity-gated sequencing is a performance feature". | 100 |
| D9 | Sat Nov 29 | — | Weekend recap thread: seats claimed, blocks produced, fee at current ANT price. | 120 |
| D10 | Sun Nov 30 | Bridge testnet soak. | ZH community AMA in TG. | 140 |
| D11 | Mon Dec 1 | Bridge audit-lite review (internal), caps verified. | Developer post: how to read AGENT CHAIN from any MCP client in 3 lines. | 160 |
| **D12** | **Tue Dec 2** | **Bridge live on BSC mainnet (1 ANTB / 500 total), L2 Mainnet Beta.** | "Bridge is open" thread with the full bridging risk warning. First 1-ANTB deposits are from the team (disclosed). | 180 seats; first 20 deposits |
| **D13** | **Wed Dec 3** | **$AGENT launch on Flap, ANTB pool, open to all wallets.** | Flap launch post (facts only: pool, no cap, no team fee, no Agent ID needed to hold). Risk warning. | 200 |
| D14 | Thu Dec 4 | — | Second KOL wave; Square article "Genesis is human: how the snapshot works". | 230 |
| D15 | Fri Dec 5 | Snapshot block announced (for genesis). | "Snapshot in 72 h" reminder — accurate, not FOMO: claims after the snapshot still work, they just are not in block 0. | 260 |
| D16 | Sat Dec 6 | Final video edit; README sweep. | Weekend recap. | 280 |
| D17 | Sun Dec 7 | Submission dry run: all links, addresses, checklist in `SUBMISSION.md`. | — | 300 |
| **D18** | **Mon Dec 8** | **Submit** (before 23:00 UTC+8 to leave margin to the Dec 9 08:00 UTC deadline). | "Submitted" post; thank-you to seat holders by count. | final |

## 4. Channels

| Channel | Format | Audience | Notes |
|---|---|---|---|
| X / Twitter | 2 long threads (whitepaper, genesis launch), daily single posts, 1 Space | crypto-native agent builders, Agent ID campaign participants | Community Promotion sub-campaign post must carry `#BinanceWalletHackathon #AgenticWallet` |
| Binance Square | 3 articles (ZH first, EN second): what it is / genesis open / how the snapshot works | Binance App users who already have Agent ID | Highest-intent channel: readers are one tap from Wallet → Agent ID |
| Skills Hub PR + README | the skill itself | people whose agents already use `baw` | A merged skill is distribution: "ask your agent to claim your Genesis Seat" |
| MCP directories / Agent OS | `agentchain-mcp` listing | Agent OS users, Claude/Cursor users | Read-only; shows the chain is real before users touch BSC |
| Flap community (ANTB pool) | ZH + EN posts in Flap/Pancake ANTB groups | ANTB holders | They can bridge and trade $AGENT; still no return language |
| Telegram + Discord | announcement channel + read-only bot | community | Bot commands: `/status`, `/seats`, `/fee <gas>`, `/myseat <own address>`; bot never signs, never resolves names |
| BNB Chain dev community / Agent Studio | dev post | builders | Position the MCP + skill as reference integrations |
| KOLs / Square creators | one-pager + early access to the claim page | their followers | No payment for posts; disclosed if anyone is compensated |

## 5. Measurement

- Source of truth: BscScan event logs — `AgentRegistered(address indexed agent, uint256 index)`, `SeatClaimed(address indexed holder, uint256 indexed seatId)`, `Deposited(address indexed from, address indexed l2Recipient, uint256 amount, uint256 indexed nonce)`, `$AGENT Transfer`. Count **unique addresses with Agent ID `balanceOf > 0`** (all three write functions are `onlyAgent`, so this is guaranteed for ours; $AGENT holders are filtered against the Agent ID snapshot). `AgentRegistryMirror.count()` and `GenesisSeatClaim.totalSeats()` give the live totals.
- Public: seat counter on the Genesis page and in the TG/Discord bot (counts only).
- Daily checkpoint in the table above; if below 60% of target on D9, shift budget of effort to Binance Square + KOL wave 2 rather than adding incentives.

## 6. Copy drafts

All copy ends with the short disclaimer. Replace `<GENESIS_URL>` with the live page.

### 6.1 X — Genesis launch thread (EN, D5)

1/ Genesis Seats for AGENT CHAIN are open.

AGENT CHAIN is an agent-native L2 on BNB Smart Chain. Gas is ANTB. Every account is a Binance Agent ID holder. 250 ms blocks, no mempool, no bots.

If you hold an Agent ID, you can claim a numbered seat in block 0. 🧵

2/ Why identity at the sequencer?
Agents pay, bid and settle hundreds of times an hour. They can't tell one counterparty from a thousand puppets. We gate inclusion on `isAgent(tx.origin)` — one KYC'd human per address — so FCFS, no mempool and no tips are safe.

3/ Why ANTB as gas?
Fees are quoted in USD and settled in ANTB. A keeper re-prices the base fee from the ANTB market every 5 minutes. A transfer is ≈ $0.001 whether ANT is $60 or $300.

4/ What is a Genesis Seat?
A numbered, non-transferable token for Agent ID holders who join before mainnet. It's identity and priority: seat #1 is seat #1 forever. It is not an investment and promises no payment.

5/ How to claim (2 txs, gas only):
→ Claim your Agent ID in the Binance App (Wallet → Agent ID banner)
→ <GENESIS_URL>: register, then claim
→ Or tell your agent: "claim my Genesis Seat on AGENT CHAIN" — the `agent-chain` skill drives it through your own Agentic Wallet with a full calldata preview before you confirm.

6/ Live now: devnet RPC + explorer, whitepaper, skill, MCP server. Mainnet Beta and the bridge (1 ANTB/address cap) follow in December.

Code: <GITHUB_URL>
Docs: https://agent-chain.agency

7/ Risk: new, unaudited contracts; single sequencer; irreversible txs. DYOR.
AGENT CHAIN is independent and not affiliated with Anthropic, Binance or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks), not available to US persons. Not investment advice.

### 6.2 X — Genesis 发布线程（ZH，D5）

1/ AGENT CHAIN 的 Genesis Seat 开放领取了。

AGENT CHAIN 是 BNB Smart Chain 上的 agent 原生 L2。Gas 是 ANTB，每个账户都是一位 Binance Agent ID 持有者。250 ms 出块，无公开内存池，无机器人。

持有 Agent ID，就可以在创世区块里领一个带编号的席位。🧵

2/ 为什么在排序器层做身份校验？
Agent 每小时要支付、出价、结算几百次，却分不清对手方是一个人还是一千个马甲。我们在打包前检查 `isAgent(tx.origin)` —— 一个实名人一个地址 —— 所以先到先得、无内存池、关闭小费都是安全的。

3/ 为什么用 ANTB 做 gas？
手续费按美元报价、用 ANTB 结算。Keeper 每 5 分钟按 ANTB 市场价重新定价。无论 ANT 是 60 美元还是 300 美元，一笔转账都约 0.001 美元。

4/ Genesis Seat 是什么？
主网前加入的 Agent ID 持有者获得的、带编号的不可转让代币。它代表身份和优先级：1 号席位永远是 1 号。它不是投资，也不承诺任何支付。

5/ 怎么领（两笔交易，只付 gas）：
→ 在 Binance App 领取 Agent ID（钱包 → Agent ID 横幅）
→ 打开 <GENESIS_URL>：先注册，再领取
→ 或直接对你的 agent 说："在 AGENT CHAIN 上领取我的 Genesis Seat" —— `agent-chain` skill 会通过你自己的 Agentic Wallet 执行，确认前完整展示 calldata。

6/ 现已上线：devnet RPC + 浏览器、白皮书、skill、MCP server。主网 Beta 和跨链桥（每地址上限 1 ANTB）12 月上线。

代码：<GITHUB_URL>
文档：https://agent-chain.agency

7/ 风险提示：合约为新代码、未经审计；单一排序器；交易不可撤销。请自行研究（DYOR）。
AGENT CHAIN 为独立项目，与 Anthropic、Binance、BNB Chain 无关联。ANTB 由 BTech Holdings Ltd（bStocks）发行，不向美国人士提供。本内容不构成投资建议。

### 6.3 X — Community Promotion post (EN, D5; required hashtags)

I'm building AGENT CHAIN for the Agent ID Hackathon: an L2 on BNB Smart Chain where every account is an Agent ID holder and gas is ANTB, priced in USD.

Live: devnet, explorer, a Skills Hub-format skill that drives onboarding through your own Agentic Wallet (preview → you confirm → execute), and an MCP server for Agent OS.

If you hold an Agent ID, claim your numbered Genesis Seat: <GENESIS_URL>

Risk: new unaudited contracts, irreversible txs, DYOR. Independent project, not affiliated with Binance or Anthropic. Not investment advice.

#BinanceWalletHackathon #AgenticWallet

### 6.4 X — Community Promotion 帖（ZH）

我正在为 Agent ID 黑客松构建 AGENT CHAIN：BNB Smart Chain 上的 L2，每个账户都是 Agent ID 持有者，gas 是按美元计价的 ANTB。

已上线：devnet、浏览器、Skills Hub 格式的 skill（通过你自己的 Agentic Wallet 完成：预览 → 你确认 → 执行），以及给 Agent OS 用的 MCP server。

持有 Agent ID 的话，来领你的编号 Genesis Seat：<GENESIS_URL>

风险提示：合约为新代码、未审计，交易不可撤销，请 DYOR。独立项目，与 Binance、Anthropic 无关联。不构成投资建议。

#BinanceWalletHackathon #AgenticWallet

### 6.5 Binance Square article (ZH, D5) — 《每个账户背后是一个真人的 agent：AGENT CHAIN Genesis Seat 开放》

**它是什么。** AGENT CHAIN 是 BNB Smart Chain 上的 agent 原生 Layer 2，基于 Arbitrum Nitro。两件事和其他 L2 不同：gas 是 ANTB（bStocks 发行的 Anthropic 股票代币，1:1 从 BSC 桥入），手续费按美元定价；排序器只打包持有 Binance Agent ID 的地址发出的交易，所以链上没有机器人、没有马甲、没有三明治攻击。

**Genesis Seat 是什么。** 主网上线前，所有在 BSC 上完成领取的 Agent ID 持有者会被写进创世区块，每人一个带编号、不可转让的席位。编号按领取顺序。目前共有 236,355 位 Agent ID 持有者（区块 134,639,601），每一位都有资格领取。它表示你是这条链的创始成员，有优先级；它不是投资，不承诺任何收益。

**怎么领（只付 BSC gas）。**
1. 在 Binance App：钱包 → Agent ID 横幅 → 领取你的 .ai 名字。
2. 打开 <GENESIS_URL>，用 Agentic Wallet 完成 `register()`，再完成 `claim()`。每一步都会先显示完整的合约地址和 calldata，你确认后才签名。
3. 或者让你的 agent 来做：安装 `agent-chain` skill，说"领取我的 Genesis Seat"。skill 走的是 `baw contract-call preview → execute`，永远不会跳过你的确认。

**合约。** 四个 BSC 合约全部开源，BscScan 已验证，owner 权限在 README 中公开：`AgentRegistryMirror`、`GenesisSeatClaim`、`Bridge`（Beta 期每地址 1 ANTB、总量 500 ANTB 上限）、`$AGENT`（Flap 上以 ANTB 池公开发射，持有不需要 Agent ID）。

**风险提示。** 合约为新代码、未经完整审计；单一排序器；跨链桥在 Beta 期有上限；ANTB 由 BTech Holdings Ltd 在 ADGM 规则下发行，不向美国人士提供，发行方可暂停转账。交易不可撤销。请只使用你能承受损失的资金，并自行研究。

AGENT CHAIN 为独立项目，与 Anthropic、Binance、BNB Chain 无关联、无背书。本文不构成投资建议。$AGENT 不代表任何收入、股权或回报权利；手续费分配是治理可更改的协议参数。

### 6.6 Binance Square article (EN, D6) — "Every account is a human's agent: AGENT CHAIN Genesis Seats are open"

**What it is.** AGENT CHAIN is an agent-native Layer 2 on BNB Smart Chain built on Arbitrum Nitro. Two things differ from other L2s: gas is ANTB (the bStocks tokenized Anthropic stock, bridged 1:1 from BSC) priced in USD by an on-chain keeper, and the sequencer only includes transactions from Binance Agent ID holders — so there are no bots, no sybils and no sandwich attacks.

**What a Genesis Seat is.** Before mainnet, every Agent ID holder who claims on BSC is written into block 0 with a numbered, non-transferable seat. Numbering follows claim order. There are 236,355 Agent ID holders today (block 134,639,601); every one of them is eligible. A seat says you were a founding member and gives priority; it is not an investment and promises no payment.

**How to claim (BSC gas only).**
1. In the Binance App: Wallet → Agent ID banner → claim your `.ai` name.
2. Open <GENESIS_URL> and complete `register()` then `claim()` with your Agentic Wallet. Each step shows the full contract address and calldata before you sign.
3. Or let your agent do it: install the `agent-chain` skill and say "claim my Genesis Seat". It uses `baw contract-call preview → execute` and never skips your confirmation.

**Contracts.** Four BSC contracts, all open source and BscScan-verified, owner permissions in the README: `AgentRegistryMirror`, `GenesisSeatClaim`, `Bridge` (Beta caps 1 ANTB/address, 500 total), `$AGENT` (open launch on Flap with an ANTB pool; no Agent ID needed to hold it).

**Risk.** New, not fully audited contracts; a single sequencer; bridge caps during Beta; ANTB is issued by BTech Holdings Ltd under ADGM rules, not available to US persons, and its issuer can pause transfers. Transactions are irreversible. Use only funds you can afford to lose and do your own research.

AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. Not investment advice. $AGENT confers no rights to revenue, equity, or returns; fee distributions are protocol parameters that governance can change.

### 6.7 Flap / ANTB holder community post (EN + ZH, D7 and D13)

EN: ANTB holders — AGENT CHAIN uses ANTB as native gas, priced in USD and bridged 1:1 from BSC. Bridge opens Dec 2 with Beta caps (1 ANTB per address, 500 total) and requires a Binance Agent ID. $AGENT launches on Flap Dec 3 with an ANTB pool, open to any wallet, no cap, no team fee. Details and the full bridging risk warning: https://agent-chain.agency/bridge. Not affiliated with Binance or Anthropic; not investment advice; $AGENT confers no rights to revenue or returns.

ZH：ANTB 持有者 —— AGENT CHAIN 以 ANTB 作为原生 gas，按美元定价，从 BSC 1:1 桥入。跨链桥 12 月 2 日开放，Beta 期每地址 1 ANTB、总量 500 ANTB 上限，需要 Binance Agent ID。$AGENT 12 月 3 日在 Flap 以 ANTB 池发射，任何钱包可参与，无上限，无团队手续费。详情与完整跨链风险提示：https://agent-chain.agency/bridge。与 Binance、Anthropic 无关联；不构成投资建议；$AGENT 不代表任何收入或回报权利。

### 6.8 Telegram / Discord announcement (EN + ZH, D5)

EN: **Genesis Seats are open.** If you hold a Binance Agent ID: register, then claim at <GENESIS_URL> (BSC gas only, two txs, full calldata preview before each). Or ask your agent with the `agent-chain` skill. Seat counter: `/seats`. Your own seat: `/myseat <your address>`. We will never DM you first, never ask for keys, and never ask you to scan a QR code outside the Binance App. Risk: new unaudited contracts, irreversible txs, DYOR. Not affiliated with Binance or Anthropic.

ZH：**Genesis Seat 开放领取。** 持有 Binance Agent ID 的话：先注册，再到 <GENESIS_URL> 领取（只付 BSC gas，两笔交易，每笔都先显示完整 calldata）。也可以让装了 `agent-chain` skill 的 agent 帮你做。席位计数：`/seats`。查自己的席位：`/myseat <你的地址>`。我们不会主动私信你，不会索要私钥，也不会让你在 Binance App 之外扫码。风险提示：合约为新代码、未审计，交易不可撤销，请 DYOR。与 Binance、Anthropic 无关联。

### 6.9 One-pager for KOLs / Square creators (EN)

- What: AGENT CHAIN, an L2 on BSC where every account is an Agent ID holder and gas is ANTB priced in USD.
- Ask: tell your audience that Agent ID holders can claim a numbered Genesis Seat at <GENESIS_URL>; show the preview → confirm flow.
- Do not say: earn, airdrop, returns, APY, "get in early for profit". Do say: identity, priority, seat number, founding member.
- Must include: the risk line and "not affiliated with Binance or Anthropic; not investment advice".
- Compensation: none. If any creator is compensated, they disclose it.

## 7. What we will not do

- No paid "complete 3 interactions, get X" quests; no referral rewards; no raffles for $AGENT tied to contract interactions.
- No scripts, bots or relayers that call the contracts on users' behalf.
- No public handle→wallet search, leaderboard with names, or "who holds seat #N" lookups beyond what the user does for their own address.
- No countdown FOMO beyond stating the actual snapshot block and what it means.
- No claims about Binance, BNB Chain or Anthropic endorsement.
