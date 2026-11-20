"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Section, SectionHeader } from "../ui/Section";
import { Reveal } from "../ui/Reveal";
import { useL, useLang } from "../LangProvider";

export const faqItems: { q: string; a: string }[] = [
  {
    q: "Is AGENT CHAIN live? Which chain ID?",
    a: "Yes — Mainnet Beta launched on 2026-11-20: AGENT CHAIN is chain ID 1119, an Arbitrum Nitro rollup (v3.12.4 / ArbOS 61) settling to BSC, with ANTB as native gas, a single sequencer, BoLD validation and an Agent ID gateway at https://rpc.agent-chain.agency (non-agents are rejected with error -32050). The BSC contracts (AgentRegistryMirror, GenesisSeatClaim, Bridge) are live and verified. A devnet (chain 11190, test tokens with no value) remains at devnet-rpc.agent-chain.agency for experiments.",
  },
  {
    q: "What is the gas token?",
    a: "ANTB — Binance's bStocks tokenized Anthropic stock, a BEP-20 on BSC (0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53, 18 decimals), bridged 1:1 into AGENT CHAIN as the native currency. On devnet and testnet it is tANTB, a test token with no value.",
  },
  {
    q: "Why does a fee stay constant in USD if the gas token is a stock?",
    a: "Fees are quoted in USD ($0.045 per 1,000,000 gas) and settled in ANTB. A fee keeper re-prices the base fee from the ANTB market every 5 minutes (writes on a ≥0.5% move, ≤5% change per write, 1 write / 60 s). If ANT doubles, you pay half as many ANTB for the same transfer.",
  },
  {
    q: "Who can transact?",
    a: "Addresses that hold a Binance Agent ID (ERC-721 on BSC, one per KYC'd human, non-transferable) or a BAB token. The sequencer pre-checks isAgent before inclusion. On devnet the gate is mirrored by the AgentRegistry contract and the node is open for testing.",
  },
  {
    q: "What is a Genesis Seat?",
    a: "A numbered, non-transferable ERC-721 that any Agent ID (or BAB) holder claims once on BSC via GenesisSeatClaim.claim(); seat numbers follow claim order. The Beta relayer mirrors seat holders into the L2 AgentRegistry on chain 1119 — the genesis block itself is empty. Seats are identity and priority credentials; the fee split that allocates 40% of sequencer fees to seats is a governance parameter, not a promise of returns. On devnet, mint() is open to anyone for testing.",
  },
  {
    q: "How fast is it, really?",
    a: "250 ms blocks, first-come-first-served, no public mempool, tips off. The sequencer signs a preconfirmation receipt on receipt of a transaction, so perceived latency is 50–100 ms. BSC fast finality (1.5–4 s) backs those preconfirmations. Phase 3 adds 50 ms streamed sub-blocks.",
  },
  {
    q: "What is $AGENT and does it pay me anything?",
    a: "$AGENT launches on Flap in Phase 2 with the ANTB pool as an open launch: any wallet can buy, hold and trade $AGENT on BSC — no Agent ID gate, no per-wallet cap. Agent ID is required to transact on the chain, never to hold the token. 40% of sequencer revenue buys and burns $AGENT; there is no team swap fee. $AGENT confers no rights to revenue, equity, or returns; fee distributions are protocol parameters that governance can change. Nothing here is investment advice.",
  },
  {
    q: "Is this affiliated with Anthropic or Binance?",
    a: "No. AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules; bStocks are not available to US persons and are restricted in other jurisdictions.",
  },
];

export const faqItemsZh: { q: string; a: string }[] = [
  {
    q: "AGENT CHAIN 上线了吗？链 ID 是多少？",
    a: "是的——主网 Beta 于 2026-11-20 上线：AGENT CHAIN 链 ID 1119，Arbitrum Nitro rollup（v3.12.4 / ArbOS 61），结算到 BSC，以 ANTB 为原生 gas，单排序器、BoLD 验证，并在 https://rpc.agent-chain.agency 提供 Agent ID 网关（非 agent 会被拒绝，错误码 -32050）。BSC 合约（AgentRegistryMirror、GenesisSeatClaim、Bridge）已上线并通过验证。Devnet（链 11190，测试代币无价值）仍在 devnet-rpc.agent-chain.agency 供实验。",
  },
  {
    q: "Gas 代币是什么？",
    a: "ANTB —— Binance bStocks 发行的 Anthropic 股票代币，BSC 上的 BEP-20（0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53，18 位小数），1:1 跨入 AGENT CHAIN 作为原生货币。Devnet 与 Testnet 使用 tANTB 测试代币，没有价值。",
  },
  {
    q: "Gas 代币是股票，为什么费用能以美元恒定？",
    a: "费用以美元报价（每 1,000,000 gas $0.045），以 ANTB 结算。费用守护进程每 5 分钟根据 ANTB 市场重新定价基础费用（变动 ≥0.5% 才写入，每次最多调整 5%，每 60 秒最多写入一次）。如果 ANT 翻倍，同一笔转账需要的 ANTB 减半。",
  },
  {
    q: "谁可以交易？",
    a: "持有 Binance Agent ID（BSC 上的 ERC-721，每位 KYC 真人一个，不可转让）或 BAB 代币的地址。排序器在打包前预检 isAgent。Devnet 上由 AgentRegistry 合约镜像该门控，节点对测试开放。",
  },
  {
    q: "什么是创世席位（Genesis Seat）？",
    a: "一个带编号、不可转让的 ERC-721，任何 Agent ID（或 BAB）持有者都可在 BSC 上通过 GenesisSeatClaim.claim() 领取一次，编号按领取顺序。Beta relayer 把席位持有者镜像到链 1119 的 L2 AgentRegistry——创世区块本身是空的。席位是身份与优先级凭证；把 40% 排序器费用分配给席位是治理参数，而非回报承诺。Devnet 上 mint() 对任何人开放以便测试。",
  },
  {
    q: "到底有多快？",
    a: "250 ms 出块，先到先得，无公开内存池，不收小费。排序器收到交易即签发预确认回执，感知延迟 50–100 ms。BSC 快速最终性（1.5–4 s）为预确认背书。Phase 3 增加 50 ms 流式子块。",
  },
  {
    q: "$AGENT 是什么？它会给我分红吗？",
    a: "$AGENT 将在 Phase 2 于 Flap 以 ANTB 池开放发行：任何钱包都可以在 BSC 上买卖和持有 $AGENT —— 无 Agent ID 门槛、无单钱包上限。Agent ID 只是在链上交易所需，与持有代币无关。排序器收入的 40% 用于回购销毁 $AGENT；没有团队交易手续费。$AGENT 不赋予任何收入、股权或回报权利；费用分配是治理可更改的协议参数。本页内容不构成投资建议。",
  },
  {
    q: "与 Anthropic 或 Binance 有关联吗？",
    a: "没有。AGENT CHAIN 为独立项目，与 Anthropic, PBC、Binance 或 BNB Chain 无任何关联，未获其背书或赞助。ANTB 由 BTech Holdings Ltd（bStocks）依据 ADGM 规则发行；bStocks 不面向美国人士，并在其他司法辖区受到限制。",
  },
];

export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-6 py-5 text-left"
            >
              <span className="flex items-baseline gap-4">
                <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-base font-medium text-bone md:text-lg">{it.q}</span>
              </span>
              <Plus
                size={16}
                className={`shrink-0 text-muted transition-transform duration-300 ${isOpen ? "rotate-45 text-amber" : ""}`}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-3xl pb-6 pl-9 text-sm leading-relaxed text-muted md:text-[15px]">{it.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export function FAQ() {
  const { lang } = useLang();
  const L = useL();
  return (
    <Section id="faq">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-20">
        <SectionHeader index="09" titleKey="s_faq" heading={L("Questions, answered plainly.", "直接回答常见问题。")} className="lg:mb-0" />
        <Reveal>
          <Accordion items={lang === "zh" ? faqItemsZh : faqItems} />
        </Reveal>
      </div>
    </Section>
  );
}
