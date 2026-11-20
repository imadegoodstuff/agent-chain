---
title: "AGENT CHAIN 路线图"
version: 0.2
date: 2026-11-20
lang: zh
---

# AGENT CHAIN 路线图

五个阶段。日期为目标，不是承诺。状态标注：**已上线（Live）** / **已完成（Done）** / **进行中（In progress）** / **计划中（Planned）**。

| 阶段 | 名称 | 状态 | 目标时间 |
|---|---|---|---|
| 0 | Devnet | 已完成 | 2026 年 11 月 |
| 1 | BSC 上的主网 Beta | **已上线** | 2026-11-20 |
| 2 | Beta 加固 | 进行中 | 2026 年 12 月 |
| 3 | 流式预确认 | 计划中 | 2027 Q1 |
| 4 | 扩展与结算 | 计划中 | 2027 年 |

## Phase 0 —— Devnet

**状态：** 已完成
**目标时间：** 2026 年 11 月
**网络：** AGENT CHAIN Devnet（测试数据），链 ID `11190`（0x2BB6），250 ms 出块，单节点，gas 代币 tANTB（无价值）

### 交付内容

- [x] 250 ms 出块间隔的单节点 devnet
- [x] 公开 RPC，现为 `https://devnet-rpc.agent-chain.agency`
- [x] 公开浏览器，现为 `https://devnet-explorer.agent-chain.agency`
- [x] `AgentRegistry` 合约（`isAgent(address)`，owner 设置的镜像）
- [x] `GenesisSeat` 测试合约（顺序 `seatId`，每地址一次 `mint()`，`SeatMinted` 事件）
- [x] `FeeKeeper` 桩合约（`usdPerGas`、`antbUsdPrice`、`BaseFeeUpdated`）
- [x] 官网：`https://agent-chain.agency`
- [x] 白皮书 v0.1（英文 / 中文）

### 退出标准

- [x] 合约已部署，地址发布于 `apps/devnet/deployments/devnet.json`
- [x] 白皮书发布在官网
- Devnet 作为测试网络继续运行；其代币没有价值

## Phase 1 —— BSC 上的主网 Beta

**状态：** 2026-11-20 起已上线
**网络：** AGENT CHAIN，链 ID `1119`（0x45F），父链 BSC（56），Arbitrum Nitro v3.12.4 / ArbOS 61，gas 代币 ANTB
**RPC：** `https://rpc.agent-chain.agency`（Agent ID 网关；备用 `https://agentchain-gateway.fly.dev`）· **浏览器：** `https://explorer.agent-chain.agency`

### 上线当日交付（2026-11-20）

- [x] BSC 合约上线并验证：`AgentRegistryMirror` `0x9C5488f9Aa9468B1db3Cc6B71143A8B2Ca810CF0`、`GenesisSeatClaim` `0x3972579dd0128BF0b6778cB3B457ba1d14D1695b`、`Bridge` `0x9eF8CA94a74B7Fbc5ae0b1F7a2dCaFCa14eE2A92`
- [x] Agent ID 持有者快照：BSC 区块 134,639,601，236,355 位持有者
- [x] Nitro 核心合约由我们的 BSC 修补版 `RollupCreator` `0xdb5E51Af6d4Ff89584912818b762c6a7F3c68D70` 部署——`createRollup` 交易 `0xd99b52c896685fe301f6bac7b6b0c60ff49546c931f1177473fd152959fa115f`，区块 134,648,658（Rollup `0x0EE1Db14…`、Inbox `0x09A1f23D…`、SequencerInbox `0x165108Ec…`、Bridge `0x337B50dB…`、Outbox `0x763a4E77…`、UpgradeExecutor `0x6B338a6b…`、ChallengeManager `0x1E3256Fd…`）
- [x] ANTB 通过自定义 gas 代币路径成为原生 gas；费用代币定价器 `0x132fa6bc…`（每 BNB 的 ANTB-wei）；最低 L2 基础费用 493,366,955 wei（= ANTB $91.21 时每 1M gas $0.045）
- [x] 单排序器（sin），250 ms 出块；批次发布者 `0xC7b1…253F`；BoLD 验证者 `0xc33d…e78F` 质押 0.02 WBNB；首个断言已发布
- [x] Agent ID 网关 RPC：非 agent 发送方返回 JSON-RPC 错误码 `-32050`；支持 `eth_getLogs`；不支持 `finalized`/`safe` 标签（请用 `latest`）
- [x] 空创世区块——无预挖；公民身份从 BSC 镜像
- [ ] Beta relayer 在数分钟内按 nonce 顺序把 `Bridge` 存款 1:1 入账 L2（状态见 `https://agentchain-relayer.fly.dev/status`）
- [ ] 桥上限每地址 0.1 ANTB / 总量 100 ANTB（Beta 验证后 owner 提高到 1 / 500）
- [ ] 技能在 Binance Skills Hub 上架（PR binance/binance-skills-hub#425 审核中；今天即可从 GitHub 安装）
- [ ] 提交 Binance Agent ID Hackathon（截止 2026 年 12 月 9 日）

### 工程说明——BSC 要求我们做了什么

1. **`ArbitrumChecker` 与 BSC 地址 `0x64`。** nitro-contracts 探测 `0x64`（ArbSys）来判断父链是否为 Arbitrum；在 BSC 上它是一个已退役的预编译合约，调用失败并烧光转发的全部 gas，原版部署因 “contract creation code storage out of gas” 失败。我们给探测加了 100k gas 上限并重建了 5 个合约，其余字节完全一致。
2. **BSC 没有最终性信号。** Nitro 把 `difficulty ≠ 0` 的父链视为没有最终性；BoLD staker 在最终性检查上死循环。节点以 `check-batch-finality=false` 与 `parent-chain-block-time=450ms` 运行。详见 `apps/chain/RESEARCH.md`。

### Beta 限制（已披露）

- 链 owner `0x8D61bD807Da29C71eAbA6e85Fc42796E357fA443` 是单个 EOA，同时是 L2 基础设施手续费账户；计划迁移到 Safe
- 单排序器；仍可通过 delayed Inbox 强制打包
- 通过 Beta `Bridge` 的存款由 relayer 入账，非原子操作；Beta 托管合约上存在 owner `withdrawTo`
- 暂无自助提款 UI（L2 → BSC 需在断言确认后通过 Nitro Outbox）

## Phase 2 —— Beta 加固

**状态：** 进行中
**目标时间：** 2026 年 12 月

### 交付内容

- [ ] BSC Testnet 上的 Testnet（链 ID `111900`）作为预发布环境，含 tANTB 水龙头
- [ ] Paymaster：用 BNB/USDT 支付 gas，报价有效 60 s，ERC-4337 EntryPoint v0.8
- [ ] 费用守护进程上线：5 分钟周期、≥0.5% 写入阈值、单次 ≤5%、每 60 s 1 次写入、±5% 偏离带
- [ ] 链 owner 迁移到 Safe 多签；UpgradeExecutor 加时间锁
- [ ] Nitro 标准 Inbox 取代 Beta 托管桥；UI 提供自助提款
- [ ] $AGENT 在 Flap 发射：ANTB 池，对所有钱包开放（无 Agent ID 门槛，无单钱包上限），无团队交易费
- [ ] 收入分配生效：40% Genesis Seats / 40% 回购销毁 $AGENT / 20% 运营；净收入的 10% 贡献给 Arbitrum Expansion Program

### 退出标准

- 桥不变式（L2 原生 ANTB + 进行中提款 ≤ 托管量）由独立方持续验证
- 在主网上至少演示一次通过 delayed Inbox 的强制打包
- 费用守护进程无人值守运行 14 天，无带外写入
- 官网页脚、白皮书与桥页面均包含必要的免责声明

## Phase 3 —— 流式预确认

**状态：** 计划中
**目标时间：** 2027 Q1

### 交付内容

- [ ] 排序器 feed 上的 50 ms 流式子块
- [ ] 多区域边缘 RPC：SIN / TYO / FRA / IAD
- [ ] ERC-8004 agent 身份注册表预部署
- [ ] x402 支付协调器预部署
- [ ] MCP 端点预部署
- [ ] Stylus agent SDK（Rust/WASM）

### 退出标准

- 各边缘区域实测 p50 读取延迟低于 100 ms
- 预确认回执 `(txHash, seq, timestamp, sig)` 可由公开工具对照已发布批次验证
- 至少一个第三方 agent 通过 x402 与 MCP 完成交易

## Phase 4 —— 扩展与结算

**状态：** 计划中
**目标时间：** 2027 年

### 交付内容

- [ ] 吞吐量需要时升级执行引擎
- [ ] Arbitrum 技术栈交付后切换 ZK 有效性结算
- [ ] 外部验证者加入验证者集合
- [ ] 取消桥上限
- [ ] 完成 `AgentRegistryMirror`、`GenesisSeatClaim`、`Bridge`、relayer、`FeeKeeper`、paymaster 与 BSC 修补版 nitro-contracts 的审计

### 退出标准

- 验证者集合包含独立于排序器运营方的运营者
- 取消上限前发布审计报告
- 费用守护进程 owner 密钥迁移到治理

---

AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules; bStocks are not available to US persons and are restricted in other jurisdictions. Nothing here is investment advice. $AGENT confers no rights to revenue, equity, or returns; fee distributions are protocol parameters that governance can change. Devnet tokens have no value.

（中文参考译文：AGENT CHAIN 为独立项目，与 Anthropic, PBC、Binance 或 BNB Chain 无任何关联、背书或赞助关系。ANTB 由 BTech Holdings Ltd（bStocks）依据 ADGM 规则发行；bStocks 不向美国人士提供，并在其他司法辖区受限。本文内容不构成投资建议。$AGENT 不赋予任何收入、股权或回报权利；费用分配是可由治理修改的协议参数。Devnet 代币没有价值。）
