import "server-only";
import type { Block, Hash, Transaction } from "viem";
import { errorMessage, isConnectionError, rpc } from "./client";
import { CHAIN_ID, FLY_RPC_URL, PUBLIC_RPC_URL } from "./config";
import { readTotalSeats } from "./contracts";
import { guessMethod } from "./selectors";

import type { AddressScan, BlockRow, HeadOk, HeadResponse, HeadUnreachable, TxRow } from "./types";
export type { BlockRow, HeadOk, HeadResponse, HeadUnreachable, TxRow } from "./types";

/* ------------------------------------------------------------------ */
/* In-memory caches (per server instance)                              */
/* ------------------------------------------------------------------ */

type FullBlock = Block<bigint, true>;
type LiteBlock = Block<bigint, false>;

const RECENT_FULL = 15; // newest blocks fetched with full txs
const WINDOW = 100; // window for txs/avg-time stats
const FULL_CACHE_MAX = 700; // blocks with full tx bodies kept for address scans
const HEAD_TTL_MS = 1_000;

const liteCache = new Map<bigint, LiteBlock | FullBlock>();
const fullCache = new Map<bigint, FullBlock>();
let lastHead: bigint | null = null;
let lastGood: HeadOk | null = null;
let headPromise: Promise<HeadResponse> | null = null;
let headAt = 0;
let headResp: HeadResponse | null = null;

function clearAll(reason: string) {
  console.warn(`[explorer] clearing caches: ${reason}`);
  liteCache.clear();
  fullCache.clear();
  lastGood = null;
  lastHead = null;
  addressCache.clear();
  headSamples.length = 0;
}

/** Detect devnet reset (head decreased) and clear caches. */
function observeHead(head: bigint) {
  if (lastHead !== null && head < lastHead) clearAll(`head decreased ${lastHead} → ${head}`);
  lastHead = head;
}

function evict() {
  if (lastHead === null) return;
  for (const n of liteCache.keys()) if (n < lastHead - BigInt(WINDOW + 30)) liteCache.delete(n);
  if (fullCache.size > FULL_CACHE_MAX) {
    const keys = [...fullCache.keys()].sort((a, b) => (a < b ? -1 : 1));
    for (const k of keys.slice(0, fullCache.size - FULL_CACHE_MAX)) fullCache.delete(k);
  }
}

/** Fetch a block with full transactions (cached). Throws on RPC failure; returns null if block missing. */
export async function getFullBlock(n: bigint): Promise<FullBlock | null> {
  const c = fullCache.get(n);
  if (c) return c;
  const b = await notFoundAsNull(() => rpc().getBlock({ blockNumber: n, includeTransactions: true }) as Promise<FullBlock>);
  if (b && b.hash) {
    // Single-node devnet, no reorgs: safe to cache immediately.
    fullCache.set(n, b);
    liteCache.set(n, b);
  }
  return b;
}

async function getLiteBlock(n: bigint): Promise<LiteBlock | FullBlock | null> {
  const c = liteCache.get(n);
  if (c) return c;
  const b = await notFoundAsNull(() => rpc().getBlock({ blockNumber: n, includeTransactions: false }) as Promise<LiteBlock>);
  if (b && b.hash) liteCache.set(n, b);
  return b;
}

/** viem throws BlockNotFoundError / TransactionNotFoundError for missing data; map those to null. */
export async function notFoundAsNull<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    const name = (err as { name?: string })?.name ?? "";
    const msg = errorMessage(err).toLowerCase();
    if (name.includes("NotFound") || msg.includes("could not be found") || msg.includes("not found")) return null;
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Head snapshot                                                        */
/* ------------------------------------------------------------------ */

export async function getHead(): Promise<HeadResponse> {
  const now = Date.now();
  if (headResp && now - headAt < HEAD_TTL_MS) return headResp;
  if (headPromise) return headPromise;
  headPromise = computeHead()
    .then((r) => {
      headResp = r;
      headAt = Date.now();
      return r;
    })
    .finally(() => {
      headPromise = null;
    });
  return headPromise;
}

async function computeHead(): Promise<HeadResponse> {
  const base = {
    chainId: CHAIN_ID,
    rpcUrl: PUBLIC_RPC_URL,
    ...(FLY_RPC_URL !== PUBLIC_RPC_URL ? { rpcFallbackUrl: FLY_RPC_URL } : {}),
    fetchedAt: Date.now(),
  };
  try {
    const client = rpc();
    const t0 = Date.now();
    const [head, gasPrice] = await Promise.all([
      client.getBlockNumber(),
      client.getGasPrice().catch(() => null),
    ]);
    // Attribute the head reading to the midpoint of the RPC round trip.
    const headSeenAt = Math.round((t0 + Date.now()) / 2);
    observeHead(head);

    const from = head - BigInt(WINDOW - 1) < 0n ? 0n : head - BigInt(WINDOW - 1);
    const fullFrom = head - BigInt(RECENT_FULL - 1) < 0n ? 0n : head - BigInt(RECENT_FULL - 1);

    const numbers: bigint[] = [];
    for (let n = head; n >= from; n--) numbers.push(n);

    const blocks = await Promise.all(
      numbers.map((n) => (n >= fullFrom ? getFullBlock(n) : getLiteBlock(n))),
    );
    const valid = blocks.filter((b): b is LiteBlock | FullBlock => !!b && b.number !== null);

    // Stats: average block time.
    // Primary: wall-clock observation of head progression (ring buffer of the last
    // AVG_SAMPLES head readings, ≥ AVG_MIN_SPAN_MS apart end-to-end). Fallback until the
    // buffer is warm: (ts[head] − ts[head−N]) / N over N = AVG_TS_BLOCKS blocks; block
    // timestamps are 1 s granular, so a long window keeps that figure within a few %.
    const [avgBlockMs, totalSeats] = await Promise.all([
      (async () => observedAvgBlockMs(head, headSeenAt) ?? (await timestampAvgBlockMs(head, valid[0])))(),
      readTotalSeats(),
    ]);
    const txsLast100 = valid.reduce((acc, b) => acc + b.transactions.length, 0);

    const blockRows: BlockRow[] = valid.slice(0, 12).map(toBlockRow);
    const txRows: TxRow[] = [];
    for (const b of valid) {
      if (!isFull(b)) continue;
      for (let i = b.transactions.length - 1; i >= 0; i--) {
        txRows.push(toTxRow(b.transactions[i], b));
        if (txRows.length >= 12) break;
      }
      if (txRows.length >= 12) break;
    }

    evict();
    const ok: HeadOk = {
      ok: true,
      status: "ok",
      ...base,
      stats: {
        latestBlock: head.toString(),
        avgBlockMs,
        txsLast100,
        gasPriceWei: gasPrice === null ? null : gasPrice.toString(),
        totalSeats: totalSeats === null ? null : totalSeats.toString(),
      },
      blocks: blockRows,
      txs: txRows,
    };
    lastGood = ok;
    return ok;
  } catch (err) {
    const msg = errorMessage(err);
    const res: HeadUnreachable = {
      ok: false,
      status: "unreachable",
      ...base,
      error: isConnectionError(err) ? "RPC unreachable" : msg.split("\n")[0].slice(0, 200),
    };
    if (lastGood) {
      const { status: _s, ok: _ok, ...rest } = lastGood;
      void _s;
      void _ok;
      res.stale = rest;
    }
    return res;
  }
}

/* ------------------------------------------------------------------ */
/* Average block time                                                   */
/* ------------------------------------------------------------------ */

const AVG_SAMPLES = 60; // ring buffer of head observations (~1 per second)
const AVG_MIN_SPAN_MS = 15_000; // need at least this much wall-clock coverage
const AVG_MIN_BLOCKS = 30n;
const AVG_TS_BLOCKS = 200n; // fallback window for the timestamp-based estimate

/** Wall-clock samples of (time, head) used to measure block time on sub-second chains. */
const headSamples: { t: number; head: bigint }[] = [];

function observedAvgBlockMs(head: bigint, seenAt: number): number | null {
  const last = headSamples[headSamples.length - 1];
  if (last && head < last.head) headSamples.length = 0; // devnet reset
  if (!last || head > last.head) headSamples.push({ t: seenAt, head });
  while (headSamples.length > AVG_SAMPLES) headSamples.shift();
  const first = headSamples[0];
  const blocks = head - first.head;
  const span = seenAt - first.t;
  if (blocks < AVG_MIN_BLOCKS || span < AVG_MIN_SPAN_MS) return null;
  // End-to-end rate across the whole buffer: a ±300 ms RPC jitter on either end is
  // < 2 % of a 15–60 s span, so this does not flicker between reads.
  return Math.round(span / Number(blocks));
}

async function timestampAvgBlockMs(head: bigint, newest: LiteBlock | FullBlock | undefined): Promise<number | null> {
  if (!newest || newest.number === null) return null;
  const n = head < AVG_TS_BLOCKS ? 0n : head - AVG_TS_BLOCKS;
  if (n >= head) return null;
  const oldest = await getLiteBlock(n).catch(() => null);
  if (!oldest || oldest.number === null) return null;
  const span = Number(newest.timestamp - oldest.timestamp);
  const gaps = Number(newest.number! - oldest.number);
  return gaps > 0 && span >= 0 ? Math.round((span * 1000) / gaps) : null;
}

function isFull(b: LiteBlock | FullBlock): b is FullBlock {
  return b.transactions.length === 0 || typeof b.transactions[0] !== "string";
}

export function toBlockRow(b: LiteBlock | FullBlock): BlockRow {
  const gasUsed = b.gasUsed;
  const gasLimit = b.gasLimit;
  return {
    number: (b.number ?? 0n).toString(),
    hash: b.hash ?? "",
    timestamp: Number(b.timestamp),
    txCount: b.transactions.length,
    gasUsed: gasUsed.toString(),
    gasLimit: gasLimit.toString(),
    gasUsedPct: gasLimit === 0n ? 0 : Number((gasUsed * 10_000n) / gasLimit) / 100,
    miner: b.miner,
    baseFeePerGas: b.baseFeePerGas === null || b.baseFeePerGas === undefined ? null : b.baseFeePerGas.toString(),
  };
}

export function toTxRow(tx: Transaction, b: { number: bigint | null; timestamp: bigint }): TxRow {
  const m = guessMethod(tx.input, tx.to);
  return {
    hash: tx.hash,
    blockNumber: (b.number ?? 0n).toString(),
    timestamp: Number(b.timestamp),
    from: tx.from,
    to: tx.to ?? null,
    value: tx.value.toString(),
    method: m.label,
    methodKind: m.kind,
  };
}

/* ------------------------------------------------------------------ */
/* Address activity scan (last ~500 blocks, cached 10 s)                */
/* ------------------------------------------------------------------ */

export const SCAN_BLOCKS = 500;
const SCAN_TTL_MS = 10_000;
const SCAN_MAX_ROWS = 50;
type ScanEntry = { at: number; rows: TxRow[]; scannedFrom: bigint; scannedTo: bigint; partial: boolean };
const addressCache = new Map<string, ScanEntry>();

export type { AddressScan } from "./types";

/**
 * Scan up to SCAN_BLOCKS blocks ending at `toBlock` (default: head) for txs that
 * touch `address`. Cached per (address, toBlock); windows that end at a historical
 * block are immutable on the single-node devnet, so they are cached for longer.
 */
export async function scanAddressTxs(address: string, toBlock?: bigint): Promise<AddressScan> {
  const key = `${address.toLowerCase()}@${toBlock === undefined ? "head" : toBlock.toString()}`;
  const c = addressCache.get(key);
  const ttl = toBlock === undefined ? SCAN_TTL_MS : SCAN_TTL_MS * 30;
  if (c && Date.now() - c.at < ttl) return serializeScan(c);

  const head = await rpc().getBlockNumber();
  observeHead(head);
  const to = toBlock === undefined || toBlock > head ? head : toBlock;
  const from = to - BigInt(SCAN_BLOCKS - 1) < 0n ? 0n : to - BigInt(SCAN_BLOCKS - 1);
  const lower = address.toLowerCase();

  const rows: TxRow[] = [];
  let partial = false;
  let lowest = to;
  // Fetch in chunks of 50 to keep batch sizes sane for a single-node devnet.
  const CHUNK = 50;
  const deadline = Date.now() + 12_000;
  outer: for (let hi = to; hi >= from; hi -= BigInt(CHUNK)) {
    const lo = hi - BigInt(CHUNK - 1) < from ? from : hi - BigInt(CHUNK - 1);
    const nums: bigint[] = [];
    for (let n = hi; n >= lo; n--) nums.push(n);
    const blocks = await Promise.all(nums.map((n) => getFullBlock(n).catch(() => null)));
    for (const b of blocks) {
      if (!b) continue;
      lowest = b.number ?? lowest;
      for (let i = b.transactions.length - 1; i >= 0; i--) {
        const tx = b.transactions[i];
        if (tx.from.toLowerCase() === lower || (tx.to && tx.to.toLowerCase() === lower)) {
          rows.push(toTxRow(tx, b));
          if (rows.length >= SCAN_MAX_ROWS) break outer;
        }
      }
    }
    if (Date.now() > deadline) {
      partial = true;
      break;
    }
  }
  const entry: ScanEntry = { at: Date.now(), rows, scannedFrom: lowest, scannedTo: to, partial };
  addressCache.set(key, entry);
  if (addressCache.size > 200) addressCache.delete(addressCache.keys().next().value!);
  evict();
  return serializeScan(entry);
}

function serializeScan(e: ScanEntry): AddressScan {
  return { rows: e.rows, scannedFrom: e.scannedFrom.toString(), scannedTo: e.scannedTo.toString(), partial: e.partial };
}

/** Helper for pages that need a tx hash → row conversion for a single block. */
export function blockTxRows(b: FullBlock): TxRow[] {
  return b.transactions.map((tx) => toTxRow(tx, b));
}

export type { FullBlock, Hash };
