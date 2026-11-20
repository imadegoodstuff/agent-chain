export type SeatEvent = { seatId: number; to: string; block: number; tx: string };

export type Stats = {
  ok: boolean;
  chainId: number | null;
  block: number | null;
  blocksPerSec: number | null;
  blockTimeMs: number | null;
  seats: number | null;
  seatAddress: string | null;
  recentSeats: SeatEvent[];
  gasPriceWei: string | null;
  ts: number;
  error?: string;
};
