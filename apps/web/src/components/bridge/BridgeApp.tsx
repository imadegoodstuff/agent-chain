"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, CircleAlert, Loader2, ShieldAlert } from "lucide-react";
import { isAddress, parseEventLogs, parseUnits, type Address, type Hash } from "viem";
import { useBsc } from "@/hooks/useBsc";
import { fmtAgo, fmtInt, fmtWei, shortAddr } from "@/lib/format";
import {
  BRIDGE_DISCLOSURES,
  BSC_CHAIN_ID,
  BSC_CONTRACTS,
  BSC_DEPLOY_BLOCKS,
  BSC_OWNER,
  bridgeAbi,
  bscAddr,
  bscCode,
  bscTx,
  erc20Abi,
  erc721BalanceAbi,
  publicClient,
} from "@/lib/bsc";
import { activeAccount, ensureBsc, errMsg, getWalletClient, useWallet } from "@/lib/wallet";
import { ConnectButton, NoWalletHint } from "@/components/wallet/ConnectButton";
import { useL } from "@/components/LangProvider";

type AccountReads = {
  agentId: bigint;
  bab: bigint;
  antb: bigint;
  allowance: bigint;
  remainingFor: bigint;
  depositedBy: bigint;
};

type Flow =
  | { k: "idle" }
  | { k: "switching" }
  | { k: "approving"; tx?: Hash }
  | { k: "depositing"; approveTx?: Hash; tx?: Hash }
  | { k: "done"; approveTx?: Hash; tx: Hash; nonce: number; amount: bigint; l2Recipient: Address }
  | { k: "error"; msg: string; approveTx?: Hash; tx?: Hash };

function min(...xs: bigint[]): bigint {
  return xs.reduce((a, b) => (a < b ? a : b));
}

function useAccountReads(address: Address | null, bump: number) {
  const [r, setR] = useState<AccountReads | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!address) {
      setR(null);
      return;
    }
    let alive = true;
    async function load() {
      try {
        const res = await publicClient.multicall({
          allowFailure: false,
          contracts: [
            { address: BSC_CONTRACTS.AgentId, abi: erc721BalanceAbi, functionName: "balanceOf", args: [address!] },
            { address: BSC_CONTRACTS.BAB, abi: erc721BalanceAbi, functionName: "balanceOf", args: [address!] },
            { address: BSC_CONTRACTS.ANTB, abi: erc20Abi, functionName: "balanceOf", args: [address!] },
            { address: BSC_CONTRACTS.ANTB, abi: erc20Abi, functionName: "allowance", args: [address!, BSC_CONTRACTS.Bridge] },
            { address: BSC_CONTRACTS.Bridge, abi: bridgeAbi, functionName: "remainingFor", args: [address!] },
            { address: BSC_CONTRACTS.Bridge, abi: bridgeAbi, functionName: "depositedBy", args: [address!] },
          ],
        });
        if (!alive) return;
        setR({ agentId: res[0], bab: res[1], antb: res[2], allowance: res[3], remainingFor: res[4], depositedBy: res[5] });
        setErr(null);
      } catch (e) {
        if (alive) setErr(errMsg(e));
      }
    }
    load();
    const t = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [address, bump]);
  return { reads: r, err };
}

/** null = unknown / checking, true = has bytecode on BSC, false = EOA (or empty). */
function useRecipientIsContract(addr: string | null): boolean | null {
  const [v, setV] = useState<boolean | null>(null);
  useEffect(() => {
    if (!addr) {
      setV(null);
      return;
    }
    let alive = true;
    setV(null);
    const t = setTimeout(async () => {
      try {
        const code = await publicClient.getCode({ address: addr as Address });
        if (alive) setV(!!code && code !== "0x");
      } catch {
        if (alive) setV(false);
      }
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [addr]);
  return v;
}

function Bar({ used, cap, label, tone = "amber" }: { used: bigint; cap: bigint; label: string; tone?: "amber" | "green" }) {
  const pct = cap > 0n ? Math.min(100, Number((used * 10000n) / cap) / 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[10.5px] text-muted">
        <span>{label}</span>
        <span className="text-bone">
          {fmtWei(used, 4)} / {fmtWei(cap, 4)} ANTB · {pct.toFixed(pct < 10 ? 1 : 0)}%
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div className={`h-full ${tone === "amber" ? "bg-amber" : "bg-green"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StepLabel({ n, title, state }: { n: string; title: string; state: "todo" | "active" | "done" | "fail" }) {
  const color =
    state === "done" ? "border-green/50 text-green" : state === "fail" ? "border-red/50 text-red" : state === "active" ? "border-amber/60 text-amber" : "border-line text-muted";
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-[11px] ${color}`}>
        {state === "done" ? <Check size={12} /> : n}
      </span>
      <span className={`text-sm font-medium ${state === "todo" ? "text-muted" : "text-bone"}`}>{title}</span>
    </div>
  );
}

function TxLink({ hash, label }: { hash: Hash; label: string }) {
  return (
    <a href={bscTx(hash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-amber hover:underline">
      {label} {shortAddr(hash, 6)} <ArrowUpRight size={11} />
    </a>
  );
}

export function BridgeDisclosures({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-xl border border-amber/30 bg-amber/[0.06] ${compact ? "p-4" : "p-5"}`}>
      <div className="label-amber flex items-center gap-2">
        <ShieldAlert size={12} /> Read before depositing
      </div>
      <ul className={`mt-3 space-y-2 leading-relaxed text-bone/90 ${compact ? "text-[13px]" : "text-sm"}`}>
        <li>
          <span className="text-bone">Genesis Deposit.</span> {BRIDGE_DISCLOSURES.genesisDeposit.replace("Genesis Deposit: ", "")}
        </li>
        <li>
          <span className="text-bone">Beta escrow.</span> {BRIDGE_DISCLOSURES.escrow.replace("Beta escrow: ", "")}{" "}
          <a href="/builders#owner-permissions" className="text-amber hover:underline">
            Owner permissions
          </a>
          .
        </li>
        <li>
          <span className="text-bone">Trading / price risk.</span> {BRIDGE_DISCLOSURES.trading.replace("Trading / price risk: ", "")}
        </li>
        <li>
          <span className="text-bone">Not live yet.</span> {BRIDGE_DISCLOSURES.notLive}
        </li>
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px]">
        <a href={bscCode(BSC_CONTRACTS.Bridge)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber hover:underline">
          Verified Bridge source on BscScan <ArrowUpRight size={11} />
        </a>
        <span className="text-muted">{shortAddr(BSC_CONTRACTS.Bridge, 6)}</span>
      </div>
    </div>
  );
}

export function BridgeApp() {
  const L = useL();
  const w = useWallet();
  const bsc = useBsc(15_000);
  const [bump, setBump] = useState(0);
  const { reads, err: readErr } = useAccountReads(w.address, bump);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientTouched, setRecipientTouched] = useState(false);
  const [flow, setFlow] = useState<Flow>({ k: "idle" });

  useEffect(() => {
    if (w.address && !recipientTouched) setRecipient(w.address);
    if (!w.address) {
      setRecipient("");
      setRecipientTouched(false);
      setFlow({ k: "idle" });
    }
  }, [w.address, recipientTouched]);

  const connected = w.status === "connected" && !!w.address;
  const onBsc = w.chainId === BSC_CHAIN_ID;
  const eligible = reads ? reads.agentId > 0n || reads.bab > 0n : null;
  const remainingGlobal = bsc?.bridge ? BigInt(bsc.bridge.remainingGlobal) : null;
  const maxAmount = useMemo(() => {
    if (!reads) return null;
    return min(reads.antb, reads.remainingFor, remainingGlobal ?? reads.remainingFor);
  }, [reads, remainingGlobal]);

  let amountWei: bigint | null = null;
  let amountErr: string | null = null;
  if (amount.trim()) {
    try {
      amountWei = parseUnits(amount.trim(), 18);
      if (amountWei <= 0n) amountErr = "Amount must be greater than zero.";
      else if (maxAmount !== null && amountWei > maxAmount) amountErr = `Max ${fmtWei(maxAmount, 6)} ANTB for this address right now.`;
    } catch {
      amountErr = "Enter a decimal ANTB amount.";
    }
  }
  const recipientOk = isAddress(recipient);
  const recipientIsContract = useRecipientIsContract(recipientOk ? recipient : null);
  const [contractAck, setContractAck] = useState(false);
  useEffect(() => setContractAck(false), [recipient]);
  const paused = bsc?.bridge?.paused ?? false;
  const busy = flow.k === "switching" || flow.k === "approving" || flow.k === "depositing";
  const contractBlocked = recipientIsContract === true && !contractAck;
  const canSubmit =
    connected && eligible === true && !paused && amountWei !== null && !amountErr && recipientOk && !busy && !contractBlocked && recipientIsContract !== null;
  const needsApprove = reads && amountWei !== null ? reads.allowance < amountWei : true;
  const perAddressCap = bsc?.bridge ? BigInt(bsc.bridge.perAddressCap) : null;
  const globalCap = bsc?.bridge ? BigInt(bsc.bridge.globalCap) : null;

  const submit = useCallback(async () => {
    if (!amountWei || !recipientOk) return;
    const to = recipient as Address;
    let approveTx: Hash | undefined;
    try {
      setFlow({ k: "switching" });
      await ensureBsc();
      const account = activeAccount();
      const wallet = getWalletClient();
      // 1. exact-amount approve (never unlimited), skipped when allowance already suffices
      const allowance = await publicClient.readContract({ address: BSC_CONTRACTS.ANTB, abi: erc20Abi, functionName: "allowance", args: [account, BSC_CONTRACTS.Bridge] });
      if (allowance < amountWei) {
        setFlow({ k: "approving" });
        approveTx = await wallet.writeContract({
          address: BSC_CONTRACTS.ANTB,
          abi: erc20Abi,
          functionName: "approve",
          args: [BSC_CONTRACTS.Bridge, amountWei],
          account,
          chain: wallet.chain,
        });
        setFlow({ k: "approving", tx: approveTx });
        const rc = await publicClient.waitForTransactionReceipt({ hash: approveTx, confirmations: 1 });
        if (rc.status !== "success") throw new Error("Approve transaction reverted.");
      }
      // 2. deposit — simulate first so reverts surface as readable errors
      setFlow({ k: "depositing", approveTx });
      const { request } = await publicClient.simulateContract({
        address: BSC_CONTRACTS.Bridge,
        abi: bridgeAbi,
        functionName: "deposit",
        args: [amountWei, to],
        account,
      });
      const tx = await wallet.writeContract({ ...request, account, chain: wallet.chain });
      setFlow({ k: "depositing", approveTx, tx });
      const rc = await publicClient.waitForTransactionReceipt({ hash: tx, confirmations: 1 });
      if (rc.status !== "success") throw new Error("Deposit transaction reverted.");
      const logs = parseEventLogs({ abi: bridgeAbi, eventName: "Deposited", logs: rc.logs });
      const nonce = logs.length ? Number(logs[0].args.nonce) : -1;
      setFlow({ k: "done", approveTx, tx, nonce, amount: amountWei, l2Recipient: to });
      setAmount("");
      setBump((b) => b + 1);
    } catch (e) {
      setFlow({ k: "error", msg: errMsg(e), approveTx });
    }
  }, [amountWei, recipient, recipientOk]);

  const stepConnect: "done" | "active" = connected ? "done" : "active";
  const stepElig: "todo" | "active" | "done" | "fail" = !connected ? "todo" : eligible === null ? "active" : eligible ? "done" : "fail";
  const stepAmount: "todo" | "active" | "done" = eligible !== true ? "todo" : amountWei && !amountErr && recipientOk ? "done" : "active";
  const stepTx: "todo" | "active" | "done" | "fail" = flow.k === "done" ? "done" : flow.k === "error" ? "fail" : busy ? "active" : "todo";

  return (
    <div className="card relative min-w-0 p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="label">{L("Genesis Deposit · BSC → AGENT CHAIN block 0", "创世存款 · BSC → AGENT CHAIN 第 0 个区块")}</div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${
            bsc?.bridge ? (paused ? "border-red/40 bg-red/10 text-red" : "border-green/40 bg-green/10 text-green") : "border-line text-muted"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${bsc?.bridge ? (paused ? "bg-red" : "bg-green animate-blink") : "bg-line"}`} />
          {bsc?.bridge ? (paused ? "Paused" : "Window open") : "reading…"}
        </span>
      </div>

      <div className="space-y-5">
        {/* a. connect */}
        <div>
          <StepLabel n="01" title={L("Connect a BSC wallet", "连接 BSC 钱包")} state={stepConnect} />
          <div className="mt-3 pl-9">
            {w.status === "no-wallet" ? <NoWalletHint /> : <ConnectButton />}
          </div>
        </div>

        {/* b. eligibility */}
        <div>
          <StepLabel n="02" title={L("Agent ID / BAB check", "Agent ID / BAB 检查")} state={stepElig} />
          <div className="mt-3 pl-9 text-sm">
            {!connected && <span className="text-muted">Reads Agent ID and BAB balances for the connected address.</span>}
            {connected && eligible === null && (
              <span className="inline-flex items-center gap-2 text-muted">
                <Loader2 size={13} className="animate-spin" /> {readErr ? `read failed · ${readErr}` : "reading balances…"}
              </span>
            )}
            {connected && reads && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className={`rounded-md border p-3 font-mono text-[11px] ${reads.agentId > 0n ? "border-green/40 text-green" : "border-line text-muted"}`}>
                  Agent ID · balanceOf = {reads.agentId.toString()}
                </div>
                <div className={`rounded-md border p-3 font-mono text-[11px] ${reads.bab > 0n ? "border-green/40 text-green" : "border-line text-muted"}`}>
                  BAB · balanceOf = {reads.bab.toString()}
                </div>
                {eligible ? (
                  <div className="sm:col-span-2 text-green">Eligible. This address is a verified human&apos;s agent.</div>
                ) : (
                  <div className="sm:col-span-2 rounded-md border border-red/40 bg-red/10 p-3 text-red">
                    <div className="flex items-center gap-2 font-medium">
                      <CircleAlert size={14} /> Not eligible
                    </div>
                    <p className="mt-1 text-[13px] text-bone/80">
                      Claim your Agent ID inside the Binance App: <span className="text-bone">Wallet → banner → Agent ID</span>. Then
                      connect the same address here.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* c + d. amount and recipient */}
        <div>
          <StepLabel n="03" title={L("Amount and L2 recipient", "金额与 L2 接收地址")} state={stepAmount} />
          <div className="mt-3 space-y-3 pl-9">
            <div className={`rounded-lg border border-line bg-surface-2 p-4 ${eligible !== true ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="label">{L("Deposit", "存入")}</span>
                <span className="font-mono text-[11px] text-muted">ANTB · BSC 56</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <input
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  disabled={eligible !== true || busy}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="w-full min-w-0 bg-transparent font-mono text-2xl text-bone outline-none placeholder:text-muted/50 disabled:cursor-not-allowed"
                  aria-label="Amount in ANTB"
                />
                <button
                  type="button"
                  disabled={maxAmount === null || eligible !== true || busy}
                  onClick={() => maxAmount !== null && setAmount(fmtWei(maxAmount, 18).replace(/,/g, ""))}
                  className="rounded-md border border-line px-2.5 py-1 font-mono text-xs text-amber hover:border-amber/50 disabled:opacity-50"
                >
                  MAX
                </button>
                <span className="rounded-md border border-line px-2.5 py-1 font-mono text-xs text-bone">ANTB</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[10.5px] text-muted">
                <div>
                  balance
                  <div className="text-bone">{reads ? fmtWei(reads.antb, 4) : "—"}</div>
                </div>
                <div>
                  your remaining
                  <div className="text-bone">{reads ? fmtWei(reads.remainingFor, 4) : "—"}</div>
                </div>
                <div>
                  global remaining
                  <div className="text-bone">{remainingGlobal !== null ? fmtWei(remainingGlobal, 4) : "—"}</div>
                </div>
              </div>
              {amountErr && <div className="mt-2 font-mono text-[11px] text-red">{amountErr}</div>}
              {(reads || globalCap !== null) && (
                <div className="mt-4 space-y-2.5">
                  {reads && perAddressCap !== null && <Bar label={L("your cap used", "你的额度已用")} used={reads.depositedBy} cap={perAddressCap} />}
                  {globalCap !== null && bsc?.bridge && <Bar label={L("global cap used", "全局额度已用")} used={BigInt(bsc.bridge.totalDeposited)} cap={globalCap} tone="green" />}
                </div>
              )}
            </div>
            <div className={`rounded-lg border border-line bg-surface-2 p-4 ${eligible !== true ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="label">{L("L2 recipient", "L2 接收地址")}</span>
                <span className="font-mono text-[11px] text-muted">{L("AGENT CHAIN mainnet (chain ID 1119, launching)", "AGENT CHAIN 主网（链 ID 1119，即将上线）")}</span>
              </div>
              <input
                value={recipient}
                disabled={eligible !== true || busy}
                onChange={(e) => {
                  setRecipientTouched(true);
                  setRecipient(e.target.value.trim());
                }}
                spellCheck={false}
                className="mt-2 w-full min-w-0 bg-transparent font-mono text-[13px] text-bone outline-none disabled:cursor-not-allowed"
                aria-label="L2 recipient address"
                placeholder="0x…"
              />
              <div className="mt-1.5 font-mono text-[11px]">
                {recipient && !recipientOk ? (
                  <span className="text-red">Not a valid address.</span>
                ) : recipient && w.address && recipient.toLowerCase() !== w.address.toLowerCase() ? (
                  <span className="text-amber">Different from the connected address — it must hold an Agent ID to transact on AGENT CHAIN.</span>
                ) : (
                  <span className="text-muted">{L("Defaults to the connected address. Credited as native ANTB in block 0.", "默认为已连接地址。将在第 0 个区块以原生 ANTB 入账。")}</span>
                )}
              </div>
              {recipientOk && recipientIsContract === null && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-[11px] text-muted">
                  <Loader2 size={11} className="animate-spin" /> {L("checking bytecode on BSC…", "正在检查 BSC 上的字节码…")}
                </div>
              )}
              {recipientIsContract === true && (
                <div className="mt-3 rounded-md border border-red/50 bg-red/10 p-3 text-[13px] text-red">
                  <div className="flex items-center gap-2 font-medium">
                    <CircleAlert size={14} />
                    {L("This is a contract address on BSC.", "这是 BSC 上的合约地址。")}
                  </div>
                  <p className="mt-1 text-bone/80">
                    {L(
                      "It will have no code on AGENT CHAIN; funds credited there may be unrecoverable. Use an EOA.",
                      "它在 AGENT CHAIN 上不会有任何代码；入账到该地址的资金可能无法找回。请使用 EOA（外部账户）。",
                    )}
                  </p>
                  <label className="mt-2 flex cursor-pointer items-start gap-2 text-[12px] text-bone">
                    <input type="checkbox" checked={contractAck} onChange={(e) => setContractAck(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-[#E5604F]" />
                    {L("I understand this address is a contract on BSC and I still want to credit it in block 0.", "我明白该地址是 BSC 上的合约，仍要在第 0 个区块向其入账。")}
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* e. transactions */}
        <div>
          <StepLabel n="04" title={needsApprove ? L("Approve exact amount, then deposit", "先精确授权，再存入") : L("Deposit", "存入")} state={stepTx} />
          <div className="mt-3 space-y-3 pl-9">
            <ul className="space-y-1.5 rounded-md border border-amber/30 bg-amber/[0.06] p-3 text-[12px] leading-relaxed text-bone/85">
              <li className="flex gap-2">
                <ShieldAlert size={12} className="mt-[3px] shrink-0 text-amber" />
                <span>
                  {L("Beta escrow: the owner key can withdraw (", "Beta 托管：owner 密钥可以提走资金（")}
                  <code className="font-mono text-bone">withdrawTo</code>
                  {L("); owner is currently a single EOA ", "）；owner 目前是单个 EOA ")}
                  <a href={bscAddr(BSC_OWNER)} target="_blank" rel="noreferrer" className="font-mono text-amber hover:underline">
                    {shortAddr(BSC_OWNER, 4)}
                  </a>
                  {L(" and will move to a multisig.", "，后续将迁移到多签。")}
                </span>
              </li>
              <li className="flex gap-2">
                <ShieldAlert size={12} className="mt-[3px] shrink-0 text-amber" />
                <span>
                  {L(
                    "ANTB is an upgradeable token controlled by its issuer; it can be paused or compliance-restricted. Deposits are credited by raw token units 1:1.",
                    "ANTB 是由发行方控制的可升级代币，可能被暂停或受合规限制。存款按原始代币单位 1:1 入账。",
                  )}
                </span>
              </li>
              <li className="flex gap-2">
                <ShieldAlert size={12} className="mt-[3px] shrink-0 text-amber" />
                <span>{L("There is no self-service refund in the Beta bridge.", "Beta 桥没有自助退款。")}</span>
              </li>
            </ul>
            <button type="button" disabled={!canSubmit} onClick={() => void submit()} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50">
              {busy && <Loader2 size={15} className="animate-spin" />}
              {flow.k === "switching"
                ? "Switching to BSC…"
                : flow.k === "approving"
                  ? flow.tx
                    ? "Approve pending…"
                    : "Confirm approve in wallet…"
                  : flow.k === "depositing"
                    ? flow.tx
                      ? "Deposit pending…"
                      : "Confirm deposit in wallet…"
                    : paused
                      ? "Deposits paused"
                      : !connected
                        ? "Connect to continue"
                        : eligible === false
                          ? "Agent ID required"
                          : !onBsc && connected
                            ? "Deposit (switches to BSC)"
                            : needsApprove
                              ? `Approve ${amountWei ? fmtWei(amountWei, 6) : ""} ANTB + deposit`
                              : `Deposit ${amountWei ? fmtWei(amountWei, 6) : ""} ANTB`}
            </button>
            {(flow.k === "approving" || flow.k === "depositing" || flow.k === "done" || flow.k === "error") && (
              <div className="space-y-1.5 rounded-md border border-line p-3">
                {"approveTx" in flow && flow.approveTx && <div><TxLink hash={flow.approveTx} label="approve" /> <span className="font-mono text-[11px] text-green">· confirmed</span></div>}
                {flow.k === "approving" && flow.tx && <div><TxLink hash={flow.tx} label="approve" /> <span className="font-mono text-[11px] text-amber">· pending</span></div>}
                {flow.k === "depositing" && flow.tx && <div><TxLink hash={flow.tx} label="deposit" /> <span className="font-mono text-[11px] text-amber">· pending</span></div>}
                {flow.k === "done" && (
                  <>
                    <div><TxLink hash={flow.tx} label="deposit" /> <span className="font-mono text-[11px] text-green">· confirmed</span></div>
                    <div className="pt-1 text-sm text-bone">
                      {flow.nonce >= 0 ? (
                        <>
                          <div className="font-mono text-amber">
                            {L("Deposit nonce", "存款序号 nonce")} {flow.nonce}
                            <span className="text-muted"> · {L("your position", "你的位置")}: #{fmtInt(flow.nonce + 1)} {L("across", "")}</span>
                          </div>
                          <div className="mt-1">
                            {fmtWei(flow.amount, 6)} ANTB {L("will be credited to", "将入账到")}{" "}
                            <span className="font-mono">{shortAddr(flow.l2Recipient, 5)}</span> {L("in block 0.", "（第 0 个区块）。")}
                          </div>
                        </>
                      ) : (
                        L("Deposit confirmed.", "存款已确认。")
                      )}
                    </div>
                  </>
                )}
                {flow.k === "error" && <div className="font-mono text-[11px] text-red">{flow.msg}</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* live caps */}
      <div className="mt-6 grid grid-cols-2 gap-2 font-mono text-[11px] text-muted sm:grid-cols-4">
        {[
          ["perAddressCap", bsc?.bridge ? `${fmtWei(bsc.bridge.perAddressCap, 4)} ANTB` : "—"],
          ["globalCap", bsc?.bridge ? `${fmtWei(bsc.bridge.globalCap, 4)} ANTB` : "—"],
          ["totalDeposited", bsc?.bridge ? `${fmtWei(bsc.bridge.totalDeposited, 4)} ANTB` : "—"],
          ["depositCount", bsc?.bridge ? fmtInt(bsc.bridge.depositCount) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border border-line p-3">
            <div>{k}</div>
            <div className="mt-1 text-bone">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 font-mono text-[10.5px] text-muted">
        paused() = {bsc?.bridge ? String(bsc.bridge.paused) : "—"} · polled every 15 s · block {bsc?.block ? `#${fmtInt(bsc.block)}` : "—"}
      </div>
    </div>
  );
}

export function DepositsTable() {
  const bsc = useBsc(15_000);
  const rows = bsc?.deposits ?? [];
  const now = Date.now();
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <span className="label flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${bsc?.ok ? "bg-green animate-blink" : "bg-line"}`} />
          Genesis Deposits · latest {rows.length ? rows.length : ""} Deposited events
        </span>
        <span className="font-mono text-[11px] text-muted">
          from block #{fmtInt(BSC_DEPLOY_BLOCKS.Bridge)} · {bsc?.sync?.depositsComplete ? "synced" : bsc ? "syncing…" : "…"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] font-mono text-[12.5px]">
          <thead>
            <tr className="text-left text-[10.5px] uppercase tracking-label text-muted">
              <th className="px-5 py-2.5 font-normal">#</th>
              <th className="px-3 py-2.5 font-normal">from</th>
              <th className="px-3 py-2.5 font-normal">l2 recipient</th>
              <th className="px-3 py-2.5 text-right font-normal">ANTB</th>
              <th className="px-3 py-2.5 font-normal">time</th>
              <th className="px-5 py-2.5 text-right font-normal">tx</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.nonce} className="border-t border-line/60">
                <td className="px-5 py-2.5 text-amber">{fmtInt(d.nonce + 1)}</td>
                <td className="px-3 py-2.5 text-bone">{shortAddr(d.from, 4)}</td>
                <td className="px-3 py-2.5 text-muted">{d.l2Recipient.toLowerCase() === d.from.toLowerCase() ? "same" : shortAddr(d.l2Recipient, 4)}</td>
                <td className="px-3 py-2.5 text-right text-bone">{fmtWei(d.amount, 6)}</td>
                <td className="px-3 py-2.5 text-muted" title={d.ts ? new Date(d.ts * 1000).toISOString() : ""}>
                  {fmtAgo(d.ts, now)}
                </td>
                <td className="px-5 py-2.5 text-right">
                  <a href={bscTx(d.tx)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-amber">
                    {shortAddr(d.tx, 4)} <ArrowUpRight size={11} />
                  </a>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr className="border-t border-line/60">
                <td colSpan={6} className="px-5 py-8 text-center text-muted">
                  {bsc === null ? "connecting…" : bsc.ok ? "No Genesis Deposits yet. The first deposit gets nonce 0." : `rpc ${bsc.error ?? "unreachable"}`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
