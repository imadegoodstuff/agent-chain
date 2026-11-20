# 智能即燃料：第一条搭在 BNB Smart Chain 上的 agent 原生 L2

*封面图：`x-announcement-16x9.jpg`*

每条区块链都用自己的代币给区块空间定价。这是唯一一个没人质疑的设计决定，也是我们改掉的那一个。

AGENT CHAIN 是一条为 AI agent 而建的 BNB Smart Chain Layer 2。gas 用 ANTB 支付——BSC 上发行的代币化 Anthropic 股票。账户是币安 Agent ID，一个经过验证的真人一个。它跑在 Arbitrum Nitro 栈上，250 毫秒出块，结算到 BSC。据我们所知，它是第一条以 BSC 为父链的 L2，第一条用代币化 AI 股票作原生 gas 的链，也是第一条账户模型是"人的身份"而不是"一把私钥"的链。

这篇文章讲清楚三件事：为什么这三个决定必须放在一起，今天已经上线了什么，接下来是什么。

## gas 应该追踪网络真正看重的东西

以太坊用 gas 计量计算、用 ETH 定价。后来 rollup 把执行和底层分开，Orbit、OP Stack 这类链栈允许 L2 选任意 ERC-20 当 gas 代币。几乎所有人都选了自己发的那个。

我们问了另一个问题：一个 agent 网络到底看重什么？agent 消耗智能、支付区块空间。最直接代表"智能的价格"的资产，就是卖智能的那些公司的股权。11 月 19 日 Anthropic 上市，bStocks 当天把 ANTB 放到 BSC 上，这个资产从此成了链上原语。

所以 AGENT CHAIN 用 ANTB 给区块空间定价。费用由守护进程按美元报价、以 ANTB 结算：一笔转账约 $0.001，一次 agent 间调用约 $0.002，无论股价在哪里。没有人需要为了发第一笔交易先去买一个新币——ANTB 在 Flap、PancakeSwap、币安钱包里早就有流动性。

还有第二个原因。gas 代币和网络代币想要的东西是相反的：gas 要便宜稳定，网络代币要随使用变稀缺。让一个资产同时干两件事，是大多数新链代币上线就没有底的原因。我们把两个角色拆开，并且明确说明：费用分配是治理参数，不是承诺。

## 每个账户背后都是一个真人的 agent

agent 经济死于女巫攻击。空投被刷，配额被钻，信誉可以买，没人分得清一千个 agent 和一个脚本。

币安 Agent ID 是 BSC 上的不可转让 ERC-721，一个 KYC 真人一个，专为让一个人的 agent 们在同一身份下行动而发。在 AGENT CHAIN 上，它不是外挂在某个应用上的白名单，而是账户模型本身。排序器只打包持有 Agent ID（或 BAB）的地址发出的交易。链上每一个对手方都是某个真人的 agent。

这改变了你能构建的东西。先到先得排序、没有公开内存池，意味着没什么可以抢跑。配额和治理数的是人，不是私钥。一个 agent 为一次工具调用向另一个 agent 付款时，知道收款方背后站着一个人。

## 创世由真人构成

主网上线前，BSC 上所有 Agent ID 持有者被快照并写入 0 号区块。截至区块 134,639,601，这是 236,355 个人。每人获得一个编号的、不可转让的 Genesis Seat 和一小笔原生 ANTB。

席位合约现已在 BSC 主网上线，开源验证，每一项 owner 权限都有文档。验证完成几分钟内第一批席位就被领走了。持有者可以在 agent-chain.agency/genesis 领取。

桥也已开放。Agent ID 持有者今天就可以存入 ANTB；上线前的每一笔存款按存款 nonce 顺序，1:1 写进 0 号区块成为原生余额。Beta 期间有上限，所有托管条款在页面上写明。

## 今天已上线

- Devnet：公开 RPC 和区块浏览器，250 毫秒出块，对所有人开放。
- BSC 主网：AgentRegistryMirror、GenesisSeatClaim、Bridge，全部 BscScan 验证。
- 白皮书 v0.1 和路线图，中英双语。
- MCP server，任何 agent 框架都能读取这条链。
- 面向币安 Agentic Wallet 的 Skill，用户的 agent 可以在命令行里注册、领席位、桥入。
- Nitro 主网 rollup 正在部署到 BSC。

## 接下来

12 月主网 Beta：ANTB 原生 gas、Agent ID 门控排序、让 agent 能用 BNB 或 USDT 付费的 paymaster、费用守护进程上线。然后是 50 毫秒流式预确认、多区域 RPC，以及用于 agent 身份和 HTTP 支付的 ERC-8004 与 x402 预部署。

AGENT CHAIN 为币安 Agent ID 黑客松而建。如果你持有 Agent ID，你的席位已经在等你。

agent-chain.agency

---

*AGENT CHAIN 为独立项目，与 Anthropic, PBC、Binance、BNB Chain 无关联，未获其背书或赞助。ANTB 由 BTech Holdings Ltd（bStocks）依 ADGM 规则发行，不向美国人士提供。本文不构成投资建议。Genesis Seat 不赋予任何收入、股权或回报权利；费用分配是治理可修改的协议参数。代币化股票存在市场风险。Devnet 代币没有价值。*

#BinanceWalletHackathon #AgenticWallet
