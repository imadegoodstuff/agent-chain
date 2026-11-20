---
title: "AGENT CHAIN 常见问题"
version: 0.1
date: 2026-11-20
lang: zh
---

# AGENT CHAIN 常见问题

## 1. AGENT CHAIN 是什么？

AGENT CHAIN 是构建在 BNB Smart Chain 上、面向 agent 原生场景的 Layer 2，采用 Arbitrum Nitro 技术栈，以 rollup 模式运行（calldata 发布到 BSC，BoLD 欺诈证明，上线时验证者为许可制）。它与其他 rollup 有三点不同：gas 以 ANTB（代币化 Anthropic 股票）支付，但费率锚定美元；只有持有 Binance Agent ID 或 BAB 代币的地址可以交易；BSC 上每一位 Agent ID 持有者都带着编号的 Genesis Seat 被写入创世区块。链以 250 ms 出块，先到先服务排序，无公共内存池，关闭优先费。

## 2. 为什么用股票代币给 gas 定价？

AGENT CHAIN 的费用以美元报价，而不是以 ANTB 报价。基准费率为每 1,000,000 gas $0.045（示意值）；费用守护进程每 5 分钟用公式 `minBaseFee = baseRate / P × 1e18` 把它换算成 ANTB，其中 `P` 是 ANTB/USD 价格。选择 ANTB 作为结算资产，是因为它是 BSC 上已经存在、由 Binance 发行、流动性充足的 BEP-20，也因为这条链正是为它所代表的那家公司的 agent 而建。真正让模型对 agent 可用的是美元报价：用美元写好的预算，无论 ANT 在哪个价位都仍然有效。

## 3. ANT 价格变动时我的费用会怎样？

每笔交易的美元成本不变，变化的是扣除的 ANTB 数量。一笔 21,000 gas 的转账在任何价位都约为 $0.000945：

| ANT 价格 | 每笔转账 ANTB |
|---|---|
| $60 | 0.00001575 |
| $97.17 | 0.0000097 |
| $150 | 0.0000063 |
| $300 | 0.00000315 |

守护进程每 5 分钟评估一次，仅在变动 ≥ 0.5% 时写入，单次变动最多 5%，每 60 s 最多写一次，并拒绝偏离上一收盘价 ±5% 以外的读数。你的 ANTB *余额*会受 ANT 价格影响（能买到的交易笔数会变），但单笔交易的美元成本不会。数字均为示意值。

## 4. AGENT CHAIN 与 Anthropic 或 Binance 有关联吗？

没有。AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules; bStocks are not available to US persons and are restricted in other jurisdictions. AGENT CHAIN 只是把 ANTB 和 Binance Agent ID 作为已有的链上资产来使用；它不发行、不控制、也不代表二者中的任何一方。

## 5. 我需要持有 ANTB 才能使用吗？

不一定。原生 ANTB 是 gas 代币，但 ERC-4337 paymaster（EntryPoint v0.8）允许你用 BNB 或 USDT 支付：请求一份报价（有效期 60 秒），把 paymaster 的签名放进你的用户操作，paymaster 就会在 L2 替你支付 ANTB。如果你希望直接持有 ANTB，可以从 BSC 以 1:1 桥入（合约 `0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53`）。Mainnet Beta 期间，存款上限为每地址 1 ANTB、总量 500 ANTB。ANTB 适用发行方的资格规则，不向美国人士提供。

## 6. Agent ID 门控是如何工作的？

Binance Agent ID 是 BSC 上的 ERC-721（`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`），每个 KYC 账户一枚，不可转让。L2 上的 `AgentRegistry` 合约通过桥消息镜像 Agent ID 状态，并暴露 `isAgent(address)`。排序器在为交易排序之前检查 `isAgent(tx.origin)`；若为 false，交易在 RPC 层被拒绝，不会进入任何区块。BAB 代币同样被接受。因为每个地址背后都是一位真人，所以没有机器人、没有女巫、没有三明治攻击。handle 是公开别名；AGENT CHAIN 从不接触 KYC 数据。

## 7. 什么是 Genesis Seat（创世席位）？

主网上线前，在公布的区块对 BSC 上所有 Agent ID 持有者进行快照。每人被写入 0 号区块，获得一枚编号的、不可转让的 `GenesisSeat` 代币（按首次注册顺序编号）以及一小笔原生 ANTB。Genesis Seat 持有者合计获得排序器收入的 40%，按比例分配，一席一份。分配方式是可由治理修改的协议参数；席位不赋予任何股权或回报权利。

## 8. 主网上线了吗？

还没有。目前上线的是 Devnet：链 ID 11190，RPC `https://rpc.agent-chain.agency`，浏览器 `https://explorer.agent-chain.agency`，250 ms 出块，单节点，测试代币 tANTB 没有价值。BSC Testnet 上的 Testnet（链 ID 111900）是 Phase 1，目标 2026 年 12 月。Mainnet Beta（链 ID 1119）是 Phase 2，同样目标 2026 年 12 月，桥上限为每地址 1 ANTB、总量 500 ANTB。日期为目标而非承诺。

## 9. 它兼容 EVM 吗？

兼容。AGENT CHAIN 运行 Arbitrum Nitro，与 EVM 等价：Solidity 合约、Hardhat、Foundry、viem、ethers 和 MetaMask 无需改动即可使用。原生货币与 ETH 一样是 18 位小数。Stylus 也已启用，因此合约可以用 Rust 或任何能编译到 WASM 的语言编写。与通用 EVM 链的两点差异：排序器要求 `isAgent(tx.origin)` 为 true；优先费不影响排序。

## 10. 它有多快？

三个数字。**出块时间** 250 ms。**感知延迟** 50–100 ms：排序器一收到有效交易就签发预确认回执 `(txHash, seq, timestamp, sig)`；排序器位于新加坡，区域内客户端的延迟由往返时延决定。**最终性**：批次发布到 BSC，BSC 的快速最终性为 1.5–4 s；状态断言在 BoLD 挑战窗口后确认。Phase 3（2027 Q1）将增加 50 ms 流式子块以及 SIN/TYO/FRA/IAD 的边缘 RPC。

---

AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules; bStocks are not available to US persons and are restricted in other jurisdictions. Nothing here is investment advice. $AGENT confers no rights to revenue, equity, or returns; fee distributions are protocol parameters that governance can change. Devnet tokens have no value.

（中文参考译文：AGENT CHAIN 为独立项目，与 Anthropic, PBC、Binance 或 BNB Chain 无任何关联、背书或赞助关系。ANTB 由 BTech Holdings Ltd（bStocks）依据 ADGM 规则发行；bStocks 不向美国人士提供，并在其他司法辖区受限。本文内容不构成投资建议。$AGENT 不赋予任何收入、股权或回报权利；费用分配是可由治理修改的协议参数。Devnet 代币没有价值。）
