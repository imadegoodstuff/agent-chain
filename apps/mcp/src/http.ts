import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CONFIG, SERVER_INFO } from "./config.js";
import { createServer } from "./server.js";

/**
 * Stateless Streamable-HTTP variant (MCP 2025-03-26 transport).
 * Each POST /mcp gets its own server+transport pair, so the process can run
 * behind any load balancer with no sticky sessions. GET /mcp opens an SSE
 * stream for clients that want server-initiated notifications.
 */

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      if (chunks.length === 0) return resolve(undefined);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

async function handleMcp(req: IncomingMessage, res: ServerResponse) {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  const body = req.method === "POST" ? await readBody(req) : undefined;
  await transport.handleRequest(req, res, body);
}

const httpServer = createHttpServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  // Minimal CORS so browser-based MCP clients / Agent OS web clients can connect.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type, mcp-session-id, mcp-protocol-version, accept");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }

  if (url.pathname === "/healthz" || url.pathname === "/") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        name: SERVER_INFO.name,
        version: SERVER_INFO.version,
        endpoint: "/mcp",
        rpcUrl: CONFIG.rpcUrl,
        chainId: CONFIG.chainId,
      }),
    );
    return;
  }

  if (url.pathname === "/mcp") {
    try {
      await handleMcp(req, res);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32603, message: err instanceof Error ? err.message : String(err) },
            id: null,
          }),
        );
      }
    }
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not found", endpoint: "/mcp" }));
});

httpServer.listen(CONFIG.httpPort, "0.0.0.0", () => {
  process.stderr.write(`agentchain-mcp: http transport on :${CONFIG.httpPort}/mcp\n`);
});
