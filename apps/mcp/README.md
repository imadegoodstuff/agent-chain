# AGENT CHAIN MCP server

Read-only [Model Context Protocol](https://modelcontextprotocol.io) server for AGENT CHAIN. It exposes chain state (head, blocks, transactions, agent registry, fee keeper, genesis stats) as tools so any MCP-capable model — Claude Desktop, Cursor, Binance Agent OS, or an OpenClaw agent — can read AGENT CHAIN without custom integration.

It **never signs or sends transactions**. Signing on BSC goes through the user's own Agentic Wallet (`baw` CLI) via the [`agent-chain` skill](../../skills/agent-chain/SKILL.md); signing on AGENT CHAIN goes through the user's own L2 key. This server only reads.

Built with `@modelcontextprotocol/sdk` + `viem`. Node 20+.

## Tools

| Tool | Input | What it returns |
|---|---|---|
| `agentchain_head` | — | chain id, latest block, gas price, plus the explorer `/api/head` snapshot (recent blocks/txs, avg block ms, total seats) |
| `agentchain_block` | `number?` (decimal, 0x-hash, or `latest`/`earliest`/`safe`/`finalized`/`pending`), `includeTransactions?` | block header + tx list |
| `agentchain_tx` | `hash` | transaction + receipt (status, gasUsed, logs count, explorer link) |
| `agentchain_is_agent` | `address`, `checkBsc?` | L2 `AgentRegistry.isAgent` / `agentOf`, Genesis Seat id; optionally Binance Agent ID `balanceOf` on BSC |
| `agentchain_fee_estimate` | `gas?` (default 21000) | FeeKeeper `usdPerGas`, `antbUsd`, `minBaseFeeWei` → cost in ANTB and USD |
| `agentchain_genesis_stats` | — | `totalSeats`, active agents, chain id, latest block |

All tools are annotated `readOnlyHint: true`. Errors (bad address, RPC down) come back as MCP `isError` results, never as crashes. BigInts are serialised as decimal strings.

`agentchain_is_agent` is for addresses the user controls or explicitly pastes. It is not, and must not be wrapped as, a "find someone's wallet by name" tool.

## Run locally

```bash
cd apps/mcp
npm install
npm run build
npm run smoke          # spawns the stdio server, calls every tool against the live devnet
npm start              # stdio transport (for desktop clients)
npm run start:http     # Streamable HTTP on :8080/mcp (+ GET /healthz)
```

### Configuration (env)

| Variable | Default |
|---|---|
| `AGENTCHAIN_RPC_URL` | `https://rpc.agent-chain.agency` |
| `AGENTCHAIN_EXPLORER_URL` | `https://explorer.agent-chain.agency` |
| `AGENTCHAIN_CHAIN_ID` | `11190` |
| `AGENTCHAIN_GAS_SYMBOL` | `tANTB` |
| `AGENTCHAIN_AGENT_REGISTRY` | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| `AGENTCHAIN_GENESIS_SEAT` | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| `AGENTCHAIN_FEE_KEEPER` | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| `BSC_RPC_URL` | `https://bsc-dataseed.bnbchain.org` |
| `BSC_AGENT_ID_CONTRACT` | `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` |
| `PORT` (http variant) | `8080` |

Point the same binary at testnet/mainnet by changing the RPC, chain id and contract addresses.

## Add to a client

### Claude Desktop

`claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`):

```json
{
  "mcpServers": {
    "agentchain": {
      "command": "node",
      "args": ["/absolute/path/to/agent-chain/apps/mcp/dist/stdio.js"]
    }
  }
}
```

### Cursor

`.cursor/mcp.json` in the project (or `~/.cursor/mcp.json` globally):

```json
{
  "mcpServers": {
    "agentchain": {
      "command": "node",
      "args": ["E:/scash/agent-chain/apps/mcp/dist/stdio.js"]
    }
  }
}
```

Or, once the HTTP variant is deployed, with no local install:

```json
{
  "mcpServers": {
    "agentchain": { "url": "https://agentchain-mcp.fly.dev/mcp" }
  }
}
```

### Binance Agent OS / other remote MCP clients

Agent OS and other hosts that take a remote MCP endpoint (see the [agent-native MCP docs](https://developers.binance.com/en/docs/agent-native/mcp-server/agentic)) can use the Streamable HTTP endpoint directly:

```
URL:        https://agentchain-mcp.fly.dev/mcp
Transport:  Streamable HTTP (stateless; SSE responses)
Auth:       none (read-only public chain data)
```

The server is stateless per request and sends permissive CORS headers, so browser-hosted clients can also connect.

### OpenClaw / Claude Code (stdio)

```bash
claude mcp add agentchain -- node /absolute/path/to/agent-chain/apps/mcp/dist/stdio.js
```

## Deploy (HTTP variant)

`Dockerfile` + `fly.toml` are included (app `agentchain-mcp`, region `sin`). Nothing is deployed by this repo automatically:

```bash
cd apps/mcp
fly launch --no-deploy --copy-config   # first time only, accepts fly.toml
fly deploy --remote-only
curl https://agentchain-mcp.fly.dev/healthz
```

## Layout

```
src/config.ts   env-driven endpoints and contract addresses
src/chain.ts    viem clients + human-readable ABIs (mirrors skills/agent-chain/references/contracts.md)
src/tools.ts    tool implementations + registerTools()
src/server.ts   McpServer factory
src/stdio.ts    stdio entry (bin: agentchain-mcp)
src/http.ts     Streamable HTTP entry (/mcp, /healthz)
src/smoke.ts    end-to-end smoke test via a real MCP client
```

## Disclaimers

AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules; bStocks are not available to US persons and are restricted in other jurisdictions.

Nothing here is investment advice. $AGENT confers no rights to revenue, equity, or returns; fee distributions are protocol parameters that governance can change.

Devnet tokens have no value.
