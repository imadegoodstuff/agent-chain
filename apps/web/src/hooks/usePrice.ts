"use client";

import { useEffect, useState } from "react";
import { DEXSCREENER_URL, FEES } from "@/lib/spec";

export type Price = {
  usd: number;
  change24h: number | null;
  live: boolean;
  source: string;
  pairUrl?: string;
  liquidityUsd?: number;
};

type DexPair = {
  chainId: string;
  dexId: string;
  url: string;
  priceUsd?: string;
  priceChange?: { h24?: number };
  liquidity?: { usd?: number };
  baseToken?: { address?: string };
};

export const FALLBACK_PRICE: Price = {
  usd: FEES.antIpoClose,
  change24h: null,
  live: false,
  source: "IPO close",
};

let shared: Price | null = null;

export function usePrice(refreshMs = 60_000): Price {
  const [price, setPrice] = useState<Price>(shared ?? FALLBACK_PRICE);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch(DEXSCREENER_URL, { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as { pairs?: DexPair[] };
        const pairs = (j.pairs ?? []).filter((p) => p.priceUsd && Number(p.priceUsd) > 0);
        if (!pairs.length) throw new Error("no pairs");
        pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
        const best = pairs[0];
        const next: Price = {
          usd: Number(best.priceUsd),
          change24h: typeof best.priceChange?.h24 === "number" ? best.priceChange.h24 : null,
          live: true,
          source: `${best.dexId} · ${best.chainId}`,
          pairUrl: best.url,
          liquidityUsd: best.liquidity?.usd,
        };
        shared = next;
        if (alive) setPrice(next);
      } catch {
        if (alive) setPrice((p) => (p.live ? p : FALLBACK_PRICE));
      }
    }
    load();
    const id = setInterval(load, refreshMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [refreshMs]);

  return price;
}
