# $AGENT — Flap launch sheet (DO NOT LAUNCH until the owner says go)

Everything below is pre-filled so the launch is a copy-paste job on https://flap.sh/launch (BNB Chain).
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

1. Paste the token address into: `SPEC.md` §1, `apps/web/src/lib/spec.ts` (`AGENT_TOKEN`), `skills/agent-chain/references/contracts.md`, `docs/hackathon/SUBMISSION.md`, README tables.
2. Website Token section flips from "Not launched yet" to live (Flap link + DexScreener).
3. Post from @agent_chainL2 with the token address and the same risk line; never post a price target.
