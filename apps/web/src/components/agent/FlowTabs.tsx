"use client";

import type { ReactNode } from "react";
import { Bot, Wallet } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { useL } from "@/components/LangProvider";
import { BridgeAgentPanel, GenesisAgentPanel } from "./AgentPanel";

/**
 * Agent-first tab layout for /genesis and /bridge.
 * Default tab: "Use with your agent" (the Agent ID lives in the CLI-only Agentic Wallet).
 * Secondary: the browser-wallet dApp flow for BAB holders / regular wallets.
 * Deep links: #agent, #wallet.
 */
export function FlowTabs({ mode, walletContent }: { mode: "genesis" | "bridge"; walletContent: ReactNode }) {
  const L = useL();
  return (
    <Tabs
      tabs={[
        {
          id: "agent",
          label: (
            <span className="inline-flex items-center gap-2">
              <Bot size={14} className="text-amber" /> {L("Use with your agent", "用你的 agent 操作")}
            </span>
          ),
          hint: L("Agentic Wallet · baw CLI · recommended", "Agentic Wallet · baw CLI · 推荐"),
          content: mode === "genesis" ? <GenesisAgentPanel /> : <BridgeAgentPanel />,
        },
        {
          id: "wallet",
          label: (
            <span className="inline-flex items-center gap-2">
              <Wallet size={14} className="text-muted" /> {L("Browser wallet", "浏览器钱包")}
            </span>
          ),
          hint: L("BAB holders / regular wallets", "BAB 持有者 / 普通钱包"),
          content: (
            <div className="min-w-0 space-y-5">
              <div className="rounded-lg border border-line bg-surface-2 p-4 text-[13px] leading-relaxed text-muted">
                {L(
                  "For BAB token holders and regular EIP-1193 wallets (MetaMask, Binance Wallet extension, OKX, Trust). The Agentic Wallet that holds your Binance Agent ID cannot connect here — it is CLI-only; use the “Use with your agent” tab instead. We never offer QR or pairing-code login.",
                  "适用于 BAB 代币持有者和普通 EIP-1193 钱包（MetaMask、Binance Wallet 扩展、OKX、Trust）。持有你 Binance Agent ID 的 Agentic Wallet 无法在此连接——它仅支持 CLI；请使用“用你的 agent 操作”标签页。我们从不提供二维码或配对码登录。",
                )}
              </div>
              {walletContent}
            </div>
          ),
        },
      ]}
    />
  );
}
