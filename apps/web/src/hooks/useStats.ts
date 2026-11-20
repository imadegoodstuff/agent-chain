"use client";

import { useEffect, useRef, useState } from "react";
import type { Stats } from "@/lib/types";

export type { Stats };

export function useStats(intervalMs = 3000, withEvents = false): Stats | null {
  const [stats, setStats] = useState<Stats | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    const url = `/api/stats${withEvents ? "?events=1" : ""}`;
    async function tick() {
      try {
        const r = await fetch(url, { cache: "no-store" });
        const j = (await r.json()) as Stats;
        if (alive) setStats(j);
      } catch {
        if (alive) setStats((s) => s ?? ({ ok: false } as Stats));
      } finally {
        if (alive) timer.current = setTimeout(tick, document.hidden ? intervalMs * 4 : intervalMs);
      }
    }
    tick();
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [intervalMs, withEvents]);

  return stats;
}
