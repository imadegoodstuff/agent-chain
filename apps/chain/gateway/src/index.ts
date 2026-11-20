/**
 * AGENT CHAIN public JSON-RPC gateway.
 *
 *  - CORS: *                                      (browsers / wallets / explorer can call it directly)
 *  - POST /      JSON-RPC (single or batch) → forwarded to the private Nitro sequencer, except:
 *      eth_sendRawTransaction  → sender recovered with viem; must pass AgentChecker (AgentRegistry on L2,
 *                                fallback Agent ID ERC-721 on BSC, 60 s cache) or gets error -32050
 *      admin_/debug_/… prefixes → -32601
 *  - GET /health  { ok, chainId, upstream, cache }
 *
 * Plain node:http, no framework: the hot path is one JSON parse + one upstream fetch.
 */
import http from 'node:http';
import { config } from './config.js';
import { AgentChecker } from './agent-check.js';
import { screen, rpcError, type JsonRpcRequest, type JsonRpcResponse } from './rpc.js';

const checker = new AgentChecker(config);

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

function send(res: http.ServerResponse, status: number, body: unknown) {
  const json = JSON.stringify(body);
  res.writeHead(status, { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) });
  res.end(json);
}

async function readBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > config.maxBodyBytes) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function forward(payload: unknown): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), config.upstreamTimeoutMs);
  try {
    const r = await fetch(config.sequencerRpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const text = await r.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`upstream returned non-JSON (${r.status})`);
    }
  } finally {
    clearTimeout(t);
  }
}

async function handleRpc(bodyText: string): Promise<{ status: number; body: unknown }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return { status: 200, body: rpcError(null, -32700, 'Parse error') };
  }

  const isBatch = Array.isArray(parsed);
  const reqs: JsonRpcRequest[] = isBatch ? (parsed as JsonRpcRequest[]) : [parsed as JsonRpcRequest];
  if (reqs.length === 0) return { status: 200, body: rpcError(null, -32600, 'Invalid Request: empty batch') };

  // Screen every request; collect local answers and the subset to forward.
  const local = new Map<number, JsonRpcResponse>();
  const toForward: Array<{ idx: number; req: JsonRpcRequest }> = [];
  await Promise.all(
    reqs.map(async (req, idx) => {
      if (!req || typeof req !== 'object') {
        local.set(idx, rpcError(null, -32600, 'Invalid Request'));
        return;
      }
      const verdict = await screen(req, config, checker);
      if (verdict) local.set(idx, verdict);
      else toForward.push({ idx, req });
    }),
  );

  const out: JsonRpcResponse[] = new Array(reqs.length);
  for (const [idx, r] of local) out[idx] = r;

  if (toForward.length > 0) {
    try {
      const upstream = await forward(isBatch ? toForward.map((f) => f.req) : toForward[0].req);
      if (isBatch) {
        const arr = Array.isArray(upstream) ? (upstream as JsonRpcResponse[]) : [];
        // match by id (upstream may reorder); fall back to positional
        const byId = new Map<string, JsonRpcResponse>();
        for (const r of arr) byId.set(JSON.stringify(r.id ?? null), r);
        toForward.forEach((f, i) => {
          out[f.idx] = byId.get(JSON.stringify(f.req.id ?? null)) ?? arr[i] ?? rpcError((f.req.id ?? null) as never, -32603, 'missing upstream response');
        });
      } else {
        out[toForward[0].idx] = upstream as JsonRpcResponse;
      }
    } catch (err) {
      for (const f of toForward) out[f.idx] = rpcError((f.req.id ?? null) as never, -32603, `Upstream error: ${(err as Error).message}`);
      return { status: 502, body: isBatch ? out : out[0] };
    }
  }
  return { status: 200, body: isBatch ? out : out[0] };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }
    const url = req.url ?? '/';
    if (req.method === 'GET' && (url === '/health' || url === '/healthz')) {
      let upstream: 'ok' | 'down' = 'down';
      let chainId: number | null = null;
      try {
        const r = (await forward({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] })) as { result?: string };
        if (r.result) {
          chainId = parseInt(r.result, 16);
          upstream = chainId === config.chainId ? 'ok' : 'down';
        }
      } catch {
        /* down */
      }
      send(res, upstream === 'ok' ? 200 : 503, { ok: upstream === 'ok', chainId, expectedChainId: config.chainId, upstream, enforce: config.enforce, cache: checker.size });
      return;
    }
    if (req.method === 'GET' && url === '/') {
      send(res, 200, { name: 'AGENT CHAIN RPC gateway', chainId: config.chainId, rpc: 'POST / (JSON-RPC 2.0)', gate: 'eth_sendRawTransaction requires a Binance Agent ID', health: '/health' });
      return;
    }
    if (req.method !== 'POST') {
      send(res, 405, rpcError(null, -32600, 'Only POST JSON-RPC is supported'));
      return;
    }
    const body = await readBody(req);
    const { status, body: out } = await handleRpc(body.toString('utf8'));
    send(res, status, out);
  } catch (err) {
    const msg = (err as Error).message;
    send(res, msg === 'payload too large' ? 413 : 500, rpcError(null, -32603, msg));
  }
});

server.keepAliveTimeout = 65_000;
server.listen(config.port, '0.0.0.0', () => {
  console.log(`[gateway] listening on :${config.port} → ${config.sequencerRpcUrl} (chainId ${config.chainId}, enforce=${config.enforce}, registry=${config.agentRegistryAddress ?? 'none'}, parent=${config.parentRpcUrl ? 'yes' : 'no'})`);
});
