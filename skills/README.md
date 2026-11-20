# Skills

Agent skills published by AGENT CHAIN, in [Binance Skills Hub](https://github.com/binance/binance-skills-hub) format (YAML frontmatter + Command Routing + Preflight + `references/`).

| Skill | Purpose |
|---|---|
| [`agent-chain/`](agent-chain/SKILL.md) | Check your Agent ID, register on AGENT CHAIN, claim a Genesis Seat, bridge ANTB (via `baw contract-call`), read chain status / fees, and send or call on AGENT CHAIN over JSON-RPC |

## Install (OpenClaw / Claude Code / any skills-aware agent)

```bash
# copy the folder into your agent's skills directory, e.g.
cp -r skills/agent-chain ~/.claude/skills/agent-chain
# the skill depends on the Binance Agentic Wallet CLI
npm install -g @binance/agentic-wallet
```

The skill is read-only until the BSC contract addresses in `agent-chain/references/contracts.md` replace their `<PLACEHOLDER>` values; every write requires explicit user confirmation after a calldata preview.
