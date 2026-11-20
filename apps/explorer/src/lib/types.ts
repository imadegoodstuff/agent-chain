/** Serializable shapes (bigint → string) shared between server and client. */

export type BlockRow = {
  number: string;
  hash: string;
  timestamp: number;
  txCount: number;
  gasUsed: string;
  gasLimit: string;
  gasUsedPct: number;
  miner: string;
  baseFeePerGas: string | null;
};

export type TxRow = {
  hash: string;
  blockNumber: string;
  timestamp: number;
  from: string;
  to: string | null;
  value: string;
  method: string;
  methodKind: "transfer" | "create" | "known" | "unknown";
};

/** Result of an address activity scan (see chain-data.scanAddressTxs). */
export type AddressScan = {
  rows: TxRow[];
  /** Lowest block actually inspected (inclusive). "Load older" continues from `scannedFrom - 1`. */
  scannedFrom: string;
  /** Highest block inspected (inclusive). */
  scannedTo: string;
  /** True when the scan stopped early (time budget) before reaching its target window. */
  partial: boolean;
};

export type HeadStats = {
  latestBlock: string;
  avgBlockMs: number | null;
  txsLast100: number;
  gasPriceWei: string | null;
  totalSeats: string | null;
};

export type HeadBase = {
  chainId: number;
  /** Canonical public RPC (custom domain). */
  rpcUrl: string;
  /** Secondary RPC (Fly hostname), present only when it differs from `rpcUrl`. */
  rpcFallbackUrl?: string;
  fetchedAt: number;
};

export type HeadOk = HeadBase & {
  /** `true` when the snapshot is fresh. `status` is kept for compatibility. */
  ok: true;
  status: "ok";
  stats: HeadStats;
  blocks: BlockRow[];
  txs: TxRow[];
};

export type HeadUnreachable = HeadBase & {
  ok: false;
  status: "unreachable";
  error: string;
  /** Last good snapshot if we have one (stale). */
  stale?: Omit<HeadOk, "status" | "ok">;
};

export type HeadResponse = HeadOk | HeadUnreachable;
