# $AGENT — Flap launch sheet (DO NOT LAUNCH until the owner says go)

Everything below is pre-filled so the launch is a copy-paste job on https://flap.sh/launch (BNB Chain).
Owner decision 2026-11-20: open launch (no Agent ID gate, no per-wallet cap), tax 1% / 1%.

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
| Creator first buy | `0` | No dev buy — fairer optics for the hackathon |

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
| Creator Funds Wallet | **60%** | Treasury: sequencer/validator ops, batch posting gas. Receiver = chain owner `0x8D61bD807Da29C71eAbA6e85Fc42796E357fA443` (move to the Safe once created) |
| Burn | **40%** | Mirrors the whitepaper's buy-and-burn narrative without promising anything |
| Dividend | 0% | Deliberately 0: "holder dividends" reads as promised yield — a hackathon red line |
| Liquidity | 0% | Can be raised later only via a new token; keep simple |

## Before clicking Launch (checklist)

- [ ] Wallet = chain owner or the Safe; it has ≥ 0.02 BNB for gas.
- [ ] Name/symbol contain no "Binance", "BNB", "Anthropic".
- [ ] Description contains the risk warning and says $AGENT is not gas and promises no yield.
- [ ] Quote token actually shows ANTB; if not, decide BNB fallback.
- [ ] Agent ID gate toggle is OFF.
- [ ] Tax 1% / 1%, allocation 60 / 40 / 0 / 0 = 100%.
- [ ] Screenshot the final form, then launch.

## Right after launch

1. Paste the token address into: `SPEC.md` §1, `apps/web/src/lib/spec.ts` (`AGENT_TOKEN`), `skills/agent-chain/references/contracts.md`, `docs/hackathon/SUBMISSION.md`, README tables.
2. Website Token section flips from "Not launched yet" to live (Flap link + DexScreener).
3. Post from @agent_chainL2 with the token address and the same risk line; never post a price target.
