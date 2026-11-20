"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Check, CircleAlert, Loader2 } from "lucide-react";
import { parseEventLogs, type Address, type Hash } from "viem";
import { useBsc } from "@/hooks/useBsc";
import { fmtAgo, fmtInt, shortAddr } from "@/lib/format";
import {
  AGENT_ID_SNAPSHOT,
  BSC_CONTRACTS,
  bscCode,
  bscTx,
  erc721BalanceAbi,
  publicClient,
  registryAbi,
  seatClaimAbi,
} from "@/lib/bsc";
import { activeAccount, ensureBsc, errMsg, getWalletClient, useWallet } from "@/lib/wallet";
import { ConnectButton, NoWalletHint } from "@/components/wallet/ConnectButton";
import { useL } from "@/components/LangProvider";

type Reads = { agentId: bigint; bab: bigint; seatId: bigint; registered: boolean; index: bigint };
type Tx = { k: "idle" } | { k: "busy"; msg: string; tx?: Hash } | { k: "done"; tx: Hash; value: number } | { k: "error"; msg: string };

function useReads(address: Address | null, bump: number) {
  const [reads, setReads] = useState<Reads | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!address) {
      setReads(null);
      return;
    }
    let alive = true;
    async function load() {
      try {
        const r = await publicClient.multicall({
          allowFailure: false,
          contracts: [
            { address: BSC_CONTRACTS.AgentId, abi: erc721BalanceAbi, functionName: "balanceOf", args: [address!] },
            { address: BSC_CONTRACTS.BAB, abi: erc721BalanceAbi, functionName: "balanceOf", args: [address!] },
            { address: BSC_CONTRACTS.GenesisSeatClaim, abi: seatClaimAbi, functionName: "seatOf", args: [address!] },
            { address: BSC_CONTRACTS.AgentRegistryMirror, abi: registryAbi, functionName: "isRegistered", args: [address!] },
            { address: BSC_CONTRACTS.AgentRegistryMirror, abi: registryAbi, functionName: "indexOf", args: [address!] },
          ],
        });
        if (!alive) return;
        setReads({ agentId: r[0], bab: r[1], seatId: r[2], registered: r[3], index: r[4] });
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
  return { reads, err };
}

/** Decodes `data:application/json;base64,…` → { name, image } and renders the SVG. */
function SeatCard({ seatId }: { seatId: bigint }) {
  const [meta, setMeta] = useState<{ name: string; image: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const uri = await publicClient.readContract({ address: BSC_CONTRACTS.GenesisSeatClaim, abi: seatClaimAbi, functionName: "tokenURI", args: [seatId] });
        const b64 = uri.replace(/^data:application\/json;base64,/, "");
        const json = JSON.parse(atob(b64)) as { name?: string; image?: string };
        if (!json.image?.startsWith("data:image/svg+xml;base64,")) throw new Error("unexpected image encoding");
        if (alive) setMeta({ name: json.name ?? `Genesis Seat #${seatId}`, image: json.image });
      } catch (e) {
        if (alive) setErr(errMsg(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [seatId]);
  return (
    <div className="flex items-start gap-4">
      <div className="h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-line bg-ink">
        {meta ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={meta.image} alt={meta.name} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-[11px] text-muted">{err ? "tokenURI failed" : "rendering…"}</div>
        )}
      </div>
      <div>
        <div className="label">Your seat</div>
        <div className="num mt-1 font-mono text-3xl text-bone">#{fmtInt(seatId)}</div>
        <div className="mt-1 font-mono text-[11px] text-muted">{meta?.name ?? "Genesis Seat"} · on-chain SVG from tokenURI</div>
        <a
          href={`https://bscscan.com/nft/${BSC_CONTRACTS.GenesisSeatClaim}/${seatId}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] text-amber hover:underline"
        >
          View on BscScan <ArrowUpRight size={11} />
        </a>
      </div>
    </div>
  );
}

export function MainnetGenesis() {
  const L = useL();
  const w = useWallet();
  const bsc = useBsc(15_000);
  const [bump, setBump] = useState(0);
  const { reads, err: readErr } = useReads(w.address, bump);
  const [claim, setClaim] = useState<Tx>({ k: "idle" });
  const [reg, setReg] = useState<Tx>({ k: "idle" });

  useEffect(() => {
    if (!w.address) {
      setClaim({ k: "idle" });
      setReg({ k: "idle" });
    }
  }, [w.address]);

  const connected = w.status === "connected" && !!w.address;
  const eligible = reads ? reads.agentId > 0n || reads.bab > 0n : null;
  const hasSeat = reads ? reads.seatId > 0n : false;
  const claimOpen = bsc?.seats?.claimOpen ?? true;

  const doClaim = useCallback(async () => {
    try {
      setClaim({ k: "busy", msg: "Switching to BSC…" });
      await ensureBsc();
      const account = activeAccount();
      const wallet = getWalletClient();
      const { request } = await publicClient.simulateContract({ address: BSC_CONTRACTS.GenesisSeatClaim, abi: seatClaimAbi, functionName: "claim", account });
      setClaim({ k: "busy", msg: "Confirm claim() in wallet…" });
      const tx = await wallet.writeContract({ ...request, account, chain: wallet.chain });
      setClaim({ k: "busy", msg: "Claim pending…", tx });
      const rc = await publicClient.waitForTransactionReceipt({ hash: tx, confirmations: 1 });
      if (rc.status !== "success") throw new Error("Transaction reverted.");
      const logs = parseEventLogs({ abi: seatClaimAbi, eventName: "SeatClaimed", logs: rc.logs });
      setClaim({ k: "done", tx, value: logs.length ? Number(logs[0].args.seatId) : 0 });
      setBump((b) => b + 1);
    } catch (e) {
      setClaim({ k: "error", msg: errMsg(e) });
    }
  }, []);

  const doRegister = useCallback(async () => {
    try {
      setReg({ k: "busy", msg: "Switching to BSC…" });
      await ensureBsc();
      const account = activeAccount();
      const wallet = getWalletClient();
      const { request } = await publicClient.simulateContract({ address: BSC_CONTRACTS.AgentRegistryMirror, abi: registryAbi, functionName: "register", account });
      setReg({ k: "busy", msg: "Confirm register() in wallet…" });
      const tx = await wallet.writeContract({ ...request, account, chain: wallet.chain });
      setReg({ k: "busy", msg: "Register pending…", tx });
      const rc = await publicClient.waitForTransactionReceipt({ hash: tx, confirmations: 1 });
      if (rc.status !== "success") throw new Error("Transaction reverted.");
      const logs = parseEventLogs({ abi: registryAbi, eventName: "AgentRegistered", logs: rc.logs });
      setReg({ k: "done", tx, value: logs.length ? Number(logs[0].args.index) : 0 });
      setBump((b) => b + 1);
    } catch (e) {
      setReg({ k: "error", msg: errMsg(e) });
    }
  }, []);

  const claims = bsc?.seatClaims ?? [];
  const now = Date.now();

  return (
    <div className="container-site mt-16">
      <div className="label-amber mb-6 flex flex-wrap items-center gap-3">
        <span>BSC MAINNET · 56</span>
        <span className="text-line">/</span>
        <span className="inline-flex items-center gap-1.5 text-green">
          <span className="h-1.5 w-1.5 animate-blink rounded-full bg-green" /> GenesisSeatClaim live
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* left: stats + claim */}
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
            <div className="bg-surface p-6">
              <div className="label flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${bsc?.ok ? "bg-green animate-blink" : "bg-line"}`} /> {L("Seats claimed", "已领取席位")}
              </div>
              <div className="num mt-3 font-mono text-4xl text-bone">{bsc?.seats ? fmtInt(bsc.seats.totalSeats) : <span className="text-lg text-muted">connecting…</span>}</div>
              <div className="mt-2 font-mono text-[11px] text-muted">GenesisSeatClaim.totalSeats()</div>
            </div>
            <div className="bg-surface p-6">
              <div className="label">{L("Registered agents", "已注册 agent")}</div>
              <div className="num mt-3 font-mono text-4xl text-bone">{bsc?.registry ? fmtInt(bsc.registry.count) : <span className="text-lg text-muted">connecting…</span>}</div>
              <div className="mt-2 font-mono text-[11px] text-muted">AgentRegistryMirror.count()</div>
            </div>
            <div className="bg-surface p-6">
              <div className="label">{L("Eligible population", "符合资格人数")}</div>
              <div className="num mt-3 font-mono text-4xl text-bone">{fmtInt(AGENT_ID_SNAPSHOT.holders)}</div>
              <div className="mt-2 font-mono text-[11px] text-muted">
                Agent ID holders · snapshot block {fmtInt(AGENT_ID_SNAPSHOT.block)}, {AGENT_ID_SNAPSHOT.date}
              </div>
            </div>
          </div>

          <div className="card p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="label">{L("Claim your Genesis Seat on BSC mainnet", "在 BSC 主网领取你的创世席位")}</div>
              <span className={`rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${claimOpen ? "border-green/40 bg-green/10 text-green" : "border-red/40 bg-red/10 text-red"}`}>
                {bsc?.seats ? (claimOpen ? "claimOpen() = true" : "claim closed") : "reading…"}
              </span>
            </div>
            <p className="mt-3 text-sm text-muted">
              One soulbound seat per Agent ID / BAB holder, numbered in claim order, mirrored into block 0. Identity and
              priority marker — it confers no rights to revenue, equity or returns.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <div className="label mb-2">{L("01 · Connect", "01 · 连接")}</div>
                {w.status === "no-wallet" ? <NoWalletHint /> : <ConnectButton />}
              </div>

              <div>
                <div className="label mb-2">{L("02 · Eligibility", "02 · 资格")}</div>
                {!connected && <div className="text-sm text-muted">Reads Agent ID and BAB balanceOf for the connected address.</div>}
                {connected && !reads && (
                  <div className="inline-flex items-center gap-2 text-sm text-muted">
                    <Loader2 size={13} className="animate-spin" /> {readErr ? `read failed · ${readErr}` : "reading…"}
                  </div>
                )}
                {connected && reads && (
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                    <span className={`rounded-md border px-2 py-1 ${reads.agentId > 0n ? "border-green/40 text-green" : "border-line text-muted"}`}>Agent ID = {reads.agentId.toString()}</span>
                    <span className={`rounded-md border px-2 py-1 ${reads.bab > 0n ? "border-green/40 text-green" : "border-line text-muted"}`}>BAB = {reads.bab.toString()}</span>
                    {eligible ? (
                      <span className="inline-flex items-center gap-1 text-green">
                        <Check size={12} /> eligible
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red">
                        <CircleAlert size={12} /> not eligible
                      </span>
                    )}
                  </div>
                )}
                {connected && eligible === false && (
                  <p className="mt-2 text-[13px] text-bone/80">
                    Claim your Agent ID inside the Binance App: <span className="text-bone">Wallet → banner → Agent ID</span>.
                  </p>
                )}
              </div>

              <div>
                <div className="label mb-2">03 · claim()</div>
                {hasSeat && reads ? (
                  <SeatCard seatId={reads.seatId} />
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={!connected || eligible !== true || !claimOpen || claim.k === "busy"}
                      onClick={() => void doClaim()}
                      className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {claim.k === "busy" ? <Loader2 size={15} className="animate-spin" /> : null}
                      {claim.k === "busy" ? claim.msg : !connected ? "Connect to claim" : eligible === false ? "Agent ID required" : L("Claim Genesis Seat", "领取创世席位")}
                    </button>
                    {claim.k === "busy" && claim.tx && (
                      <div className="mt-2">
                        <a href={bscTx(claim.tx)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-amber hover:underline">
                          tx {shortAddr(claim.tx, 6)} · pending <ArrowUpRight size={11} />
                        </a>
                      </div>
                    )}
                    {claim.k === "error" && <div className="mt-2 font-mono text-[11px] text-red">{claim.msg}</div>}
                  </>
                )}
                {claim.k === "done" && (
                  <div className="mt-2 font-mono text-[11px] text-green">
                    Seat #{claim.value} claimed ·{" "}
                    <a href={bscTx(claim.tx)} target="_blank" rel="noreferrer" className="underline">
                      {shortAddr(claim.tx, 6)}
                    </a>
                  </div>
                )}
              </div>

              <div className="hairline pt-4">
                <div className="label mb-2">{L("Register on AGENT CHAIN · AgentRegistryMirror.register()", "在 AGENT CHAIN 注册 · AgentRegistryMirror.register()")}</div>
                <p className="mb-3 text-[13px] text-muted">
                  Optional opt-in. Stores only your address, a 1-based index and a timestamp; permanent and unrevocable. Read by
                  the bridge relayer, the genesis snapshot and the sequencer allow-list mirror.
                </p>
                {reads?.registered ? (
                  <div className="font-mono text-[12px] text-green">
                    <Check size={12} className="mr-1 inline" /> isRegistered = true · indexOf = {reads.index.toString()}
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={!connected || eligible !== true || reg.k === "busy"}
                      onClick={() => void doRegister()}
                      className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {reg.k === "busy" ? <Loader2 size={15} className="animate-spin" /> : null}
                      {reg.k === "busy" ? reg.msg : "Register"}
                    </button>
                    {connected && reads && !reads.registered && <div className="mt-2 font-mono text-[11px] text-muted">isRegistered = false</div>}
                    {reg.k === "busy" && reg.tx && (
                      <div className="mt-2">
                        <a href={bscTx(reg.tx)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-amber hover:underline">
                          tx {shortAddr(reg.tx, 6)} · pending <ArrowUpRight size={11} />
                        </a>
                      </div>
                    )}
                    {reg.k === "error" && <div className="mt-2 font-mono text-[11px] text-red">{reg.msg}</div>}
                  </>
                )}
                {reg.k === "done" && (
                  <div className="mt-2 font-mono text-[11px] text-green">
                    registered · index {reg.value} ·{" "}
                    <a href={bscTx(reg.tx)} target="_blank" rel="noreferrer" className="underline">
                      {shortAddr(reg.tx, 6)}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
              <a href={bscCode(BSC_CONTRACTS.GenesisSeatClaim)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-amber">
                GenesisSeatClaim {shortAddr(BSC_CONTRACTS.GenesisSeatClaim, 5)} <ArrowUpRight size={11} />
              </a>
              <a href={bscCode(BSC_CONTRACTS.AgentRegistryMirror)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-amber">
                AgentRegistryMirror {shortAddr(BSC_CONTRACTS.AgentRegistryMirror, 5)} <ArrowUpRight size={11} />
              </a>
            </div>
          </div>
        </div>

        {/* right: SeatClaimed feed */}
        <div className="card min-w-0 overflow-hidden lg:self-start">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="label">Latest SeatClaimed · BSC mainnet</span>
            <span className="font-mono text-[11px] text-muted">{claims.length ? `${claims.length} events` : "—"} · 15 s</span>
          </div>
          <ul className="max-h-[560px] min-h-[160px] overflow-y-auto font-mono text-[12.5px]">
            {claims.map((c) => (
              <li key={c.seatId} className="flex items-center justify-between gap-4 border-b border-line/60 px-5 py-2.5 last:border-0">
                <span className="text-bone">
                  Seat <span className="text-amber">#{c.seatId}</span> <span className="text-muted">→</span> {shortAddr(c.holder, 5)}
                </span>
                <span className="flex items-center gap-3 text-muted">
                  <span title={c.ts ? new Date(c.ts * 1000).toISOString() : ""}>{fmtAgo(c.ts, now)}</span>
                  <a href={bscTx(c.tx)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-amber">
                    tx <ArrowUpRight size={11} />
                  </a>
                </span>
              </li>
            ))}
            {!claims.length && (
              <li className="px-5 py-8 text-center text-muted">{bsc === null ? "connecting…" : bsc.ok ? "No SeatClaimed events yet." : `rpc ${bsc.error ?? "unreachable"}`}</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
