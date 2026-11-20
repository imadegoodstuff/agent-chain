"use client";

import { useEffect, useMemo, useState } from "react";

export function Toc({ headings }: { headings: { depth: number; text: string; id: string }[] }) {
  const [active, setActive] = useState<string | null>(null);
  const items = useMemo(() => headings.filter((h) => h.depth >= 2 && h.depth <= 3), [headings]);

  useEffect(() => {
    if (!items.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    items.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [items]);

  if (!items.length) return null;
  return (
    <nav aria-label="Table of contents">
      <div className="label mb-4">On this page</div>
      <ul className="max-h-[60vh] space-y-1 overflow-y-auto border-l border-line text-[13px]">
        {items.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`-ml-px block border-l py-1 pr-2 transition-colors ${h.depth === 3 ? "pl-7" : "pl-4"} ${
                active === h.id ? "border-amber text-bone" : "border-transparent text-muted hover:text-bone"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
