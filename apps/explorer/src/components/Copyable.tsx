"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function Copyable({ value, className = "" }: { value: string; className?: string }) {
  const [done, setDone] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      title="Copy"
      aria-label="Copy to clipboard"
      className={`inline-flex items-center justify-center h-5 w-5 rounded text-muted hover:text-amber hover:bg-surface-2 transition-colors ${className}`}
    >
      {done ? <Check className="h-3 w-3 text-signal" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}
