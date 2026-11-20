"use client";

import type { ReactNode } from "react";
import { Reveal } from "./Reveal";
import { useLang } from "../LangProvider";
import type { DictKey } from "@/lib/i18n";

export function SectionHeader({
  index,
  titleKey,
  label,
  heading,
  lede,
  className = "",
}: {
  index: string;
  titleKey?: DictKey;
  label?: string;
  heading: ReactNode;
  lede?: ReactNode;
  className?: string;
}) {
  const { t } = useLang();
  const lab = (titleKey ? t(titleKey) : label ?? "").toUpperCase();
  return (
    <Reveal className={`mb-12 md:mb-16 ${className}`}>
      <div className="label-amber mb-5 flex items-center gap-3">
        <span>{index}</span>
        <span className="text-line">/</span>
        <span>{lab}</span>
      </div>
      <h2 className="h-display max-w-3xl text-3xl leading-[1.08] sm:text-4xl md:text-[44px]">{heading}</h2>
      {lede && <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted md:text-lg">{lede}</p>}
    </Reveal>
  );
}

export function Section({
  id,
  children,
  className = "",
  bleed = false,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  bleed?: boolean;
}) {
  return (
    <section id={id} className={`scroll-mt-20 py-24 md:py-32 ${className}`}>
      {bleed ? children : <div className="container-site">{children}</div>}
    </section>
  );
}
