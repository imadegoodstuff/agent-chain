import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";

export type DocName = "whitepaper" | "roadmap" | "faq";
export type Lang = "en" | "zh";

export type Doc = {
  present: boolean;
  content: string;
  title?: string;
  version?: string;
  date?: string;
  lang: Lang;
  file: string;
  headings: { depth: number; text: string; id: string }[];
};

function docDirs(): string[] {
  const out: string[] = [];
  if (process.env.DOCS_DIR) out.push(process.env.DOCS_DIR);
  out.push(path.join(process.cwd(), "docs"));
  out.push(path.resolve(process.cwd(), "../../docs"));
  return out;
}

/**
 * Heading id, identical to what rehype-slug assigns in <Markdown> (both use
 * github-slugger@2 with a per-document slugger, so duplicates get -1, -2 …).
 * Headings whose slug would be empty (e.g. punctuation only) fall back to
 * `section-N`, applied on both sides via `headingId`.
 */
export function slugify(text: string): string {
  return new GithubSlugger().slug(text);
}

/** Plain text of a heading as rehype's toString() would see it (strip md inline markers/links). */
export function headingText(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim();
}

export function extractHeadings(md: string): Doc["headings"] {
  const out: Doc["headings"] = [];
  const slugger = new GithubSlugger();
  let inFence = false;
  let n = 0;
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    if (/^(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
    if (!m) continue;
    const text = headingText(m[2]);
    n++;
    const id = slugger.slug(text) || `section-${n}`;
    out.push({ depth: m[1].length, text, id });
  }
  return out;
}

export function readDoc(name: DocName, lang: Lang): Doc {
  const file = `${name}.${lang}.md`;
  for (const dir of docDirs()) {
    const p = path.join(dir, file);
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf8");
        const parsed = matter(raw);
        const fm = parsed.data as Record<string, unknown>;
        let content = parsed.content;
        const firstH1 = /^#\s+(.+)$/m.exec(content)?.[1];
        // The page header already shows the title; drop the leading H1 so it is not duplicated.
        if (firstH1) content = content.replace(/^\s*#\s+.+\r?\n/, "");
        return {
          present: true,
          content,
          title: (fm.title as string | undefined) ?? firstH1,
          version: fm.version !== undefined ? String(fm.version) : undefined,
          date: fm.date !== undefined ? String(fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : fm.date) : undefined,
          lang,
          file,
          headings: extractHeadings(content),
        };
      }
    } catch {
      /* fall through */
    }
  }
  return { present: false, content: "", lang, file, headings: [] };
}

/** Returns the doc for the requested language, falling back to the other language if missing. */
export function readDocWithFallback(name: DocName, lang: Lang): Doc {
  const d = readDoc(name, lang);
  if (d.present) return d;
  const other = readDoc(name, lang === "en" ? "zh" : "en");
  return other.present ? other : d;
}
