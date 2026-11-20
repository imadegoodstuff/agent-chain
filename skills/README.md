# Skills

Agent skills published by AGENT CHAIN, in [Binance Skills Hub](https://github.com/binance/binance-skills-hub) format (YAML frontmatter + Command Routing + Preflight + `references/`).

| Skill | Purpose |
|---|---|
| [`agent-chain/`](agent-chain/SKILL.md) | Check your Agent ID, register on AGENT CHAIN, claim a Genesis Seat, bridge ANTB (via `baw contract-call`), read chain status / fees, and send or call on AGENT CHAIN over JSON-RPC |

## Install locally (before Hub listing)

A PR to list `agent-chain` in Binance Skills Hub is open. Until it is merged, point your agent at this repository directly.

**Source:** <https://github.com/imadegoodstuff/agent-chain/tree/main/skills/agent-chain>
**Raw `SKILL.md`:** <https://raw.githubusercontent.com/imadegoodstuff/agent-chain/main/skills/agent-chain/SKILL.md>

```bash
# prerequisite: Binance Agentic Wallet CLI (the skill drives BSC writes through it)
npm install -g @binance/agentic-wallet

# 1) clone (or download) the repo and copy the skill folder into your agent's skills directory
git clone https://github.com/imadegoodstuff/agent-chain
cp -r agent-chain/skills/agent-chain ~/.claude/skills/agent-chain     # Claude Code
cp -r agent-chain/skills/agent-chain ~/.openclaw/skills/agent-chain   # OpenClaw
cp -r agent-chain/skills/agent-chain .cursor/skills/agent-chain       # Cursor (per project)

# 2) or, with the skills CLI, install straight from GitHub
npx skills add https://github.com/imadegoodstuff/agent-chain --skill agent-chain
```

| Agent | Where the folder goes | Notes |
|---|---|---|
| OpenClaw | `~/.openclaw/skills/agent-chain/` | the frontmatter's `openclaw.install` block installs `baw` automatically |
| Claude Code / Claude Desktop | `~/.claude/skills/agent-chain/` (or project `.claude/skills/`) | `SKILL.md` is picked up on next start |
| Cursor | `.cursor/skills/agent-chain/` in the project | or paste the raw `SKILL.md` URL into a rule |
| Any other skills-aware agent | wherever it loads `SKILL.md` files from | keep `references/` next to `SKILL.md` — every route reads its reference file |

**One-paste prompt** (works in any agent that can fetch a URL):

```
Install the agent-chain skill from https://github.com/imadegoodstuff/agent-chain/tree/main/skills/agent-chain, check my Agent ID, then claim my Genesis Seat on AGENT CHAIN.
```

The agent will install the skill, run `baw wallet agent-id --json`, and — only if you hold an Agent ID — show you a `baw contract-call preview` of `GenesisSeatClaim.claim()` and wait for your explicit "yes" before executing. Nothing is signed without that confirmation.

## Safety model

- Every state-changing step: `preview` → decoded calldata + wallet risk output shown → explicit user confirmation → `execute`. One preview, one confirmation, one execute. No batching, no bypass.
- Approvals are for the exact deposit amount only; never unlimited.
- The skill never asks for or stores private keys, seed phrases or session tokens, and refuses to resolve another person's wallet from a name or handle.
- Addresses come only from `agent-chain/references/contracts.md`; a route whose contract is still a `<PLACEHOLDER>` (currently only `$AGENT`) is unavailable.
