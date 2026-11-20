"use client";

import { useEffect, useState } from "react";
import { formatTimestamp, relativeAge } from "@/lib/format";

/** Relative age that re-renders every second. Renders a stable placeholder on the server. */
export function Age({ ts, className = "" }: { ts: number; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className={`num text-muted ${className}`} title={formatTimestamp(ts)} suppressHydrationWarning>
      {now === null ? "—" : relativeAge(ts, now)}
    </span>
  );
}
