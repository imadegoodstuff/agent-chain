"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value, className = "", label }: { value: string; className?: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setOk(true);
          setTimeout(() => setOk(false), 1400);
        } catch {
          /* ignore */
        }
      }}
      className={`inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 font-mono text-[11px] text-muted transition-colors hover:border-[#3a3d4a] hover:text-bone ${className}`}
      aria-label={`Copy ${label ?? value}`}
    >
      {ok ? <Check size={12} className="text-green" /> : <Copy size={12} />}
      {ok ? "copied" : label ?? "copy"}
    </button>
  );
}
