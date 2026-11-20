"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { LangToggle, useLang } from "./LangProvider";
import { Wordmark } from "./Logo";
import { LINKS } from "@/lib/spec";
import type { DictKey } from "@/lib/i18n";

const items: { key: DictKey; href: string; external?: boolean }[] = [
  { key: "nav_whitepaper", href: LINKS.whitepaper },
  { key: "nav_roadmap", href: LINKS.roadmap },
  { key: "nav_genesis", href: LINKS.genesis },
  { key: "nav_builders", href: LINKS.builders },
  { key: "nav_bridge", href: LINKS.bridge },
  { key: "nav_explorer", href: LINKS.explorer, external: true },
];

export function Nav() {
  const { t } = useLang();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || open ? "border-b border-line/80 bg-ink/80 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <div className="container-site flex h-16 items-center justify-between">
        <Link href="/" aria-label="AGENT CHAIN home" className="shrink-0">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {items.map((it) => {
            const active = !it.external && pathname === it.href;
            return it.external ? (
              <a
                key={it.key}
                href={it.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-bone"
              >
                {t(it.key)}
                <ArrowUpRight size={13} />
              </a>
            ) : (
              <Link
                key={it.key}
                href={it.href}
                className={`text-[13px] transition-colors hover:text-bone ${active ? "text-bone" : "text-muted"}`}
              >
                {t(it.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 rounded-md border border-line px-2.5 py-1.5 font-mono text-[11px] tracking-wider text-muted sm:inline-flex">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-green" />
            DEVNET
          </span>
          <LangToggle />
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-muted md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-ink/95 md:hidden">
          <nav className="container-site flex flex-col py-3" aria-label="Mobile">
            {items.map((it) => (
              <Link
                key={it.key}
                href={it.href}
                target={it.external ? "_blank" : undefined}
                className="flex items-center justify-between border-b border-line/60 py-3 text-sm text-bone last:border-0"
              >
                {t(it.key)}
                {it.external && <ArrowUpRight size={14} className="text-muted" />}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
