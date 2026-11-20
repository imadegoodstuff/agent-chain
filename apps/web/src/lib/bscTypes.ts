/** Shape returned by /api/bsc (bigints serialised as decimal strings). */
export type DepositEvent = {
  nonce: number;
  from: string;
  l2Recipient: string;
  amount: string; // wei
  block: number;
  tx: string;
  ts: number | null; // unix seconds
};

export type SeatClaimEvent = {
  seatId: number;
  holder: string;
  block: number;
  tx: string;
  ts: number | null;
};

/** /api/l2 — AGENT CHAIN mainnet head + Nitro core reads on BSC + relayer status. */
export type L2Stats = {
  ok: boolean;
  ts: number;
  l2: {
    rpc: string;
    chainId: number;
    block: number;
    blockTimestamp: number;
    gasPriceWei: string;
    baseFeeWei: string | null;
    txCountLatest: number;
    blocksPerSec: number | null;
  } | null;
  parent: {
    batchCount: number | null;
    sequencerMessageCount: number | null;
    delayedMessageCount: number | null;
    antbPerBnbWei: string | null;
    latestConfirmed: string | null; // bytes32 assertion hash
    baseStakeWei: string | null;
  } | null;
  relayer: { ok: boolean; status: number | null; data?: Record<string, unknown> | null };
  error?: string;
};

/** /api/bsc?address=0x… — read-only status of ONE address the user pasted. */
export type AddressStatus = {
  ok: boolean;
  address: string;
  ts: number;
  agentIdBalance: string | null;
  babBalance: string | null;
  isAgent: boolean | null;
  registered: boolean | null;
  registryIndex: number | null;
  seatId: number | null; // 0 = none
  totalSeats: number | null;
  depositedBy: string | null; // wei
  remainingFor: string | null; // wei
  antbBalance: string | null; // wei
};

export type BscStats = {
  ok: boolean;
  ts: number;
  block: number | null;
  bridge: {
    perAddressCap: string;
    globalCap: string;
    totalDeposited: string;
    remainingGlobal: string;
    pendingDeposits: string;
    depositCount: number;
    paused: boolean;
  } | null;
  seats: { totalSeats: number; claimOpen: boolean } | null;
  registry: { count: number } | null;
  deposits: DepositEvent[];
  seatClaims: SeatClaimEvent[];
  sync: { depositsComplete: boolean; seatsComplete: boolean; scannedTo: number | null };
  error?: string;
};
