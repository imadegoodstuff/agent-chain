"use client";

import { Section } from "../ui/Section";
import { Item, Reveal, Stagger } from "../ui/Reveal";
import { useL, useLang } from "../LangProvider";

export function Thesis() {
  const { t } = useLang();
  const L = useL();
  const facts = [
    {
      k: L("Gas", "Gas"),
      v: "ANTB (Anthropic)",
      d: L(
        "Binance bStocks tokenized Anthropic stock, BEP-20 on BSC, bridged 1:1 as the native currency. Fees quoted in USD, settled in ANTB.",
        "Binance bStocks 发行的 Anthropic 股票代币，BSC 上的 BEP-20，1:1 跨入作为原生货币。费用以美元报价，以 ANTB 结算。",
      ),
    },
    {
      k: L("Accounts", "账户"),
      v: "Binance Agent ID",
      d: L(
        "The sequencer only includes transactions from addresses holding an Agent ID (ERC-721, one per KYC'd human, non-transferable) or a BAB token.",
        "排序器只打包持有 Agent ID（ERC-721，每位 KYC 真人一个，不可转让）或 BAB 代币的地址发出的交易。",
      ),
    },
    {
      k: L("Settlement", "结算"),
      v: L("Settles to BSC · 250 ms blocks", "结算到 BSC · 250 ms 出块"),
      d: L(
        "Arbitrum Nitro rollup. Calldata posted to BSC, BoLD fraud proofs. BSC fast finality (1.5–4 s) backs the sequencer's preconfirmations.",
        "Arbitrum Nitro rollup。Calldata 发布到 BSC，BoLD 欺诈证明。BSC 快速最终性（1.5–4 s）为排序器的预确认背书。",
      ),
    },
  ];
  return (
    <Section id="thesis">
      <Reveal>
        <div className="label-amber mb-6 flex items-center gap-3">
          <span>00</span>
          <span className="text-line">/</span>
          <span>{t("s_thesis").toUpperCase()}</span>
        </div>
        <p className="h-display max-w-5xl text-[clamp(1.75rem,4.2vw,3.25rem)] leading-[1.12]">
          {L("Every chain prices blockspace in its own token. ", "每条链都用自己的代币为区块空间定价。")}
          <span className="text-muted">
            {L("AGENT CHAIN prices it in the company that sells intelligence", "AGENT CHAIN 用那家出售智能的公司来定价")}
          </span>
          {L(" — and only lets verified humans' agents in.", "——并且只允许经过验证的真人的 agent 进入。")}
        </p>
      </Reveal>

      <Stagger className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
        {facts.map((f) => (
          <Item key={f.k} className="bg-surface p-7 md:p-8">
            <div className="label">{f.k}</div>
            <div className="mt-3 text-xl font-medium tracking-[-0.01em] text-bone">{f.v}</div>
            <p className="mt-4 text-sm leading-relaxed text-muted">{f.d}</p>
          </Item>
        ))}
      </Stagger>
    </Section>
  );
}
