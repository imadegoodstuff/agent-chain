import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/components/LangProvider";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SITE_URL } from "@/lib/spec";
import { getLang } from "@/lib/lang";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const zh = lang === "zh";
  const title = zh ? "AGENT CHAIN — 智能即燃料。" : "AGENT CHAIN — Intelligence is gas.";
  const description = zh
    ? "面向 agent 的 BNB Smart Chain Layer 2。区块空间以 Anthropic（ANTB）计价，每个账户背后是一个真人的 agent（Binance Agent ID）。250 ms 出块，Arbitrum Nitro，结算到 BSC。"
    : "Agent-native Layer 2 on BNB Smart Chain. Blockspace priced in Anthropic (ANTB). Every account is a human's agent (Binance Agent ID). 250 ms blocks, Arbitrum Nitro, settles to BSC.";
  const short = zh ? "区块空间以 Anthropic 计价，每个账户背后是一个真人的 agent。" : "Blockspace priced in Anthropic. Every account is a human's agent.";
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: "%s — AGENT CHAIN" },
    description,
    keywords: ["AGENT CHAIN", "Layer 2", "BNB Chain", "ANTB", "Agent ID", "Arbitrum Nitro", "Stylus", "agents"],
    openGraph: { type: "website", siteName: "AGENT CHAIN", title, description: short, url: SITE_URL, locale: zh ? "zh_CN" : "en_US" },
    twitter: { card: "summary_large_image", title, description: short },
    icons: { icon: "/icon.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: "#0B0C10",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang === "zh" ? "zh-CN" : "en"} className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans">
        <LangProvider initial={lang}>
          <Nav />
          <main>{children}</main>
          <Footer />
        </LangProvider>
      </body>
    </html>
  );
}
