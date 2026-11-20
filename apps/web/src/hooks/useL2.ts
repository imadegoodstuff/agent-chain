"use client";

import { useEffect, useRef, useState } from "react";
import type { L2Stats } from "@/lib/bscTypes";

export type { L2Stats };

/** Polls /api/l2 (server-cached AGENT CHAIN mainnet head + Nitro reads). */
export function useL2(intervalMs = 5_000): L2Stats | null {
  const [stats, setStats] = useState<L2Stats | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const r = await fetch("/api/l2", { cache: "no-store" });
        const j = (await r.json()) as L2Stats;
        if (alive) setStats(j);
      } catch {
        if (alive) setStats((s) => s ?? ({ ok: false, l2: null, parent: null, relayer: { ok: false, status: null } } as unknown as L2Stats));
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
