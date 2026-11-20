/**
 * Snapshot of Binance Agent ID holders on BSC mainnet.
 *
 * Scans ERC-721 Transfer events of the Agent ID registry
 * (0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F) from its deployment block
 * (127,950,748, 2026-10-16) to the head (or --to), in adaptive block-range chunks that
 * respect public eth_getLogs limits (halves the range on error, grows back on success,
 * retries transient failures with backoff). Holders are derived from per-address token
 * balances (mints: from == 0x0; the token is soulbound so in practice holders == mints).
 *
 * Output: snapshots/agent-id-holders.json
 *   { contract, chainId, fromBlock, blockNumber, lastScannedBlock, complete, count,
 *     transferEvents, generatedAt, rpc, holders: [ ...lowercase addresses sorted ] }
 *
 * Progress is persisted every few chunks so an interrupted run can continue with
 * --resume. Run with:
 *
 *   npm run snapshot                      # full scan to head
 *   npm run snapshot -- --resume          # continue a partial scan
 *   npm run snapshot -- --to 134000000    # fixed upper block (reproducible)
 *
 * RPC: SNAPSHOT_RPC_URL env or --rpc <url>. Most free public BSC endpoints either prune
 * logs older than ~1 day (publicnode), cap ranges at 50-100 blocks (1rpc, drpc, tatum)
 * or refuse eth_getLogs entirely. The default below is NodeReal's public BSC endpoint
 * (full history, 50k-block range). The script aborts early if the endpoint returns no
 * logs through the first mint (2026-10-19), which means its history is pruned.
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: join(__dirname, "..", ".env") });

const AGENT_ID = "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F";
const DEPLOY_BLOCK = 127_950_748;
// The first (test) mint happened on 2026-10-19 (block ~128.5M). If nothing is seen by here
// the RPC does not serve historical logs.
const HISTORY_CHECK_BLOCK = 128_700_000;
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ZERO_WORD = "0x" + "0".repeat(64);

const DEFAULT_RPC =
  process.env.SNAPSHOT_RPC_URL?.trim() ||
  "https://bsc-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3";

const OUT_DIR = join(__dirname, "..", "snapshots");
const OUT_FILE = join(OUT_DIR, "agent-id-holders.json");

type Snapshot = {
  contract: string;
  chainId: number;
  fromBlock: number;
  blockNumber: number;
  lastScannedBlock: number;
  complete: boolean;
  count: number;
  transferEvents: number;
  generatedAt: string;
  rpc: string;
  holders: string[];
};

type Log = { topics: string[]; blockNumber: string };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const hex = (n: number) => "0x" + n.toString(16);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let rpcId = 0;
async function rpc<T>(url: string, method: string, params: unknown[], timeoutMs = 60_000): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { result?: T; error?: { code: number; message: string } };
    if (json.error) throw new Error(`RPC ${json.error.code}: ${json.error.message}`);
    return json.result as T;
  } finally {
    clearTimeout(t);
  }
}

/** Fetch logs for [from, to]; on failure shrink the range and retry. Returns logs + range used. */
async function getLogsAdaptive(
  url: string,
  from: number,
  to: number,
  state: { range: number; maxRange: number; minRange: number },
): Promise<{ logs: Log[]; to: number }> {
  let attempt = 0;
  for (;;) {
    const end = Math.min(to, from + state.range - 1);
    try {
      const logs = await rpc<Log[]>(url, "eth_getLogs", [
        { address: AGENT_ID, fromBlock: hex(from), toBlock: hex(end), topics: [TRANSFER_TOPIC] },
      ]);
      // Grow back slowly after a success.
      if (state.range < state.maxRange) state.range = Math.min(state.maxRange, Math.floor(state.range * 1.5));
      return { logs, to: end };
    } catch (err: any) {
      attempt++;
      const msg = String(err?.message ?? err);
      const rangeError = /range|limit|too many|exceed|10000|response size|query returned/i.test(msg);
      if (rangeError && state.range > state.minRange) {
        state.range = Math.max(state.minRange, Math.floor(state.range / 2));
        console.warn(`[snapshot] ${msg.slice(0, 100)} -> range ${state.range}`);
        continue;
      }
      if (attempt > 8) throw new Error(`giving up at block ${from}: ${msg}`);
      const backoff = Math.min(30_000, 500 * 2 ** attempt);
      console.warn(`[snapshot] ${msg.slice(0, 100)} -> retry in ${backoff}ms`);
      await sleep(backoff);
    }
  }
}

function loadPartial(): Snapshot | null {
  if (!existsSync(OUT_FILE)) return null;
  try {
    const s = JSON.parse(readFileSync(OUT_FILE, "utf8")) as Snapshot;
    return s.contract?.toLowerCase() === AGENT_ID.toLowerCase() ? s : null;
  } catch {
    return null;
  }
}

function save(snap: Snapshot) {
  mkdirSync(OUT_DIR, { recursive: true });
  const tmp = OUT_FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(snap, null, 2) + "\n");
  renameSync(tmp, OUT_FILE);
}

async function main() {
  const url = arg("--rpc") ?? DEFAULT_RPC;
  const resume = process.argv.includes("--resume");
  const concurrency = Math.max(1, Number(arg("--concurrency") ?? 3));
  const maxRange = Math.max(100, Number(arg("--range") ?? 49_999));

  const head = parseInt(await rpc<string>(url, "eth_blockNumber", []), 16);
  const toBlock = Number(arg("--to") ?? head);
  const chainId = parseInt(await rpc<string>(url, "eth_chainId", []), 16);
  if (chainId !== 56) throw new Error(`expected BSC mainnet (56), RPC is chainId ${chainId}`);

  // Per-address balance; holder iff balance > 0.
  const balances = new Map<string, number>();
  let transferEvents = 0;
  let fromBlock = DEPLOY_BLOCK;

  const partial = resume ? loadPartial() : null;
  if (partial && !partial.complete && partial.lastScannedBlock >= DEPLOY_BLOCK) {
    for (const h of partial.holders) balances.set(h, 1);
    transferEvents = partial.transferEvents;
    fromBlock = partial.lastScannedBlock + 1;
    console.log(`[snapshot] resuming from block ${fromBlock} with ${partial.count} holders`);
  }

  console.log(`[snapshot] rpc=${url}`);
  console.log(`[snapshot] contract=${AGENT_ID} blocks ${fromBlock}..${toBlock} (${toBlock - fromBlock + 1} blocks, head ${head})`);

  const state = { range: maxRange, maxRange, minRange: 100 };
  const started = Date.now();
  let cursor = fromBlock;
  let lastScanned = fromBlock - 1;
  let chunks = 0;

  const persist = (complete: boolean) => {
    const holders = [...balances.entries()].filter(([, b]) => b > 0).map(([a]) => a).sort();
    const snap: Snapshot = {
      contract: AGENT_ID,
      chainId,
      fromBlock: DEPLOY_BLOCK,
      blockNumber: complete ? toBlock : lastScanned,
      lastScannedBlock: lastScanned,
      complete,
      count: holders.length,
      transferEvents,
      generatedAt: new Date().toISOString(),
      rpc: url.replace(/\/v1\/[0-9a-f]{32}.*$/i, "/v1/<key>"),
      holders,
    };
    save(snap);
    return snap;
  };

  const apply = (logs: Log[]) => {
    for (const log of logs) {
      if (log.topics.length < 4) continue; // ERC-20-style Transfer; not expected here
      const from = "0x" + log.topics[1].slice(26).toLowerCase();
      const to = "0x" + log.topics[2].slice(26).toLowerCase();
      transferEvents++;
      if (log.topics[1] !== ZERO_WORD) balances.set(from, (balances.get(from) ?? 0) - 1);
      if (log.topics[2] !== ZERO_WORD) balances.set(to, (balances.get(to) ?? 0) + 1);
    }
  };

  let interrupted = false;
  process.on("SIGINT", () => {
    interrupted = true;
    console.log("\n[snapshot] interrupt — saving partial file…");
  });

  while (cursor <= toBlock && !interrupted) {
    // Launch `concurrency` chunks in order; each uses the shared adaptive range.
    const jobs: Promise<{ logs: Log[]; from: number; to: number }>[] = [];
    let planned = cursor;
    for (let i = 0; i < concurrency && planned <= toBlock; i++) {
      const from = planned;
      const end = Math.min(toBlock, from + state.range - 1);
      jobs.push(getLogsAdaptive(url, from, end, state).then((r) => ({ logs: r.logs, from, to: r.to })));
      planned = end + 1;
    }
    // Apply in order; if a job returned a shorter range than planned, the next loop
    // iteration restarts from the first gap.
    let next = cursor;
    for (const job of jobs) {
      const r = await job;
      if (r.from !== next) break; // gap (a previous job shrank) -> re-plan from `next`
      apply(r.logs);
      next = r.to + 1;
      chunks++;
    }
    cursor = next;
    lastScanned = cursor - 1;

    if (lastScanned >= HISTORY_CHECK_BLOCK && transferEvents === 0) {
      throw new Error(
        `no Transfer logs seen through block ${lastScanned}; this RPC prunes historical logs. ` +
          `Set SNAPSHOT_RPC_URL to an endpoint with full eth_getLogs history.`,
      );
    }

    if (chunks % 10 === 0 || cursor > toBlock) {
      const holders = [...balances.values()].filter((b) => b > 0).length;
      const done = ((lastScanned - DEPLOY_BLOCK + 1) / (toBlock - DEPLOY_BLOCK + 1)) * 100;
      const elapsed = ((Date.now() - started) / 1000).toFixed(0);
      console.log(
        `[snapshot] block ${lastScanned} (${done.toFixed(1)}%) holders=${holders} events=${transferEvents} range=${state.range} ${elapsed}s`,
      );
      persist(false);
    }
  }

  const snap = persist(cursor > toBlock);
  console.log(
    `[snapshot] ${snap.complete ? "complete" : "PARTIAL"}: ${snap.count} holders, ${snap.transferEvents} transfer events, ` +
      `blocks ${DEPLOY_BLOCK}..${snap.lastScannedBlock}, wrote snapshots/agent-id-holders.json`,
  );
  if (!snap.complete) process.exit(2);
}

main().catch((err) => {
  console.error("[snapshot] failed:", err?.message ?? err);
  process.exit(1);
});
