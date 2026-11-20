import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SERVER_INFO } from "./config.js";
import { registerTools } from "./tools.js";

/** Build a fresh McpServer with all AGENT CHAIN tools registered. */
export function createServer(): McpServer {
  const server = new McpServer(SERVER_INFO, {
    instructions:
      "Read-only tools for AGENT CHAIN, an agent-native L2 on BNB Smart Chain where gas is ANTB and every account is a Binance Agent ID holder. " +
      "These tools never sign or send transactions. Use agentchain_is_agent only for addresses the user controls or explicitly provides.",
  });
  registerTools(server);
  return server;
}
