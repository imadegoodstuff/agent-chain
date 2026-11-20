"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dict, type DictKey, type Lang } from "@/lib/i18n";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: DictKey) => string };

const LangContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => dict.en[k] });

/**
 * `initial` comes from the server (middleware: ?lang → cookie → en), so the
 * first paint is already in the right language. The toggle writes the cookie
 * (source of truth for the server), localStorage (legacy) and refreshes the
 * server-rendered tree so docs pages switch too.
 */
export function LangProvider({ children, initial = "en" }: { children: ReactNode; initial?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initial);
  const router = useRouter();

  // Keep client state in sync when the server re-renders with another language
  // (e.g. the docs page toggle navigates to ?lang=zh).
  useEffect(() => {
    setLangState(initial);
  }, [initial]);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    try {
      window.localStorage.setItem("ac.lang", lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      try {
        document.cookie = `ac.lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        window.localStorage.setItem("ac.lang", l);
        const url = new URL(window.location.href);
        if (l === "zh") url.searchParams.set("lang", "zh");
        else url.searchParams.delete("lang");
        window.history.replaceState(null, "", url.toString());
      } catch {
        /* ignore */
      }
      router.refresh();
    },
    [router],
  );

  const value = useMemo<Ctx>(() => ({ lang, setLang, t: (k) => dict[lang][k] ?? dict.en[k] }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/** Inline bilingual helper: `const L = useL(); L("English", "中文")`. */
export function useL() {
  const { lang } = useLang();
  return useCallback((en: string, zh: string) => (lang === "zh" ? zh : en), [lang]);
}

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`inline-flex items-center rounded-md border border-line font-mono text-[11px] tracking-wider ${className}`}>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`px-2.5 py-1.5 transition-colors ${lang === "en" ? "text-bone" : "text-muted hover:text-bone"}`}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
      <span className="h-3 w-px bg-line" />
      <button
        type="button"
        onClick={() => setLang("zh")}
        className={`px-2.5 py-1.5 transition-colors ${lang === "zh" ? "text-bone" : "text-muted hover:text-bone"}`}
        aria-pressed={lang === "zh"}
      >
        中文
      </button>
    </div>
  );
}
