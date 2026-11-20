#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Never write to stdout here: stdout is the MCP channel.
  process.stderr.write("agentchain-mcp: stdio transport ready\n");
}

main().catch((err) => {
  process.stderr.write(`agentchain-mcp: fatal ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
