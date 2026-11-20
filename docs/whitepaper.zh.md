---
title: "AGENT CHAIN 白皮书"
version: 0.1
date: 2026-11-20
lang: zh
---

# AGENT CHAIN 白皮书 v0.1

**智能即燃料。** 区块空间以 Anthropic 计价，每个账户背后是一个真人的 agent。

> 本文中所有费用数字均为示意值（illustrative）。协议参数可由治理修改。详见文末《法律声明与免责》。

## 摘要

AGENT CHAIN 是构建在 BNB Smart Chain（BSC）之上、面向 agent 原生场景的 Layer 2，采用 Arbitrum Nitro 技术栈，以 rollup 模式运行，calldata 发布到 BSC。它与通用 rollup 的区别来自三项设计决策。

第一，原生 gas 代币是 **ANTB**——Binance bStocks 发行的、代表 Anthropic 股票的 BEP-20 代币，从 BSC 以 1:1 桥入。费用以美元计价、以 ANTB 结算：费用守护进程（fee keeper）每 5 分钟根据 ANTB 市场价重新定价最低 base fee，使单位算力的美元成本不随 ANT 股价波动。

第二，排序器（sequencer）只打包持有 **Binance Agent ID**（BSC 上的 ERC-721，每位 KYC 真人一枚，不可转让）或 BAB 代币的地址发出的交易。因此 AGENT CHAIN 上的每一个地址都是某位已验证真人的 agent。没有机器人，没有女巫，没有三明治攻击——这反过来允许激进的性能配置：250 ms 出块、先到先服务排序、无公共内存池、关闭优先费。

第三，**创世由真人构成**。主网上线前，BSC 上所有 Agent ID 持有者被快照并写入 0 号区块，每人获得一枚编号的 Genesis Seat（创世席位）与一小笔原生 ANTB。席位是身份与优先权凭证；上线时的费用分配将 40% 的排序器费用分配给席位，这是治理可调整的协议参数（见第 8、10 节），不是收益承诺。

本文描述 AGENT CHAIN v0.1 的架构、费用模型、身份层、创世流程、账户抽象、延迟目标、代币与费用流、agent 基础设施、路线图及风险。Devnet（链 ID 11190）已上线；Testnet（Phase 1）与 Mainnet Beta（Phase 2）计划于 2026 年 12 月上线。

## 01 为什么需要一条 agent 链

### 1.1 agent 的负载特征

自主软件 agent 发交易的方式与人类不同。人类一天签几笔交易，能容忍 12 秒的确认时间。而一个调用工具、为 API 响应付费、或与另一个 agent 结算的 agent，每小时会发出数百笔小额交易，并期望得到 HTTP API 级别的响应曲线：几十到一两百毫秒、成本确定、没有意外。

由此得出三项要求。

| 要求 | agent 需要什么 | 多数链上实际得到什么 |
|---|---|---|
| 结算延迟 | 在一次 API 调用的时间预算内确认（感知 ≤ 100 ms） | 2–12 s 出块；概率性打包 |
| 账户可信度 | 每个对手方可证明地对应一个真人 | 免费、无限的匿名账户；女巫与机器人主导流量 |
| 费用可预测 | 以美元计价的算力，便于做预算 | 以波动资产计价、拥堵时竞价 |

### 1.2 现有链为何不适合 agent

**延迟。** 以太坊 L1 每 12 s 出一个块。BSC 每 0.75 s 出块，快速最终性 1.5–4 s。通用 L2 通常 250 ms–2 s 出块，但交易会进入公共内存池并参与优先费拍卖，因此从提交到拿到可用回执的时间没有上界。

**女巫与 MEV。** 无许可开户对人类是优点，对 agent 是负担。一个正在议价、出价或为结果付费的 agent 无法区分一个真实对手方和同一操作者的一千个傀儡。公共内存池里的搜索者会抢跑和夹击 agent 的订单，把 agent 自身行为的可预测性变成一种税。

**费用波动。** gas 以链的原生代币计价，意味着 agent 的算力预算随该代币的行情起伏。一个每天要执行 10,000 次调用的 agent，若单次成本一周内翻倍或减半，就无法做预算，也无法用用户认得的货币向用户转嫁成本。

### 1.3 AGENT CHAIN 的回答

AGENT CHAIN 用结构而非政策解决这三项要求：

- **延迟：** 位于新加坡（Fly.io 区域 `sin`）的单一排序器以 250 ms 出块，先到先服务排序，不设公共内存池，收到交易即签发预确认回执。区域内客户端的感知延迟为 50–100 ms。
- **账户可信度：** 排序器对照链上 `AgentRegistry`（从 BSC 上的 Binance Agent ID 合约镜像而来）检查 `isAgent(tx.origin)`。一位 KYC 真人、一枚 Agent ID、一个 agent 账户。
- **费用可预测：** 算力按每 1,000,000 gas $0.045（示意值）定价，以 ANTB 结算。守护进程每 5 分钟重新定价，使美元成本恒定。

## 02 设计原则

1. **用人类和 agent 已在使用的计价单位为算力定价。** 费用以美元报价。ANTB 是结算资产，不是记账单位。
2. **每个账户都是真人的 agent。** 打包交易须持有 Binance Agent ID 或 BAB 代币。身份在排序器层强制执行，而非依赖社区约定。
3. **继承安全性，不自造安全性。** AGENT CHAIN 是结算到 BSC 的 Nitro rollup，使用 BoLD 欺诈证明。没有新共识、没有新虚拟机、没有新的桥设计。
4. **通过移除对手而非增加信任来提速。** 因为女巫和三明治在结构上被排除，链可以运行 FCFS、无内存池、无优先费，而不会打开 MEV 攻击面。
5. **带着公民启动，而不是带着金库启动。** 创世把席位和少量 ANTB 分配给每位 Agent ID 持有者。0 号区块里没有写给内部人的预挖。
6. **写明每一个数字和每一项风险。** 参数集中在一张表里（第 14 节）。对第三方（ANTB 发行方、BSC、Arbitrum 技术栈、预言机）的依赖逐项列出并附应对（第 13 节）。

## 03 架构

### 3.1 分层

```
BSC（L1，链 ID 56）
  ├── ANTB BEP-20（0x38Dd...Fc53）        ← 原生桥接的托管合约
  ├── Binance Agent ID ERC-721（0x60B9...022F）
  ├── Nitro rollup 合约（inbox、outbox、bridge、SequencerInbox、RollupCore、BoLD challenge manager）
  └── 由 AGENT CHAIN batch poster 发布的 calldata 批次
        ▲
        │ 1:1 ANTB 桥接、Agent ID 状态消息、批次数据、状态断言
        ▼
AGENT CHAIN（L2，主网链 ID 1119）
  ├── 排序器（新加坡），250 ms 出块，FCFS，无公共内存池，关闭优先费
  ├── Nitro 执行层（EVM + Stylus Rust/WASM）
  ├── 预部署合约：AgentRegistry、GenesisSeat、FeeKeeper、ArbSys、EntryPoint v0.8
  └── 验证者（上线时为许可制），提交断言并执行 BoLD 挑战
```

### 3.2 结算：BSC 上的 Nitro rollup 模式

AGENT CHAIN 以 **rollup 模式**运行 Arbitrum Nitro：每一批 L2 交易都作为 **calldata 发布到 BSC**，完整历史可仅凭父链重建。不采用依赖链下数据可用性委员会的 AnyTrust 模式。

状态断言由 **BoLD**（Bounded Liquidity Delay）欺诈证明保护。只要有一个诚实验证者，就足以在有界的挑战窗口内否决无效断言。上线时验证者集合为**许可制**；对外部验证者开放是 Phase 4 的交付项。

主网父链为 BSC（链 ID 56），Phase 1 测试网父链为 BSC Testnet（链 ID 97）。Devnet 以单节点运行，无父链。在非 Arbitrum、非以太坊的父链上运行 Nitro 是一条走得较少的路径，见风险 R06。

### 3.3 排序器

单一排序器位于新加坡，接收交易、按先到先服务排序、在 250 ms 区块内执行，并把结果 feed 推送给 RPC 节点。**没有公共内存池**：交易在被打包前只对排序器可见。**优先费已关闭**：设置了优先费的交易会被接受，但小费不影响排序。

排序之前，排序器执行一项预检查：`AgentRegistry.isAgent(tx.origin)` 必须返回 `true`（第 06 节）。未通过检查的交易在 RPC 边界被拒绝，不会进入任何区块。

### 3.4 强制打包（Force inclusion）

单一排序器是活性假设，不是安全性假设。若排序器审查或停机，任何用户都可以直接向 BSC 上的 delayed inbox 提交交易。经过强制打包延迟（Nitro 默认 24 小时，上线时作为参数公布）后，该交易可以在排序器不配合的情况下被强制纳入 L2 排序。通过 ArbSys 的提款同样不依赖排序器。

### 3.5 执行层与 Stylus

执行层是标准 Nitro：EVM 等价，与 Arbitrum One 拥有相同的操作码、预编译和 gas 计量，并加上 **Stylus**——允许用 Rust（或任何可编译到 WASM 的语言）编写的合约与 Solidity 并行运行，重计算负载的算力成本可低 10–100 倍。Stylus 自 Devnet 起即已启用。Solidity 工具链（Hardhat、Foundry、viem、ethers）无需改动。

### 3.6 网络参数

| | Devnet（已上线） | Testnet（Phase 1） | Mainnet（Phase 2） |
|---|---|---|---|
| 名称 | AGENT CHAIN Devnet | AGENT CHAIN Testnet | AGENT CHAIN |
| 链 ID | `11190`（0x2BB6） | `111900` | `1119`（已预留） |
| RPC | `https://rpc.agent-chain.agency` | 待公布 | 待公布 |
| 浏览器 | `https://explorer.agent-chain.agency` | 待公布 | 待公布 |
| Gas 代币 | tANTB（测试用，无价值） | tANTB | ANTB |
| 父链 | —（单节点） | BSC Testnet（97） | BSC（56） |
| 出块时间 | 250 ms | 250 ms | 250 ms |

官网：`https://agent-chain.agency`。Devnet 代币没有价值。

## 04 Gas 资产：ANTB

### 4.1 代币事实

| 属性 | 值 |
|---|---|
| 代币 | ANTB——bStocks 代币化 Anthropic 股票 |
| 发行方 | BTech Holdings Ltd（bStocks），受 ADGM 规则监管 |
| 标准 | BSC 上的 BEP-20 |
| 合约 | `0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53` |
| 精度 | 18 位小数 |
| 可升级性 | Beacon-proxy，发行方可升级 |
| 发行方控制 | 存在发行方自主决定的暂停（pause）与黑名单（blocklist）功能 |
| 资格限制 | 不向美国人士提供；在其他司法辖区受限 |
| 在 AGENT CHAIN 上的角色 | 原生 gas 代币，1:1 桥接 |

AGENT CHAIN 不发行 ANTB，与其发行方无任何关系，也不改变其条款。AGENT CHAIN 只是把 ANTB 作为 Nitro 的**自定义 gas 代币**使用。

### 4.2 原生桥接

ANTB 通过 Nitro 自定义 gas 代币桥以 1:1 桥接。向 BSC 上的桥托管合约存入 ANTB，会在 AGENT CHAIN 上铸造等量的原生 ANTB。原生 ANTB 的用法与 Arbitrum 上的 ETH 完全一致：支付 gas、通过 `msg.value` 转账、18 位小数。

提款在 L2 通过 **ArbSys** 预编译（`0x0000000000000000000000000000000000000064`）发起。包含该提款的断言在 BSC 上确认（即经过 BoLD 挑战窗口）后，用户在 BSC 上执行 outbox 交易，从托管合约取回 BEP-20 ANTB。

### 4.3 供应量不变式

桥维护如下不变式：

```
L2 上的原生 ANTB 供应量  +  进行中的提款 ANTB  ≤  BSC 托管合约中的 ANTB
```

创世分配（第 07 节）是唯一不由存款铸造的原生 ANTB；运营方会在开放桥之前把对应数量的 ANTB 存入托管合约，因此不变式自 0 号区块起即成立。

### 4.4 Mainnet Beta 期间的上限

Phase 2（Mainnet Beta）期间，存款上限为**每地址 1 ANTB**、**总量 500 ANTB**。上限在 Phase 4 取消。

### 4.5 发行方风险

由于 ANTB 是可升级、可暂停、带黑名单功能的证券型代币，发行方原则上可以冻结托管合约的余额或在 BSC 上暂停转账。这会使存款与提款停止，但不影响 L2 执行。应对见风险 R01。

## 05 费用模型

### 5.1 记账单位

1 个算力单位（CU）等于 1 gas。协议的目标**基准费率为每 1,000,000 gas $0.045**（示意值）。用户看到的每一笔费用，都是这个费率按守护进程当前价格换算成的 ANTB。

### 5.2 公式

```
minBaseFee（wei/gas） = baseRate（USD/gas） / P（USD/ANTB） × 1e18
```

其中 `baseRate = 0.045 / 1e6 = 4.5e-8 USD/gas`，`P` 是守护进程写入的 ANTB/USD 价格。Nitro 的 L2 base fee 下限被设为 `minBaseFee`；标准 Nitro gas-target 控制器在持续高负载下可能把 base fee 抬到下限之上，但由于 Agent ID 门控消除了垃圾交易，gas target 被设置得很宽松，正常运行时 base fee 停留在下限。

### 5.3 P = $97.17 时的计算示例

ANT 于 IPO 当日（2026-11-19）收于 $97.17。

```
minBaseFee = 4.5e-8 / 97.17 × 1e18 ≈ 463,105,000 wei/gas
```

| 操作 | Gas（示意值） | ANTB | USD |
|---|---|---|---|
| 简单转账 | 21,000 | ≈ 0.0000097 | ≈ $0.001 |
| Agent 调用 | ≈ 45,000 | ≈ 0.0000208 | ≈ $0.002 |
| 合约部署 | ≈ 180,000 | ≈ 0.0000834 | ≈ $0.008 |

### 5.4 美元成本与 ANT 价格无关

同一笔 21,000 gas 的转账在四种 ANTB 价格下的成本：

| P（USD/ANTB） | minBaseFee（wei/gas） | 每笔转账 ANTB | 每笔转账 USD |
|---|---|---|---|
| $60.00 | 750,000,000 | 0.00001575 | ≈ $0.000945 |
| $97.17 | 463,105,000 | 0.0000097 | ≈ $0.000945 |
| $150.00 | 300,000,000 | 0.0000063 | ≈ $0.000945 |
| $300.00 | 150,000,000 | 0.00000315 | ≈ $0.000945 |

ANTB 一列与价格反向变动；USD 一列不变。

### 5.5 费用守护进程（Fee keeper）

`FeeKeeper` 合约存储 `usdPerGas` 与 `antbUsdPrice`，每次写入触发 `BaseFeeUpdated` 事件。守护进程规则：

| 参数 | 值 |
|---|---|
| 评估周期 | 每 5 分钟 |
| 写入阈值 | 仅当价格相对上次写入变动 ≥ 0.5% 时写入 |
| 单次最大变动 | ≤ 5% |
| 频率限制 | 每 60 s 最多 1 次写入 |
| 偏离带 | 相对上一官方收盘价 ±5%；超出的读数被拒绝 |
| 回退 | 上一有效价格 |

上线时写入权限仅限 owner；owner 密钥由运营方持有，后续迁移到治理。

### 5.6 价格来源

| 时段 | 来源 |
|---|---|
| 美股交易时段 | Binance Oracle / Chainlink ANTB-USD 喂价 |
| 非交易时段、周末、假日 | PancakeSwap ANTB/USDT 30 分钟 TWAP |

对每个读数施加的守卫：

- **偏离：** 超出上一官方收盘价 ±5% 则拒绝。
- **过期：** 预言机轮次或 TWAP 窗口早于守护进程的过期阈值（上线时公布的参数）则拒绝。
- **流动性：** 池子深度低于守护进程的最低要求（上线时公布的参数）则拒绝 TWAP 来源。

若所有来源都被拒绝，守护进程不写入，上一有效价格继续生效。

### 5.7 用户实际支付

gas × base fee，以原生 ANTB 支付。无优先费。没有 ANTB 的用户可以通过 paymaster 用 BNB 或 USDT 支付（第 08 节）。排序器收取 base fee 作为收入，再按第 10 节的方式分配。

## 06 身份层：Binance Agent ID

### 6.1 凭证

| 属性 | 值 |
|---|---|
| 名称 | Binance Agent ID |
| 标准 | BSC 上的 ERC-721 |
| 合约 | `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` |
| 发放 | 每个 KYC 账户一枚 |
| 可转让性 | 不可转让 |
| 同样接受 | BAB（Binance Account Bound）代币 |

### 6.2 L2 上的 AgentRegistry

`AgentRegistry` 是 L2 预部署合约，映射 `address → (bytes32 handleHash, bool active)`，是 BSC 上 Agent ID 状态的镜像。Devnet 上由 owner 直接设置；Testnet 与 Mainnet 上通过可重试的桥消息同步：BSC 上的铸造、吊销或地址重绑定都会产生一条消息更新 L2 注册表。公开接口：

```
function isAgent(address account) external view returns (bool);
```

### 6.3 排序器门控

对每笔到达的交易，排序器计算 `isAgent(tx.origin)`。对 ERC-4337 用户操作，检查施加于账户登记的所有者。未通过检查的交易以特定 RPC 错误被拒绝，不消耗 gas 也不消耗 nonce。

### 6.4 后果

- **没有机器人。** 地址必须绑定到一位 KYC 真人。
- **没有女巫。** 一位真人、一枚 Agent ID、一个 agent 账户。空投、治理与 Genesis Seat 可以按人而非按密钥分配。
- **没有三明治。** 没有可观察的公共内存池，也没有可加价的小费；唯一可能抢跑的是受 Binance 条款约束的实名人类。
- **宽松的 gas target。** 因为垃圾交易被已验证人数所限制，Nitro gas 控制器可以设置宽松的目标，base fee 停留在美元下限。

### 6.5 隐私

Agent ID 的 handle 是**公开别名**。注册表存储 handle 的哈希，而 handle 本身在 BSC 上是公开的。AGENT CHAIN 不接收、不存储、不处理 KYC 材料，只读取代币持有情况。用户应当假设自己在 L2 上的活动可以与其公开的 Agent ID handle 关联。

## 07 创世

### 7.1 快照

主网上线前，会提前公布 BSC 上的一个**快照区块**。在该区块，所有持有 Binance Agent ID 的地址及其首次注册顺序被记录下来。

### 7.2 创世分配

AGENT CHAIN（链 ID 1119）的创世状态为每个快照地址包含：

| 项目 | 说明 |
|---|---|
| Genesis Seat | 一枚不可转让的 `GenesisSeat` 代币，`seatId` 顺序编号 |
| 席位编号 | 按 Agent ID 在 BSC 上的首次注册顺序 |
| 原生 ANTB | 一小笔原生 ANTB，足够完成初始交易；具体数量随快照区块一同公布 |

每次分配触发 `SeatMinted(address, uint256)` 事件。Devnet 上 `mint()` 对任何地址开放一次；Mainnet 上铸造仅限创世分配与 Agent ID 持有者。

### 7.3 席位经济

Genesis Seat 持有者合计获得**排序器收入的 40%**，按比例分配：**一席一份**。席位不可转让；份额跟随 Agent ID 持有者。分配方式是协议参数，可由治理修改（见《法律声明与免责》）。

## 08 账户与 Paymaster

### 8.1 账户抽象

AGENT CHAIN 预部署 **ERC-4337 EntryPoint v0.8**，并支持 **EIP-7702**（允许外部账户将执行委托给智能账户代码）。因此 agent 可以用同一套工具，从智能账户或升级后的 EOA 运行。

### 8.2 Paymaster

验证型 paymaster 允许用户在 BSC 上用 **BNB 或 USDT** 支付 gas，而由 paymaster 在 L2 支付原生 ANTB。流程：

1. 客户端向 paymaster 服务请求报价。报价有效期 **60 秒**，注明 ANTB/BNB 或 ANTB/USDT 汇率与最大 gas。
2. 用户操作包含 paymaster 对该报价的签名。
3. paymaster 在 L2 赞助该操作，并以 BNB/USDT 与用户结算。

Agent ID 门控仍然适用：paymaster 不放松对账户所有者的 `isAgent` 要求。

### 8.3 会话密钥（Session keys）

智能账户支持具备以下属性的会话密钥：

- **范围受限**——仅限一组目标合约与函数选择器；
- **频率受限**——每个时间窗内的最大操作数与最大支出；
- **自动过期**——硬性的 `validUntil` 时间戳。

会话密钥是 agent 运行时在不持有所有者根密钥的情况下获得签名权限的方式。

## 09 速度

### 9.1 三种"快"

| 维度 | 定义 | AGENT CHAIN 目标 |
|---|---|---|
| 确认延迟 | 从提交到客户端可据以行动的回执 | 感知 50–100 ms（预确认）；250 ms 区块 |
| 吞吐量 | 排序器可持续处理的每秒交易数 | Nitro 级别；Phase 4 按需升级执行引擎 |
| 最终性 | 交易不可回滚所需的时间 | 数据发布依托 BSC 快速最终性 1.5–4 s；断言确认依托 BoLD 挑战窗口 |

### 9.2 物理限制

对排序器所在区域内的客户端，往返时延（RTT）决定一切。一笔简单转账的执行只需微秒级；250 ms 的区块间隔是打包时间的上界，而新加坡 ↔ 新加坡的 RTT 只有个位数毫秒。东京、法兰克福或弗吉尼亚的客户端 RTT 为 70–250 ms，这正是 Phase 3 在 SIN/TYO/FRA/IAD 增设边缘 RPC 的原因。

### 9.3 预确认回执

收到有效交易后，排序器返回一份签名回执：

```
preconf = (txHash, seq, timestamp, sig)
```

- `txHash`——交易哈希；
- `seq`——排序器为该交易分配的单调递增序号；
- `timestamp`——排序器的毫秒级时钟时间；
- `sig`——排序器对上述三个字段的签名。

该回执是在 `seq` 位置打包该交易的承诺。客户端可以把它视为低价值操作的确认；违背回执的排序器可以通过比对 `seq` 与已发布批次被发现。

### 9.4 Phase 3：流式子块

Phase 3 在排序器 feed 上引入 **50 ms 流式子块**。结算意义上的区块仍为 250 ms；feed 每 50 ms 暴露一次部分状态，使区域边缘节点能提供接近实时的读取。

### 9.5 最终性支撑

批次发布到 BSC，BSC 的**快速最终性（1.5–4 s）**意味着已发布的数据在几秒后不可被重组。因此预确认背后是一条以秒而非分钟计最终性的父链。

## 10 代币与费用流

### 10.1 $AGENT

`$AGENT` 在 **Flap**（flap.sh）上以如下配置发射：

| 参数 | 值 |
|---|---|
| 池子资产 | ANTB |
| 发射门控 | 无——开放发射。任何钱包都可以在 BSC 上买入、持有、交易 $AGENT |
| 单钱包上限 | 无 |
| Agent ID | 在 AGENT CHAIN 上发交易需要，持有 $AGENT 不需要。把 $AGENT 桥到链上需使用 Agent ID 账户 |
| 团队交易费 | 无 |

#### 为什么 ANTB 是 gas 而 $AGENT 不是

gas 资产和价值捕获资产想要的东西是相反的。gas 应该便宜、购买力稳定、用户钱包里本来就有；网络代币则应随着网络被使用而变得更稀缺。让一个代币同时承担两个角色，是大多数新链的失败模式：上线时没有 gas 需求，代币没有底，用户还得先买一个陌生资产才能发出第一笔交易。

AGENT CHAIN 把两个角色拆开：

- **ANTB 是燃料。** 它在 BSC 上流动性充足（Flap、PancakeSwap、币安钱包），我们的目标用户本来就持有，且由费用守护进程按美元定价，手续费不随 ANT 股价波动。没有人需要为了用链而先买一个新资产。
- **$AGENT 是使用量流向的地方。** 排序器收入（以 ANTB 收取）的 40% 用于在公开市场回购 $AGENT 并销毁。链越忙，销毁越多。$AGENT 不需要被花掉才有用；它是链手续费收入的指数。

这与 Arbitrum、Base 以 ETH 结算而网络代币不在费用路径上的做法一致。这一拆分同时也是一个披露点：40/40/20 的收入分配是治理可调整的协议参数，不是收益承诺（见第 14 节）。

### 10.2 排序器收入分配

排序器收入（以 ANTB 收取的 base fee）分配如下：

| 接收方 | 比例 |
|---|---|
| Genesis Seat 持有者（按比例，一席一份） | 40% |
| 回购并销毁 $AGENT | 40% |
| 运营（基础设施、审计、守护进程、BSC 发布费用） | 20% |

### 10.3 Arbitrum Expansion Program

作为结算在以太坊之外的 Nitro 链，AGENT CHAIN 向 Arbitrum Expansion Program（AEP）贡献**协议净收入的 10%**。净收入 = 收取的费用 − BSC 数据发布成本。

### 10.4 1.000 ANTB 的分配示例

假设某周期内净排序器收入为 1.000 ANTB。先扣除 AEP 贡献，余额再按 40/40/20 分配：

```
1.000 ANTB 净收入
  − 0.100 ANTB  → Arbitrum Expansion Program（10%）
  = 0.900 ANTB 可分配
      0.360 ANTB → Genesis Seat 持有者（40%）
      0.360 ANTB → 回购销毁 $AGENT（40%）
      0.180 ANTB → 运营（20%）
```

所有数字均为示意值。$AGENT 不赋予任何收入、股权或回报权利。

## 11 Agent 基础设施

Phase 3 预部署一组标准端点。对 agent 开发者而言，每一项都对应一项具体能力：

| 组件 | 标准 | 为你做什么 |
|---|---|---|
| Agent 身份注册表 | ERC-8004 | 在经 Agent ID 门控的地址下登记 agent 的元数据、能力与声誉指针，让其他 agent 能在链上发现并验证它 |
| Agent 商务 | ERC-8183 | agent 之间的标准托管与任务结算接口：发布任务、以 ANTB 锁定付款、交付后释放或进入争议 |
| 支付协调器 | x402 | HTTP 402 协调器，让任何 web 端点按请求收费并在 AGENT CHAIN 上结算；你的 agent 在发起 API 调用的同一个往返里完成付费 |
| MCP 端点 | Model Context Protocol | 托管的 MCP 服务器，把链上读写与费用报价暴露为工具，任何支持 MCP 的模型无需定制集成即可使用 AGENT CHAIN |
| Skills Hub 技能 | Binance Skills Hub | 已发布的技能，教 Binance 生态内的 agent 如何持有 ANTB、检查自己的 Agent ID 并在 AGENT CHAIN 上交易 |
| Stylus agent SDK | Rust/WASM | 用 Rust 编写 agent 侧的链上逻辑，享受 Stylus 的算力定价 |

## 12 路线图

| 阶段 | 名称 | 目标时间 | 交付内容 |
|---|---|---|---|
| 0 | Devnet | 已上线，2026 年 11 月 | 单节点 devnet、250 ms 出块、公开 RPC + 浏览器、AgentRegistry + GenesisSeat 合约、官网、白皮书 v0.1 |
| 1 | BSC Testnet 上的 Testnet | 2026 年 12 月 | 结算到 BSC Testnet 的 Nitro rollup、tANTB 作为自定义 gas 代币、桥 + 水龙头、Agent ID 门控排序、paymaster（用 BNB/USDT 支付）、费用守护进程上线、技能发布到 Binance Skills Hub |
| 2 | Mainnet Beta | 2026 年 12 月 | Agent ID 快照 → 创世 → 在 BSC 上发射。ANTB 原生 gas。Beta 期间桥上限（每地址 1 ANTB，总量 500 ANTB）。$AGENT 在 Flap 发射（ANTB 池，Agent ID 门控）。提交 Binance Agent ID Hackathon（截止 2026 年 12 月 9 日） |
| 3 | 流式预确认 | 2027 Q1 | 通过排序器 feed 的 50 ms 流式子块、多区域边缘 RPC（SIN/TYO/FRA/IAD）、ERC-8004 agent 注册表 + x402 协调器 + MCP 端点预部署、Stylus agent SDK |
| 4 | 扩展与结算 | 2027 年 | 吞吐量需要时升级执行引擎；Arbitrum 技术栈交付后切换 ZK 有效性结算；外部验证者；取消桥上限 |

清单与退出标准见 `docs/roadmap.zh.md`。

## 13 风险与依赖

### R01 —— 发行方对 ANTB 的控制

ANTB 是带有发行方暂停与黑名单功能的 beacon-proxy 可升级代币。发行方可以暂停转账、把桥托管合约列入黑名单，或升级代币逻辑。

**应对。** L2 执行不依赖 BSC 上的代币合约；暂停会停止存取款，但不会停止出块。Mainnet Beta 上限（每地址 1 ANTB，总量 500 ANTB）限定了总敞口。托管地址公开，用户可自行监控其状态。AGENT CHAIN 独立于发行方，不对 ANTB 的条款作任何陈述；用户应参考发行方的文档与资格规则。

### R02 —— 预言机与流动性

费用守护进程在交易时段依赖预言机，非交易时段依赖 PancakeSwap TWAP。池子过浅或喂价过期可能产生错误价格。

**应对。** 每个读数都经过 ±5% 偏离带、过期检查与流动性检查。单次写入变动上限 5%，写入频率每 60 s 一次。若所有来源失效，上一有效价格继续生效。最坏情况是故障期间费用定价偏差，而不是停机。

### R03 —— 单一排序器

新加坡的单一排序器是活性的单点故障，也是排序信任的单点。

**应对。** 通过 BSC delayed inbox 的强制打包保证延迟窗口之后的抗审查性。通过 ArbSys 的提款不需要排序器。预确认回执带签名，可对照已发布批次审计。多区域边缘 RPC（Phase 3）与外部验证者（Phase 4）将逐步降低这一依赖。

### R04 —— 对父链 BSC 的依赖

AGENT CHAIN 的数据可用性与结算强度等同于 BSC。BSC 的停机、超出快速最终性的重组或治理变更都会影响 AGENT CHAIN。

**应对。** BSC 快速最终性（1.5–4 s）是 AGENT CHAIN 的构建假设；batch poster 等待最终性后才视数据为已发布。rollup 合约是标准 Nitro，如有必要可以迁移到替代父链重新部署，代价是一次迁移。

### R05 —— Gas 余额对 ANT 价格的敞口

持有 ANTB 支付 gas 使用户暴露于 ANT 股价波动。今天够付 10,000 笔交易的余额，下个月可能只够 5,000 笔，也可能够 20,000 笔。

**应对。** 每笔交易的美元成本按设计恒定，变化的只是所需的 ANTB 库存。paymaster 允许用户用 BNB 或 USDT 支付而无需持有 ANTB。agent 应持有少量 ANTB 浮动余额并按需补充，而非预先存入大额余额。

### R06 —— 在非 Arbitrum 父链上运行 Nitro 缺乏文档

Nitro 的文档面向以太坊与 Arbitrum 父链。在 BSC（不同客户端、不同最终性语义）上运行它经受的测试较少。

**应对。** Phase 1 在任何真实价值暴露之前，先在 BSC Testnet 上运行完整技术栈。主网以带桥上限的 Beta 形式上线。与 Nitro 默认值的偏差被记录并公布。Arbitrum 技术栈的上游变更被跟踪并保守采纳。

### R07 —— 新合约上线时未经审计

`AgentRegistry`、`GenesisSeat`、`FeeKeeper`、paymaster 与桥消息处理器均为新代码。Devnet 阶段未经审计，Mainnet Beta 阶段也可能未完全审计。

**应对。** 合约体量小、开源，并随部署地址一同公布。Mainnet Beta 上限限制了风险价值。审计由 20% 运营份额出资，并作为 Phase 4 取消上限前的退出条件。

### R08 —— 监管

ANTB 是受 ADGM 规则监管的代币化证券，不向美国人士提供。$AGENT 是新代币。两者适用的规则都可能变化。

**应对。** AGENT CHAIN 不销售 ANTB，并引导用户查看发行方的资格要求。$AGENT 不赋予任何收入、股权或回报权利。费用分配是可由治理修改的协议参数。项目在所有界面（页脚、白皮书、桥）发布免责声明。

## 14 参数规格表

| 参数 | 值 |
|---|---|
| 技术栈 | Arbitrum Nitro，rollup 模式 |
| 父链（主网） | BSC，链 ID 56 |
| 父链（测试网） | BSC Testnet，链 ID 97 |
| 数据可用性 | calldata 发布到 BSC |
| 欺诈证明 | BoLD |
| 上线时验证者 | 许可制 |
| Devnet 链 ID | 11190（0x2BB6） |
| Testnet 链 ID | 111900 |
| Mainnet 链 ID | 1119（已预留） |
| 出块时间 | 250 ms |
| 排序 | 先到先服务 |
| 公共内存池 | 无 |
| 优先费 | 关闭 |
| 排序器位置 | 新加坡（Fly.io `sin`） |
| 预确认回执 | `(txHash, seq, timestamp, sig)` |
| 感知延迟 | 50–100 ms |
| Phase 3 子块 | 50 ms 流式 |
| 边缘 RPC 区域（Phase 3） | SIN / TYO / FRA / IAD |
| 执行层 | EVM + Stylus（Rust/WASM） |
| Gas 代币 | ANTB（BEP-20，`0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53`，18 位小数） |
| ANTB 发行方 | BTech Holdings Ltd（bStocks），ADGM |
| 桥接 | 1:1 原生；通过 ArbSys 提款 |
| 桥不变式 | L2 原生 ANTB + 进行中提款 ≤ 托管量 |
| Mainnet Beta 桥上限 | 每地址 1 ANTB；总量 500 ANTB |
| 算力单位 | 1 CU = 1 gas |
| 基准费率（示意值） | 每 1,000,000 gas $0.045 |
| Base fee 公式 | `minBaseFee = baseRate / P × 1e18` |
| 参考价格 | ANT = $97.17（IPO 当日收盘，2026-11-19） |
| $97.17 时的 minBaseFee | ≈ 463,105,000 wei/gas |
| 转账（21,000 gas） | ≈ 0.0000097 ANTB ≈ $0.001 |
| Agent 调用 | ≈ $0.002 |
| 合约部署 | ≈ $0.008 |
| 守护进程周期 | 每 5 分钟 |
| 守护进程写入阈值 | 变动 ≥ 0.5% |
| 守护进程单次最大变动 | ≤ 5% |
| 守护进程频率限制 | 每 60 s 1 次写入 |
| 价格来源（交易时段） | Binance Oracle / Chainlink ANTB-USD |
| 价格来源（非交易时段） | PancakeSwap ANTB/USDT 30 分钟 TWAP |
| 偏离带 | 相对上一收盘价 ±5% |
| 回退 | 上一有效价格 |
| 身份凭证 | Binance Agent ID，ERC-721，`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`，每 KYC 账户一枚，不可转让 |
| 同样接受 | BAB 代币 |
| 门控检查 | 排序器处的 `isAgent(tx.origin)` |
| L2 注册表 | `AgentRegistry`，通过桥消息同步 |
| 创世 | 在公布的区块对 BSC 上 Agent ID 持有者快照 |
| 创世分配 | 编号 Genesis Seat + 少量原生 ANTB |
| 席位编号 | 首次注册顺序 |
| 席位收入份额 | 排序器收入的 40%，按比例，一席一份 |
| 账户抽象 | ERC-4337 EntryPoint v0.8；EIP-7702 |
| Paymaster | 代付 ANTB；用户付 BNB/USDT；报价有效 60 s |
| 会话密钥 | 范围受限、频率受限、自动过期 |
| $AGENT 发射 | Flap（flap.sh），ANTB 池，开放发射——无 Agent ID 门槛，无单钱包上限 |
| 团队交易费 | 无 |
| 收入分配 | 40% Genesis Seats / 40% 回购销毁 $AGENT / 20% 运营 |
| Arbitrum Expansion Program | 协议净收入的 10% |
| Agent 基础设施（Phase 3） | ERC-8004、ERC-8183、x402、MCP 端点、Skills Hub 技能、Stylus SDK |
| Hackathon | Binance Agent ID Hackathon，截止 2026 年 12 月 9 日 |
| 官网 | `https://agent-chain.agency` |

## 法律声明与免责

AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules; bStocks are not available to US persons and are restricted in other jurisdictions.

Nothing here is investment advice. $AGENT confers no rights to revenue, equity, or returns; fee distributions are protocol parameters that governance can change.

Devnet tokens have no value.

（中文参考译文：AGENT CHAIN 为独立项目，与 Anthropic, PBC、Binance 或 BNB Chain 无任何关联、背书或赞助关系。ANTB 由 BTech Holdings Ltd（bStocks）依据 ADGM 规则发行；bStocks 不向美国人士提供，并在其他司法辖区受限。本文内容不构成投资建议。$AGENT 不赋予任何收入、股权或回报权利；费用分配是可由治理修改的协议参数。Devnet 代币没有价值。以英文原文为准。）
