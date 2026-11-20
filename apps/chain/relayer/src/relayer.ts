import * as fs from 'node:fs';
import { createPublicClient, createWalletClient, defineChain, formatEther, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { RelayerConfig } from './config.js';
import { BscClients } from './bsc.js';
import { StateStore, type DepositRecord, type RelayerState } from './state.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (...a: unknown[]) => console.log(new Date().toISOString(), '[relayer]', ...a);
const warn = (...a: unknown[]) => console.warn(new Date().toISOString(), '[relayer] WARN', ...a);

export class Relayer {
  readonly owner;
  private readonly bsc: BscClients;
  private readonly store: StateStore;
  private readonly l2;
  private readonly l2Wallet;
  private running = false;
  private busy = false;

  // observable status
  public lastLoopAt?: string;
  public lastError?: string;
  public bscHead = 0n;
  public ownerL2Balance = 0n;
  public l2ChainIdSeen?: number;
  public escrow?: { totalDeposited: bigint; totalWithdrawn: bigint; balance: bigint; depositCount: bigint; inbox: Address; holds: boolean };

  constructor(private readonly cfg: RelayerConfig) {
    this.owner = privateKeyToAccount(cfg.ownerPrivateKey);
    this.bsc = new BscClients(cfg.bscRpcUrls);
    this.store = new StateStore(cfg.stateFile, cfg.bridgeAddress, cfg.bridgeDeployBlock);
    const chain = defineChain({
      id: cfg.l2ChainId,
      name: 'AGENT CHAIN',
      nativeCurrency: { name: 'Anthropic', symbol: 'ANTB', decimals: 18 },
      rpcUrls: { default: { http: [cfg.l2RpcUrl] } },
    });
    const transport = http(cfg.l2RpcUrl, { timeout: 30_000, retryCount: 1 });
    this.l2 = createPublicClient({ chain, transport });
    this.l2Wallet = createWalletClient({ chain, transport, account: this.owner });
  }

  state(): RelayerState {
    return this.store.load();
  }

  async start() {
    this.running = true;
    const st = this.store.load();
    if (!fs.existsSync(this.cfg.stateFile)) this.store.save(st); // create the file on first boot
    log(`owner ${this.owner.address}; bridge ${this.cfg.bridgeAddress} from block ${this.cfg.bridgeDeployBlock}; cursor ${st.cursor}; processed ${Object.keys(st.processed).length}; pending ${Object.keys(st.pending).length}`);
    while (this.running) {
      try {
        await this.tick();
        this.lastError = undefined;
      } catch (e) {
        this.lastError = String((e as Error).message ?? e).split('\n')[0];
        warn('tick failed:', this.lastError);
      }
      this.lastLoopAt = new Date().toISOString();
      await sleep(this.cfg.pollIntervalMs);
    }
  }

  stop() {
    this.running = false;
  }

  /** One iteration: scan new BSC blocks → queue deposits → credit pending in nonce order. */
  async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      const bscChain = await this.bsc.chainId();
      if (bscChain !== this.cfg.bscChainId) throw new Error(`BSC RPC chainId ${bscChain} != ${this.cfg.bscChainId}`);
      this.bscHead = await this.bsc.blockNumber();
      const safeHead = this.bscHead - this.cfg.confirmations;

      // 1) scan
      let st = this.store.load();
      let cursor = BigInt(st.cursor);
      while (cursor < safeHead) {
        const from = cursor + 1n;
        const to = from + this.cfg.chunkBlocks - 1n < safeHead ? from + this.cfg.chunkBlocks - 1n : safeHead;
        const deposits = await this.bsc.deposits(this.cfg.bridgeAddress, from, to);
        st = this.store.load(); // re-read: never clobber a concurrent write
        for (const d of deposits) {
          const n = d.nonce.toString();
          if (st.processed[n] || st.pending[n]) continue;
          st.pending[n] = {
            nonce: n,
            depositor: d.depositor,
            l2Recipient: d.l2Recipient,
            amount: d.amount.toString(),
            bscTx: d.txHash,
            bscBlock: d.blockNumber.toString(),
            seenAt: new Date().toISOString(),
          };
          log(`deposit nonce ${n}: ${formatEther(d.amount)} ANTB → ${d.l2Recipient} (bsc tx ${d.txHash}, block ${d.blockNumber})`);
        }
        st.cursor = to.toString();
        this.store.save(st);
        cursor = to;
        if (deposits.length > 0) log(`scanned ${from}–${to}: ${deposits.length} deposit(s)`);
      }

      // 2) L2 balance + escrow sanity
      this.ownerL2Balance = await this.l2.getBalance({ address: this.owner.address });
      if (this.l2ChainIdSeen === undefined) {
        this.l2ChainIdSeen = await this.l2.getChainId();
        if (this.l2ChainIdSeen !== this.cfg.l2ChainId) throw new Error(`L2 RPC chainId ${this.l2ChainIdSeen} != ${this.cfg.l2ChainId}`);
      }
      const pendingNonces = Object.keys(st.pending).map(BigInt).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      if (pendingNonces.length === 0) return;

      this.escrow = await this.bsc.escrow(this.cfg.bridgeAddress, this.cfg.antbAddress);
      if (!this.escrow.holds) {
        warn(`ESCROW INVARIANT BROKEN: balance ${formatEther(this.escrow.balance)} + withdrawn ${formatEther(this.escrow.totalWithdrawn)} < deposited ${formatEther(this.escrow.totalDeposited)} — NOT crediting ${pendingNonces.length} pending deposit(s)`);
        return;
      }

      // 3) credit in nonce order
      for (const nonce of pendingNonces) {
        const ok = await this.credit(nonce.toString());
        if (!ok) break; // keep ordering: do not skip ahead of a deposit we could not pay
      }
    } finally {
      this.busy = false;
    }
  }

  /** Credit one pending nonce. Returns false when it must be retried later (insufficient funds, L2 error). */
  private async credit(nonce: string): Promise<boolean> {
    // Re-read the file immediately before any send: the single source of truth for "already paid".
    let st = this.store.load();
    const rec = st.pending[nonce];
    if (!rec) return true;
    if (st.processed[nonce]) {
      delete st.pending[nonce];
      this.store.save(st);
      return true;
    }
    const amount = BigInt(rec.amount);
    if (amount > this.cfg.maxCreditWei) {
      warn(`nonce ${nonce}: amount ${formatEther(amount)} ANTB exceeds MAX_CREDIT_WEI — refusing (manual review)`);
      rec.lastError = 'exceeds MAX_CREDIT_WEI';
      this.store.save(st);
      return false;
    }

    // Broadcast already happened (crash between send and receipt)? Resolve it instead of paying again.
    if (rec.l2Tx) {
      const r = await this.l2.getTransactionReceipt({ hash: rec.l2Tx }).catch(() => null);
      if (r) return this.finish(nonce, rec, r.blockNumber, r.status === 'success');
      const tx = await this.l2.getTransaction({ hash: rec.l2Tx }).catch(() => null);
      if (tx) {
        log(`nonce ${nonce}: l2 tx ${rec.l2Tx} still pending`);
        return false;
      }
      warn(`nonce ${nonce}: recorded l2 tx ${rec.l2Tx} unknown to the node — will resend`);
    }

    const gas = 30_000n; // simple value transfer incl. parent-chain data component (measured 22,409)
    const gasPrice = await this.l2.getGasPrice();
    const need = amount + gas * gasPrice * 3n;
    const bal = await this.l2.getBalance({ address: this.owner.address });
    this.ownerL2Balance = bal;
    if (bal < need) {
      warn(`INSUFFICIENT OWNER L2 BALANCE for nonce ${nonce}: have ${formatEther(bal)} ANTB, need ${formatEther(need)} (amount ${formatEther(amount)}) — bridge more ANTB to ${this.owner.address}; retrying later`);
      rec.lastError = `insufficient owner L2 balance (${formatEther(bal)} < ${formatEther(need)})`;
      rec.attempts = (rec.attempts ?? 0) + 1;
      this.store.save(st);
      return false;
    }

    const txNonce = await this.l2.getTransactionCount({ address: this.owner.address, blockTag: 'pending' });
    const request = await this.l2Wallet.prepareTransactionRequest({
      account: this.owner,
      to: rec.l2Recipient,
      value: amount,
      gas,
      maxFeePerGas: gasPrice * 3n,
      maxPriorityFeePerGas: 0n,
      nonce: txNonce,
    });
    const signed = await this.l2Wallet.signTransaction(request);
    const hash = await this.l2.sendRawTransaction({ serializedTransaction: signed });

    // Persist the hash before waiting — a crash here must not lead to a second payment.
    st = this.store.load();
    const live = st.pending[nonce];
    if (!live) {
      warn(`nonce ${nonce}: pending record vanished during send; l2 tx ${hash}`);
      return true;
    }
    live.l2Tx = hash;
    live.attempts = (live.attempts ?? 0) + 1;
    this.store.save(st);
    log(`nonce ${nonce}: sent ${formatEther(amount)} ANTB → ${rec.l2Recipient}, l2 tx ${hash}`);

    const receipt = await this.l2.waitForTransactionReceipt({ hash, timeout: 120_000 });
    return this.finish(nonce, live, receipt.blockNumber, receipt.status === 'success');
  }

  private finish(nonce: string, rec: DepositRecord, block: bigint, success: boolean): boolean {
    const st = this.store.load();
    const live = st.pending[nonce] ?? rec;
    if (!success) {
      warn(`nonce ${nonce}: l2 tx ${live.l2Tx} REVERTED — leaving pending for manual review`);
      live.lastError = `l2 tx ${live.l2Tx} reverted`;
      st.pending[nonce] = live;
      this.store.save(st);
      return false;
    }
    live.l2Block = block.toString();
    live.creditedAt = new Date().toISOString();
    delete live.lastError;
    delete st.pending[nonce];
    st.processed[nonce] = live;
    this.store.save(st);
    log(`nonce ${nonce}: credited in L2 block ${block} (bsc ${live.bscTx} → l2 ${live.l2Tx})`);
    return true;
  }

  status() {
    const st = this.store.load();
    const pending = Object.values(st.pending).sort((a, b) => Number(a.nonce) - Number(b.nonce));
    return {
      ok: !this.lastError,
      owner: this.owner.address,
      bridge: this.cfg.bridgeAddress,
      bscHead: this.bscHead.toString(),
      cursor: st.cursor,
      confirmations: this.cfg.confirmations.toString(),
      processedCount: Object.keys(st.processed).length,
      pendingCount: pending.length,
      pending,
      lastProcessed: Object.values(st.processed).sort((a, b) => Number(b.nonce) - Number(a.nonce)).slice(0, 10),
      ownerL2Balance: this.ownerL2Balance.toString(),
      ownerL2BalanceAntb: formatEther(this.ownerL2Balance),
      l2ChainId: this.l2ChainIdSeen ?? null,
      escrow: this.escrow
        ? {
            totalDeposited: this.escrow.totalDeposited.toString(),
            totalWithdrawn: this.escrow.totalWithdrawn.toString(),
            balance: this.escrow.balance.toString(),
            depositCount: this.escrow.depositCount.toString(),
            inbox: this.escrow.inbox,
            holds: this.escrow.holds,
          }
        : null,
      lastLoopAt: this.lastLoopAt ?? null,
      lastError: this.lastError ?? null,
      stateUpdatedAt: st.updatedAt,
    };
  }
}
