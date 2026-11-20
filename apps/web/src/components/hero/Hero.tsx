"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { HeroLattice } from "./HeroLattice";
import { useL, useLang } from "../LangProvider";
import { LINKS } from "@/lib/spec";
import { HeroHud } from "./HeroHud";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

function useHeroMode() {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<"static" | "3d">("static");
  const [count, setCount] = useState(8000);
  useEffect(() => {
    if (reduce) return;
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") || c.getContext("webgl");
      if (!gl) return;
      const w = window.innerWidth;
      const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8;
      const cores = navigator.hardwareConcurrency ?? 8;
      let n = 9000;
      if (w < 640) n = 3200;
      else if (w < 1024) n = 5500;
      if (mem <= 4 || cores <= 4) n = Math.round(n * 0.7);
      setCount(n);
      // defer so first paint (LCP text) is not blocked by three.js parsing
      const id = window.requestIdleCallback
        ? window.requestIdleCallback(() => setMode("3d"), { timeout: 1200 })
        : window.setTimeout(() => setMode("3d"), 300);
      return () => {
        if (window.cancelIdleCallback) window.cancelIdleCallback(id as number);
        else window.clearTimeout(id as number);
      };
    } catch {
      /* static */
    }
  }, [reduce]);
  return { mode, count };
}

export function Hero() {
  const { t } = useLang();
  const L = useL();
  const { mode, count } = useHeroMode();
  const [ready, setReady] = useState(false);
  const ease = [0.21, 0.47, 0.32, 0.98] as const;

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink">
      {/* background: static lattice → 3D canvas */}
      <div className="absolute inset-0 -z-10">
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${mode === "3d" && ready ? "opacity-0" : "opacity-100"}`}
        >
          <HeroLattice className="h-full w-full opacity-70" />
        </div>
        {mode === "3d" && (
          <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}>
            <HeroScene count={count} onReady={() => setReady(true)} />
          </div>
        )}
        {/* warm light behind the lattice */}
        <div className="pointer-events-none absolute right-[-10%] top-[20%] h-[70vh] w-[70vw] rounded-full bg-[radial-gradient(closest-side,rgba(240,179,91,0.10),transparent)] blur-2xl" />
        {/* text protection on the left (desktop) */}
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[55%] bg-gradient-to-r from-ink/80 via-ink/40 to-transparent lg:block" />
        {/* vignette + bottom fade to ink */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_45%,transparent_30%,rgba(11,12,16,0.75)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-ink" />
      </div>

      {/* copy */}
      <div className="container-site flex flex-1 flex-col justify-center pb-32 pt-32 md:pt-36">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="label flex items-center gap-3"
        >
          <span className="inline-flex h-1.5 w-1.5 animate-blink rounded-full bg-green" />
          <span className="truncate">{t("hero_label")}</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.08 }}
          className="h-display mt-7 max-w-4xl text-[clamp(2.75rem,8.5vw,6.75rem)] leading-[0.98]"
        >
          {t("hero_h1")}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.18 }}
          className="mt-7 max-w-xl text-lg leading-relaxed text-muted md:text-xl"
        >
          {t("hero_sub")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.28 }}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <Link href={`${LINKS.genesis}#agent`} className="btn-primary">
            {t("cta_agent")}
            <ArrowRight size={15} />
          </Link>
          <a href={LINKS.explorer} target="_blank" rel="noreferrer" className="btn-ghost">
            {t("cta_explorer")}
            <ArrowUpRight size={15} className="text-muted" />
          </a>
          <Link href={LINKS.whitepaper} className="inline-flex h-11 items-center px-2 text-sm text-muted hover:text-bone">
            {t("cta_whitepaper")}
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }} className="mt-6">
          <Link
            href={LINKS.token}
            className="inline-flex items-center gap-2 rounded-full border border-amber/40 bg-amber/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-amber hover:bg-amber/20"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber" />
            {L("$AGENT live on Flap · 2026-11-20", "$AGENT 已在 Flap 发行 · 2026-11-20")}
            <ArrowRight size={12} />
          </Link>
        </motion.div>
      </div>

      {/* bottom HUD */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="absolute inset-x-0 bottom-0"
      >
        <HeroHud />
      </motion.div>
    </section>
  );
}
