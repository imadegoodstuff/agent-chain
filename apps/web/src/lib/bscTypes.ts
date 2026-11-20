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
