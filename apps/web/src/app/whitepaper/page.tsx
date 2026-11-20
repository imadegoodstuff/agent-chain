import type { Metadata } from "next";
import { readDocWithFallback } from "@/lib/docs";
import { DocShell } from "@/components/docs/DocShell";
import { getLang } from "@/lib/lang";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const lang = await getLang((await searchParams).lang);
  return lang === "zh"
    ? { title: "白皮书", description: "AGENT CHAIN 白皮书 v0.1 —— 面向 agent 的 BNB Smart Chain Layer 2，gas 以 Anthropic 计价。" }
    : { title: "Whitepaper", description: "AGENT CHAIN whitepaper v0.1 — an agent-native Layer 2 on BNB Smart Chain with gas priced in Anthropic." };
}

export default async function WhitepaperPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const sp = await searchParams;
  const lang = await getLang(sp.lang);
  const doc = readDocWithFallback("whitepaper", lang);
  return (
    <DocShell
      doc={doc}
      base="/whitepaper"
      lang={lang}
      kicker={lang === "zh" ? "白皮书 · v0.1" : "Whitepaper · v0.1"}
      fallbackTitle={lang === "zh" ? "白皮书 v0.1 — 即将发布" : "Whitepaper v0.1 — publishing"}
      showDisclaimer
    />
  );
}
