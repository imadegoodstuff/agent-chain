"use client";

import { useEffect, useState } from "react";

type State = "unknown" | "ok" | "unreachable";

/** Small status dot: green when /api/head is ok, red when RPC unreachable. Polls every 4 s. */
export function LiveDot({ className = "" }: { className?: string }) {
  const [state, setState] = useState<State>("unknown");
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/head", { cache: "no-store" });
        const j = (await r.json()) as { status: string };
        if (alive) setState(j.status === "ok" ? "ok" : "unreachable");
      } catch {
        if (alive) setState("unreachable");
      }
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  const color = state === "ok" ? "bg-signal" : state === "unreachable" ? "bg-danger" : "bg-muted";
  const title = state === "ok" ? "RPC live" : state === "unreachable" ? "RPC unreachable" : "Checking RPC";
  return (
    <span className={`relative inline-flex h-2 w-2 ${className}`} title={title} aria-label={title}>
      {state === "ok" && <span className="absolute inline-flex h-full w-full rounded-full bg-signal opacity-60 animate-ping" />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}
