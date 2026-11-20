"use client";

import { useEffect, useRef, useState } from "react";
import type { TokenStats } from "@/lib/bscTypes";

export type { TokenStats };

/** Polls /api/token (server-cached Flap Portal + ERC-20 reads for $AGENT). */
export function useToken(intervalMs = 10_000): TokenStats | null {
  const [stats, setStats] = useState<TokenStats | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const r = await fetch("/api/token", { cache: "no-store" });
        const j = (await r.json()) as TokenStats;
        if (alive) setStats(j);
      } catch {
        if (alive) setStats((s) => s ?? ({ ok: false, status: "unknown" } as unknown as TokenStats));
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
