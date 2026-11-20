"use client";

import { Activity, Coins, Cpu, FileCheck2, ShoppingBag, Waves } from "lucide-react";
import { Section, SectionHeader } from "../ui/Section";
import { Item, Stagger } from "../ui/Reveal";
import { useL } from "../LangProvider";

export function UseCases() {
  const L = useL();
  const cases = [
    {
      I: Coins,
      t: L("Agent payments", "Agent 支付"),
      d: L(
        "Agents pay each other and pay APIs at $0.001 a transfer, with a 71 ms receipt. x402 for HTTP, ANTB or paymaster-sponsored.",
        "agent 之间互相付款、为 API 付费，每笔 $0.001，71 ms 回执。HTTP 走 x402，用 ANTB 或由 Paymaster 代付。",
      ),
    },
    {
      I: FileCheck2,
      t: L("Inference receipts", "推理回执"),
      d: L(
        "Hash the prompt, model and output; anchor it onchain in the same block as the payment. Audit trails for agent work.",
        "对提示词、模型和输出做哈希，与付款同一区块锚定上链。为 agent 的工作留下审计轨迹。",
      ),
    },
    {
      I: Cpu,
      t: L("Model provenance", "模型溯源"),
      d: L(
        "Register models, versions and weights digests. Downstream agents verify what they are calling before they pay.",
        "登记模型、版本与权重摘要。下游 agent 在付款前验证自己调用的是什么。",
      ),
    },
    {
      I: Activity,
      t: L("Compute markets", "算力市场"),
      d: L(
        "Price GPU-seconds and tokens in a unit that already tracks the cost of intelligence. Settle per call, not per month.",
        "用一个本就追踪智能成本的单位为 GPU 秒和 token 定价。按次结算，而非按月。",
      ),
    },
    {
      I: Waves,
      t: L("Streaming payments", "流式支付"),
      d: L(
        "250 ms blocks make per-tick streams practical: pay a tool or a data feed while it is being used, stop when it stops.",
        "250 ms 出块让逐拍流支付切实可行：工具或数据源在使用时付费，停止时停付。",
      ),
    },
    {
      I: ShoppingBag,
      t: L("Agent commerce · ERC-8183", "Agent 商业 · ERC-8183"),
      d: L(
        "Agents buy and sell from each other under one identity standard, with the counterparty guaranteed to be a human's agent.",
        "agent 在同一身份标准下互相买卖，交易对手保证是某个真人的 agent。",
      ),
    },
  ];
  return (
    <Section id="use-cases">
      <SectionHeader
        index="07"
        titleKey="s_usecases"
        heading={L(
          "What you build when every account is an agent and fees are a rounding error.",
          "当每个账户都是 agent、费用只是舍入误差时，你会构建什么。",
        )}
      />
      <Stagger className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {cases.map((c) => (
          <Item key={c.t} className="group bg-surface p-7 transition-colors hover:bg-surface-2">
            <c.I size={18} className="text-amber" strokeWidth={1.6} />
            <div className="mt-5 text-base font-medium text-bone">{c.t}</div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{c.d}</p>
          </Item>
        ))}
      </Stagger>
    </Section>
  );
}
