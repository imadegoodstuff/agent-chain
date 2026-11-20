/**
 * Smoke test: spawn the built stdio server as a real MCP client would,
 * list tools, call each one against the live devnet, and print the results.
 * Exit code 1 if any tool returns isError or throws.
 *
 *   npm run build && npm run smoke
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const here = dirname(fileURLToPath(import.meta.url));
const serverPath = join(here, "stdio.js");

type Result = { content?: Array<{ type: string; text?: string }>; isError?: boolean };

function text(r: Result): string {
  return (r.content ?? [])
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("\n");
}

function excerpt(s: string, n = 900): string {
  return s.length > n ? `${s.slice(0, n)}\n  …(${s.length - n} more chars)` : s;
}

async function main() {
  const client = new Client({ name: "agentchain-mcp-smoke", version: "0.1.0" });
  const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath] });
  await client.connect(transport);

  const { tools } = await client.listTools();
  console.log(`tools (${tools.length}): ${tools.map((t) => t.name).join(", ")}\n`);

  let failures = 0;
  const run = async (name: string, args: Record<string, unknown>) => {
    const started = Date.now();
    try {
      const r = (await client.callTool({ name, arguments: args })) as Result;
      const ms = Date.now() - started;
      const body = text(r);
      if (r.isError) failures++;
      console.log(`▸ ${name}(${JSON.stringify(args)}) ${r.isError ? "ERROR" : "ok"} ${ms}ms`);
      console.log(excerpt(body).replace(/^/gm, "  "));
      console.log();
      return body;
    } catch (err) {
      failures++;
      console.log(`▸ ${name} THREW: ${err instanceof Error ? err.message : String(err)}\n`);
      return "";
    }
  };

  const headBody = await run("agentchain_head", {});
  const headJson = headBody ? (JSON.parse(headBody) as { latestBlock?: string; explorerHead?: { txs?: Array<{ hash: string }> } }) : {};

  await run("agentchain_block", { number: "latest" });
  if (headJson.latestBlock) await run("agentchain_block", { number: String(Math.max(0, Number(headJson.latestBlock) - 1)) });

  const sampleTx = headJson.explorerHead?.txs?.[0]?.hash;
  if (sampleTx) await run("agentchain_tx", { hash: sampleTx });
  else console.log("▸ agentchain_tx skipped (no recent tx in explorer head)\n");

  // Devnet deployer address (apps/devnet/deployments/devnet.json) — a known L2 account.
  await run("agentchain_is_agent", { address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", checkBsc: true });
  await run("agentchain_fee_estimate", { gas: 21000 });
  await run("agentchain_fee_estimate", { gas: 45000 });
  await run("agentchain_genesis_stats", {});

  // Negative path: invalid address must come back as a clean MCP error, not a crash.
  const bad = (await client.callTool({ name: "agentchain_is_agent", arguments: { address: "not-an-address" } })) as Result;
  console.log(`▸ agentchain_is_agent(invalid) isError=${bad.isError} → ${excerpt(text(bad), 200)}\n`);
  if (!bad.isError) failures++;

  await client.close();
  console.log(failures === 0 ? "SMOKE OK" : `SMOKE FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
