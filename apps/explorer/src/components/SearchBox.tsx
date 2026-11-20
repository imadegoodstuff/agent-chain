"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";

export function SearchBox({ compact = false, autoFocus = false }: { compact?: boolean; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    router.push(`/search?q=${encodeURIComponent(v)}`);
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      className={`relative w-full ${compact ? "max-w-md" : "max-w-2xl"}`}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        spellCheck={false}
        autoComplete="off"
        placeholder={compact ? "Block / tx hash / address" : "Search by block number, transaction hash or address"}
        className={`w-full rounded-md border border-line bg-surface font-mono text-bone placeholder:text-muted/70 focus:outline-none focus:border-amber/70 focus:ring-2 focus:ring-amber/15 transition ${
          compact ? "h-9 pl-9 pr-3 text-[13px]" : "h-12 pl-11 pr-20 text-sm"
        }`}
      />
      {!compact && (
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">
          Enter
        </kbd>
      )}
    </form>
  );
}
