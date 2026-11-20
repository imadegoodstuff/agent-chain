/**
 * AGENT CHAIN Beta bridge relayer.
 *
 *   BSC Bridge.Deposited(from, l2Recipient, amount, nonce)  →  native ANTB transfer of exactly `amount` on
 *   AGENT CHAIN (chain 1119) from the chain owner to l2Recipient, in nonce order, idempotent (durable JSON state).
 *
 *   GET /health  → { ok, cursor, bscHead, pending, processed }
 *   GET /status  → full status (cursor, processed count, owner L2 balance, pending deposits, escrow check)
 */
import http from 'node:http';
import { config } from './config.js';
import { Relayer } from './relayer.js';

const relayer = new Relayer(config);

function send(res: http.ServerResponse, status: number, body: unknown) {
  const json = JSON.stringify(body, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
  res.end(json);
}

const server = http.createServer((req, res) => {
  const url = (req.url ?? '/').split('?')[0];
  if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
  if (url === '/health') {
    const s = relayer.status();
    const stale = s.lastLoopAt ? Date.now() - Date.parse(s.lastLoopAt) > 5 * config.pollIntervalMs : false;
    return send(res, s.ok && !stale ? 200 : 503, { ok: s.ok && !stale, cursor: s.cursor, bscHead: s.bscHead, pending: s.pendingCount, processed: s.processedCount, lastLoopAt: s.lastLoopAt, lastError: s.lastError });
  }
  if (url === '/status' || url === '/') return send(res, 200, relayer.status());
  return send(res, 404, { error: 'not found' });
});

server.listen(config.port, '0.0.0.0', () => {
  console.log(`[relayer] http on :${config.port}; bsc rpcs ${config.bscRpcUrls.join(', ')}; l2 ${config.l2RpcUrl}; state ${config.stateFile}`);
});

relayer.start().catch((e) => {
  console.error('[relayer] fatal:', e);
  process.exit(1);
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    relayer.stop();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
