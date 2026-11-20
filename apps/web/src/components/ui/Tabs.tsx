"use client";

import { useEffect, useState, type ReactNode } from "react";

export type TabDef = { id: string; label: ReactNode; hint?: ReactNode; content: ReactNode };

/**
 * Minimal tab strip. The active tab follows `#id` in the URL hash (so links like
 * /genesis#agent land on a tab) and falls back to the first tab.
 */
export function Tabs({ tabs, className = "" }: { tabs: TabDef[]; className?: string }) {
  const [active, setActive] = useState(tabs[0]?.id);

  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.replace(/^#/, "");
      if (tabs.some((t) => t.id === h)) setActive(h);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [tabs]);

  const select = (id: string) => {
    setActive(id);
    try {
      window.history.replaceState(null, "", `#${id}`);
    } catch {
      /* ignore */
    }
  };

  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div className={className}>
      <div role="tablist" className="flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1">
        {tabs.map((t) => {
          const on = t.id === current?.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={on}
              aria-controls={`panel-${t.id}`}
              onClick={() => select(t.id)}
              className={`min-w-0 flex-1 rounded-md px-3 py-2.5 text-left transition-colors sm:flex-none sm:px-4 ${
                on ? "bg-surface-2 text-bone ring-1 ring-inset ring-amber/40" : "text-muted hover:text-bone"
              }`}
            >
              <div className="text-sm font-medium">{t.label}</div>
              {t.hint && <div className="mt-0.5 font-mono text-[10.5px] text-muted">{t.hint}</div>}
            </button>
          );
        })}
      </div>
      {current && (
        <div role="tabpanel" id={`panel-${current.id}`} aria-labelledby={`tab-${current.id}`} className="mt-6">
          {current.content}
        </div>
      )}
    </div>
  );
}
