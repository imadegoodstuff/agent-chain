import Link from "next/link";
import { Hexagon } from "lucide-react";
import { SearchBox } from "./SearchBox";
import { LiveDot } from "./LiveDot";
import { networkBadgeLabel } from "@/lib/config";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur supports-[backdrop-filter]:bg-ink/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <Hexagon className="h-5 w-5 text-amber group-hover:rotate-[30deg] transition-transform duration-500" strokeWidth={2} />
          <span className="font-semibold tracking-[0.22em] text-[13px] text-bone">AGENT CHAIN</span>
          <span className="hidden sm:inline label text-muted/80 mt-[1px]">Explorer</span>
        </Link>

        <Link
          href="/"
          className="hidden md:inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[11px] text-muted hover:border-amber/50 transition-colors"
          title="Network"
        >
          <LiveDot />
          {networkBadgeLabel()}
        </Link>

        <div className="flex-1 flex justify-end">
          <SearchBox compact />
        </div>
      </div>
    </header>
  );
}
