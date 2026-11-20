"use client";

import { Section, SectionHeader } from "../ui/Section";
import { Item, Stagger } from "../ui/Reveal";
import { useL } from "../LangProvider";

export function History() {
  const L = useL();
  const eras = [
    {
      year: "2015",
      title: L("Gas is born", "Gas 诞生"),
      body: L("Ethereum meters computation in gas and prices it in ETH. Blockspace becomes a commodity.", "以太坊用 gas 计量计算并以 ETH 定价。区块空间成为商品。"),
    },
    {
      year: "2020",
      title: L("Rollups", "Rollup"),
      body: L("Execution moves off L1. Optimistic rollups post calldata and inherit settlement security.", "执行移出 L1。Optimistic rollup 发布 calldata 并继承结算层安全。"),
    },
    {
      year: "2023",
      title: L("Custom gas tokens", "自定义 gas 代币"),
      body: L("Orbit and OP Stack chains let an L2 pick its own gas token. Fees decouple from ETH.", "Orbit 与 OP Stack 允许 L2 自选 gas 代币。费用与 ETH 脱钩。"),
    },
    {
      year: "2025",
      title: L("Equities onchain", "股票上链"),
      body: L("Tokenized stocks trade 24/7 on public chains. Real-world prices become onchain primitives.", "代币化股票在公链上 7×24 交易。真实世界价格成为链上原语。"),
    },
    {
      year: "2026",
      title: L("Agent identity", "Agent 身份"),
      body: L(
        "Binance Agent ID (Oct 2026): one non-transferable ID per KYC'd human, issued for their agents.",
        "Binance Agent ID（2026 年 10 月）：每位 KYC 真人一个不可转让的 ID，为其 agent 签发。",
      ),
    },
    {
      year: "2026",
      title: L("Intelligence is gas", "智能即燃料"),
      body: L(
        "Anthropic IPO, Nov 19 2026. ANTB lists on BSC day 1. AGENT CHAIN prices blockspace in it.",
        "Anthropic 于 2026 年 11 月 19 日 IPO。ANTB 首日登陆 BSC。AGENT CHAIN 用它为区块空间定价。",
      ),
      now: true,
    },
  ];
  return (
    <Section id="history" bleed>
      <div className="container-site">
        <SectionHeader
          index="01"
          titleKey="s_history"
          heading={L("Gas has always tracked what the network values. We moved it one step up the stack.", "Gas 一直追踪网络所看重的东西。我们把它往上挪了一层。")}
        />
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute left-0 top-[3.1rem] hidden h-px w-full bg-line md:block" />
        <Stagger className="container-site grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-6 md:gap-y-0" gap={0.08}>
          {eras.map((e) => (
            <Item key={e.title} className="relative md:pt-16">
              <div className="flex items-center gap-3 md:absolute md:left-0 md:top-[2.55rem] md:gap-0">
                <span
                  className={`block h-[9px] w-[9px] rounded-full ring-4 ring-ink ${e.now ? "bg-amber glow-amber" : "bg-line"}`}
                />
                <span className="font-mono text-xs text-muted md:hidden">{e.year}</span>
              </div>
              <div className="num hidden font-mono text-xs text-muted md:block">{e.year}</div>
              <div className={`mt-2 text-base font-medium ${e.now ? "text-amber" : "text-bone"}`}>{e.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{e.body}</p>
            </Item>
          ))}
        </Stagger>
      </div>
    </Section>
  );
}
