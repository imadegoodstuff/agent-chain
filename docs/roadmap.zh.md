---
title: "AGENT CHAIN 路线图"
version: 0.1
date: 2026-11-20
lang: zh
---

# AGENT CHAIN 路线图

五个阶段。日期为目标，不是承诺。状态标注：**已上线（Live）** / **进行中（In progress）** / **计划中（Planned）**。

| 阶段 | 名称 | 状态 | 目标时间 |
|---|---|---|---|
| 0 | Devnet | 已上线 | 2026 年 11 月 |
| 1 | BSC Testnet 上的 Testnet | 进行中 | 2026 年 12 月 |
| 2 | Mainnet Beta | 计划中 | 2026 年 12 月 |
| 3 | 流式预确认 | 计划中 | 2027 Q1 |
| 4 | 扩展与结算 | 计划中 | 2027 年 |

## Phase 0 —— Devnet

**状态：** 已上线
**目标时间：** 2026 年 11 月
**网络：** AGENT CHAIN Devnet，链 ID `11190`（0x2BB6），250 ms 出块，单节点，gas 代币 tANTB（无价值）

### 交付内容

- [x] 250 ms 出块间隔的单节点 devnet
- [x] 公开 RPC：`https://rpc.agent-chain.agency`
- [x] 公开浏览器：`https://explorer.agent-chain.agency`
- [x] `AgentRegistry` 合约（`isAgent(address)`，owner 设置的镜像）
- [x] `GenesisSeat` 合约（顺序 `seatId`，每地址一次 `mint()`，`SeatMinted` 事件）
- [x] `FeeKeeper` 桩合约（`usdPerGas`、`antbUsdPrice`、`BaseFeeUpdated`）
- [x] 官网：`https://agent-chain.agency`
- [x] 白皮书 v0.1（英文 / 中文）

### 退出标准

- RPC 与浏览器连续 7 天公开可达
- 合约已部署，地址发布于 `apps/devnet/deployments/devnet.json`
- 白皮书 v0.1 发布在官网

## Phase 1 —— BSC Testnet 上的 Testnet

**状态：** 进行中
**目标时间：** 2026 年 12 月
**网络：** AGENT CHAIN Testnet，链 ID `111900`，父链 BSC Testnet（97），gas 代币 tANTB

### 交付内容

- [ ] Nitro rollup（rollup 模式，calldata 发布到 BSC Testnet），BoLD 欺诈证明，许可制验证者
- [ ] tANTB 配置为 Nitro 自定义 gas 代币
- [ ] 桥（存款 / 通过 ArbSys 提款）与 tANTB 水龙头
- [ ] Agent ID 门控排序：`isAgent(tx.origin)` 预检查，`AgentRegistry` 通过桥消息同步
- [ ] Paymaster：用 BNB/USDT 支付 gas，报价有效 60 s，ERC-4337 EntryPoint v0.8
- [ ] 费用守护进程上线：5 分钟周期、≥0.5% 写入阈值、单次 ≤5%、每 60 s 1 次写入、±5% 偏离带
- [ ] 技能发布到 Binance Skills Hub
- [ ] 公开 Testnet RPC 与浏览器

### 退出标准

- 在 BSC Testnet 上完成端到端的存款 → 交易 → 提款
- 排序器拒绝非 Agent ID 交易；注册表同步已对照 BSC Testnet 事件验证
- 费用守护进程无人值守运行 14 天，无带外写入
- 至少演示一次通过 delayed inbox 的强制打包

## Phase 2 —— Mainnet Beta

**状态：** 计划中
**目标时间：** 2026 年 12 月
**网络：** AGENT CHAIN，链 ID `1119`（已预留），父链 BSC（56），gas 代币 ANTB

### 交付内容

- [ ] 在公布的区块对 BSC 上的 Agent ID 持有者快照
- [ ] 创世区块：每个快照地址获得编号 Genesis Seat + 少量原生 ANTB，席位按首次注册顺序编号
- [ ] 以 ANTB 为原生 gas 在 BSC 上发射
- [ ] Beta 期间执行桥上限：每地址 1 ANTB，总量 500 ANTB
- [ ] $AGENT 在 Flap 发射：ANTB 池，对所有钱包开放（无 Agent ID 门槛，无单钱包上限），无团队交易费
- [ ] 收入分配生效：40% Genesis Seats / 40% 回购销毁 $AGENT / 20% 运营；净收入的 10% 贡献给 Arbitrum Expansion Program
- [ ] 提交 Binance Agent ID Hackathon（截止 2026 年 12 月 9 日）

### 退出标准

- 创世状态经至少一个独立方对照公布的快照验证
- 桥不变式（L2 原生 ANTB + 进行中提款 ≤ 托管量）自 0 号区块起持续成立
- 首次向 Genesis Seat 持有者的收入分配已在链上执行
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
- [ ] 完成 `AgentRegistry`、`GenesisSeat`、`FeeKeeper`、paymaster 与桥消息处理器的审计

### 退出标准

- 验证者集合包含独立于排序器运营方的运营者
- 取消上限前发布审计报告
- 费用守护进程 owner 密钥迁移到治理

---

AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC, Binance, or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules; bStocks are not available to US persons and are restricted in other jurisdictions. Nothing here is investment advice. $AGENT confers no rights to revenue, equity, or returns; fee distributions are protocol parameters that governance can change. Devnet tokens have no value.

（中文参考译文：AGENT CHAIN 为独立项目，与 Anthropic, PBC、Binance 或 BNB Chain 无任何关联、背书或赞助关系。ANTB 由 BTech Holdings Ltd（bStocks）依据 ADGM 规则发行；bStocks 不向美国人士提供，并在其他司法辖区受限。本文内容不构成投资建议。$AGENT 不赋予任何收入、股权或回报权利；费用分配是可由治理修改的协议参数。Devnet 代币没有价值。）
