# $AGENT — Flap launch sheet — **LAUNCHED 2026-11-20**

**Status: LAUNCHED.** Token `0x8E3318Ef4411b4488429Ff6970602968D7307777` (`AGENT CHAIN` / `AGENT`, 18 dec, 1,000,000,000 supply) via `Portal.newTokenV6` from chain owner `0x8D61bD807Da29C71eAbA6e85Fc42796E357fA443`, tx `0xb9f6a26240c58831c3625650df82d0d58cad61d38789c9267dfe6314fa143365`, block 134,659,029. Quote token ANTB, tax 1%/1% for 365 days → 100% to `0xD800D290F7A87590b9A99295A21dA87D7443FcaB`, no Agent ID gate, PancakeSwap V2 migration at 80% sold. Creator first buy 0.6 ANTB → 15,060,562.91 AGENT (≈1.5% of supply). Flap: https://flap.sh/bnb/0x8E3318Ef4411b4488429Ff6970602968D7307777 · BscScan: https://bscscan.com/token/0x8E3318Ef4411b4488429Ff6970602968D7307777 · DexScreener (after migration): https://dexscreener.com/bsc/0x8E3318Ef4411b4488429Ff6970602968D7307777. Full record: `apps/chain/deployments/mainnet/agent-token.json`.

**Deviation from this sheet:** `dividendToken` was set to ANTB (the quote token) instead of `address(0)` — the Portal reverts with "dividendToken cannot be zero when quoteToken is ERC20". `dividendBps = 0`, so the dividend tracker is inert and **no dividends are paid**; everything else matches the sheet below.

The sheet below is kept as the approved parameter record. It was executed by `apps/chain/scripts/launch-agent-token.ts`, not through the Flap UI.
Owner decision 2026-11-20: open launch (no Agent ID gate, no per-wallet cap), tax 1% / 1% paid 100% to `0xD800D290F7A87590b9A99295A21dA87D7443FcaB`, creator first buy = 0.1 BNB worth (0.62 ANTB already swapped into chain owner `0x8D61…A443`, tx 0xbb1ebbab…8960). No Safe migration planned by owner decision; keep disclosing EOA ownership.

## Token

| Field | Value |
|---|---|
| Name | `AGENT CHAIN` |
| Symbol / Ticker | `AGENT` |
| Logo | `brand/token-logo-1024.png` (also 512 / 256). Square, dark background, gold hex. |
| Description | `The index token of AGENT CHAIN — the first agent-native Layer 2 on BNB Chain. Gas on the chain is tokenized AI equity (ANTB); every account is a verified Agent ID. $AGENT does not pay for gas and promises no yield — it is the protocol's community and governance token. Risk warning: crypto assets can lose all value. agent-chain.agency` |
| Website | `https://agent-chain.agency` |
| X / Twitter | `https://x.com/agent_chainL2` |
| Telegram | (leave empty unless a group exists) |
| GitHub (if field exists) | `https://github.com/imadegoodstuff/agent-chain` |

## Token type and curve

| Field | Value | Why |
|---|---|---|
| Token type | Tax Token (V3) | Only type that supports tax |
| Quote token | **ANTB** (`0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53`) if listed in the dropdown; otherwise BNB | SPEC: ANTB pool. If ANTB is not an approved quote token on the day, fall back to BNB and note it |
| Agent ID gate | **OFF** | Owner chose open launch; chain usage (not the token) is what is gated |
| Migration DEX | PancakeSwap (default) | Tax tokens migrate to a V2 pool at 80% sold |
| Creator first buy | **0.1 BNB worth**. With ANTB as quote token this is entered in ANTB (~0.6 ANTB at ~91 USD/ANTB, 571 USD/BNB — swap first and approve the Portal); if quote = BNB enter `0.1` BNB directly | Owner decision |

## Tax (owner: "1/1")

| Field | Value |
|---|---|
| Buy tax | **1%** |
| Sell tax | **1%** |
| Tax duration | 365 days (max) — can be lowered in the UI if preferred |
| Anti-farmer duration | default (30 days) |

Tax allocation (must total 100%):

| Bucket | Share | Notes |
|---|---|---|
| Creator Funds Wallet | **100%** | Owner decision: entire 1%/1% tax goes to **`0xD800D290F7A87590b9A99295A21dA87D7443FcaB`** (owner's personal wallet). Launch from chain owner `0x8D61…A443`; set the beneficiary / creator-funds receiver field to the 0xD800 address. If the Flap UI has no separate beneficiary field (defaults to launcher), launch via `Portal.newTokenV6` with `beneficiary = 0xD800…FcaB`. |
| Burn | 0% | Owner chose 100% to creator wallet; buy-and-burn, if any, is done manually from treasury and never promised |
| Dividend | 0% | Deliberately 0: "holder dividends" reads as promised yield — a hackathon red line |
| Liquidity | 0% | Can be raised later only via a new token; keep simple |

## Before clicking Launch (checklist)

- [ ] Launch from chain owner `0x8D61…A443` (holds 0.72 ANTB + 0.18 BNB); tax beneficiary = `0xD800D290F7A87590b9A99295A21dA87D7443FcaB`.
- [ ] Name/symbol contain no "Binance", "BNB", "Anthropic".
- [ ] Description contains the risk warning and says $AGENT is not gas and promises no yield.
- [ ] Quote token actually shows ANTB; if not, decide BNB fallback.
- [ ] Agent ID gate toggle is OFF.
- [ ] Tax 1% / 1%, allocation Creator 100 / Burn 0 / Dividend 0 / Liquidity 0.
- [ ] Launching wallet holds the dev-buy amount (~0.6 ANTB if ANTB quote, or 0.1 BNB) plus ~0.02 BNB gas.
- [ ] Screenshot the final form, then launch.

## Right after launch

1. [x] Token address pasted into `SPEC.md` §1/§8, `apps/web/src/lib/spec.ts` (`AGENT_TOKEN`), `skills/agent-chain/references/contracts.md`, `docs/hackathon/SUBMISSION.md`, README tables (2026-11-20).
2. [x] Website Token section is live: price in ANTB/USD, curve progress to migration, Buy on Flap, BscScan, DexScreener (enabled after migration), add-to-wallet, tax / treasury / creator-buy disclosures (`/api/token`, 10 s cache).
3. [ ] Post from @agent_chainL2 with the token address and the same risk line; never post a price target.
