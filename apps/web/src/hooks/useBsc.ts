"use client";

import { useEffect, useRef, useState } from "react";
import type { BscStats } from "@/lib/bscTypes";

export type { BscStats };

/** Polls /api/bsc (server-cached reads of the BSC mainnet contracts). */
export function useBsc(intervalMs = 15_000): BscStats | null {
  const [stats, setStats] = useState<BscStats | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const r = await fetch("/api/bsc", { cache: "no-store" });
        const j = (await r.json()) as BscStats;
        if (alive) setStats(j);
      } catch {
        if (alive) setStats((s) => s ?? ({ ok: false, deposits: [], seatClaims: [] } as unknown as BscStats));
      } finally {
        if (alive) timer.current = setTimeout(tick, document.hidden ? intervalMs * 4 : intervalMs);
      }
    }
    tick();
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [intervalMs]);

  return stats;
}
