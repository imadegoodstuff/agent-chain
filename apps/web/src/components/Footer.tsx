"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DEVNET_RPC_URL, disclaimers, LINKS, RPC_URL } from "@/lib/spec";
import { HexMark } from "./Logo";
import { useL, useLang } from "./LangProvider";

export function Footer() {
  const { t, lang } = useLang();
  const L = useL();
  const D = disclaimers(lang);
  const cols = [
    {
      title: t("footer_explore"),
      links: [
        { label: L("Whitepaper", "白皮书"), href: LINKS.whitepaper },
        { label: L("Roadmap", "路线图"), href: LINKS.roadmap },
        { label: L("Genesis Seats", "创世席位"), href: LINKS.genesis },
        { label: L("Bridge", "跨链桥"), href: LINKS.bridge },
        { label: L("Explorer", "浏览器"), href: LINKS.explorer, external: true },
      ],
    },
    {
      title: t("footer_build"),
      links: [
        { label: L("Builders", "开发者"), href: LINKS.builders },
        { label: L("Mainnet RPC", "主网 RPC"), href: RPC_URL, external: true },
        { label: L("Devnet RPC (test)", "Devnet RPC（测试）"), href: DEVNET_RPC_URL, external: true },
        { label: L("Chain ID 1119", "链 ID 1119"), href: "/builders#network" },
        { label: L("BSC mainnet contracts", "BSC 主网合约"), href: "/builders#mainnet-contracts" },
        { label: "Arbitrum Nitro", href: "https://docs.arbitrum.io/", external: true },
        { label: "Stylus", href: "https://docs.arbitrum.io/stylus/gentle-introduction", external: true },
      ],
    },
    {
      title: t("footer_community"),
      links: [
        { label: L("Flap (launch venue · $AGENT not launched yet)", "Flap（发行场所 · $AGENT 尚未发行）"), href: LINKS.flap, external: true },
        { label: L("ANTB on DEX Screener", "DEX Screener 上的 ANTB"), href: LINKS.dexscreener, external: true },
        { label: "Binance Agent ID", href: "https://www.binance.com/en/agent-id", external: true },
        { label: "x402", href: "https://www.x402.org/", external: true },
        { label: "ERC-8004", href: "https://eips.ethereum.org/EIPS/eip-8004", external: true },
      ],
    },
  ];
  return (
    <footer className="hairline mt-32 bg-ink">
      <div className="container-site py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.3fr_repeat(3,minmax(0,1fr))]">
          <div>
            <div className="flex items-center gap-2.5">
              <HexMark />
              <span className="text-[13px] font-semibold tracking-[0.18em]">AGENT CHAIN</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              {L(
                "Agent-native Layer 2 on BNB Smart Chain, live in Mainnet Beta (chain 1119). Arbitrum Nitro stack. Gas priced in Anthropic. Accounts are Binance Agent IDs.",
                "面向 agent 的 BNB Smart Chain Layer 2，主网 Beta 已上线（链 1119）。Arbitrum Nitro 技术栈。Gas 以 Anthropic 计价。账户即 Binance Agent ID。",
              )}
            </p>
            <div className="mt-6 flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-green" />
              MAINNET BETA · CHAIN 1119 · SIN
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div className="label mb-4">{c.title}</div>
              <ul className="space-y-2.5">
                {c.links.map((l) =>
                  l.external ? (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-bone/80 transition-colors hover:text-amber"
                      >
                        {l.label}
                        <ArrowUpRight size={12} className="text-muted" />
                      </a>
                    </li>
                  ) : (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-bone/80 transition-colors hover:text-amber">
                        {l.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="hairline mt-14 pt-8">
          <p className="max-w-4xl text-xs leading-relaxed text-muted">{D.affiliation}</p>
          <p className="mt-3 max-w-4xl text-xs leading-relaxed text-muted">{D.advice}</p>
          <p className="mt-3 text-xs text-muted">{D.devnet}</p>
          {lang === "zh" && (
            <details className="mt-3 max-w-4xl text-xs leading-relaxed text-muted/80">
              <summary className="cursor-pointer font-mono text-[11px] text-muted hover:text-bone">English legal text</summary>
              <p className="mt-2">{disclaimers("en").affiliation}</p>
              <p className="mt-2">{disclaimers("en").advice}</p>
            </details>
          )}
          <div className="mt-8 flex flex-col gap-3 font-mono text-[11px] tracking-wider text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 AGENT CHAIN</span>
            <span>INTELLIGENCE IS GAS · 智能即燃料</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
