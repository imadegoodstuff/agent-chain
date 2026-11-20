import Link from "next/link";
import { Download } from "lucide-react";
import type { Doc } from "@/lib/docs";
import { Markdown } from "./Markdown";
import { Toc } from "./Toc";
import { DISCLAIMERS } from "@/lib/spec";

export function DocLangToggle({ base, lang }: { base: string; lang: "en" | "zh" }) {
  return (
    <div className="inline-flex items-center rounded-md border border-line font-mono text-[11px] tracking-wider">
      <Link href={`${base}?lang=en`} className={`px-2.5 py-1.5 ${lang === "en" ? "text-bone" : "text-muted hover:text-bone"}`} scroll={false}>
        EN
      </Link>
      <span className="h-3 w-px bg-line" />
      <Link
        href={`${base}?lang=zh`}
        className={`px-2.5 py-1.5 ${lang === "zh" ? "text-bone" : "text-muted hover:text-bone"}`}
        scroll={false}
      >
        中文
      </Link>
    </div>
  );
}

export function Placeholder({ title, lang }: { title: string; lang: "en" | "zh" }) {
  return (
    <div className="card relative overflow-hidden p-10 md:p-14">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber/10 blur-3xl" />
      <div className="label-amber">{lang === "zh" ? "即将发布" : "Publishing"}</div>
      <h2 className="h-display mt-4 text-3xl md:text-4xl">{title}</h2>
      <p className="mt-4 max-w-xl text-muted">
        {lang === "zh"
          ? "文档正在撰写中，将随 Devnet 一起发布。此页面会在文件就绪后自动显示全文。"
          : "This document is being written alongside the devnet and will appear here as soon as it lands. Nothing else on the site depends on it."}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="btn-ghost">
          {lang === "zh" ? "返回首页" : "Back to home"}
        </Link>
        <Link href="/roadmap" className="btn-ghost">
          {lang === "zh" ? "查看路线图" : "View roadmap"}
        </Link>
      </div>
    </div>
  );
}

export function DocShell({
  doc,
  base,
  lang,
  fallbackTitle,
  kicker,
  children,
  aside,
  showDisclaimer = false,
}: {
  doc: Doc;
  base: string;
  lang: "en" | "zh";
  fallbackTitle: string;
  kicker: string;
  children?: React.ReactNode;
  aside?: React.ReactNode;
  showDisclaimer?: boolean;
}) {
  const title = doc.title ?? fallbackTitle;
  const meta = [doc.version ? `v${doc.version.replace(/^v/i, "")}` : null, doc.date ?? null].filter(Boolean).join(" · ");
  return (
    <div className="container-site pt-28 md:pt-36">
      <div className="hairline flex flex-wrap items-end justify-between gap-4 pb-8">
        <div>
          <div className="label-amber">{kicker}</div>
          <h1 className="h-display mt-3 text-4xl md:text-5xl">{title}</h1>
          {meta && <div className="mt-3 font-mono text-xs text-muted">{meta}</div>}
          {doc.present && doc.lang !== lang && (
            <div className="mt-2 font-mono text-[11px] text-muted">
              {lang === "zh" ? "中文版尚未发布，显示英文版。" : "English version not published yet; showing 中文."}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <DocLangToggle base={base} lang={lang} />
          {doc.present && (
            <a
              href={`${base}/raw?lang=${doc.lang}`}
              download={doc.file}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 font-mono text-[11px] tracking-wider text-muted hover:text-bone"
            >
              <Download size={12} /> Download .md
            </a>
          )}
        </div>
      </div>

      {children}

      {doc.present ? (
        <div className="grid grid-cols-1 gap-12 pt-10 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-16">
          <article className="min-w-0 max-w-[72ch]">
            <Markdown content={doc.content} headingIds={doc.headings.map((h) => h.id)} />
            {showDisclaimer && (
              <div className="hairline mt-16 space-y-3 pt-8 text-xs leading-relaxed text-muted">
                <p>{DISCLAIMERS.affiliation}</p>
                <p>{DISCLAIMERS.advice}</p>
              </div>
            )}
          </article>
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-8">
              <Toc headings={doc.headings} />
              {aside}
            </div>
          </aside>
        </div>
      ) : (
        <div className="pt-10">
          <Placeholder title={fallbackTitle} lang={lang} />
          {aside && <div className="mt-10">{aside}</div>}
        </div>
      )}
    </div>
  );
}
