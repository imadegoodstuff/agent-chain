import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Address, Hex } from 'viem';

export type DepositRecord = {
  nonce: string;
  depositor: Address;
  l2Recipient: Address;
  amount: string; // wei
  bscTx: Hex;
  bscBlock: string;
  seenAt: string;
  /** set the moment the L2 tx is broadcast (before the receipt) so a crash cannot double-pay */
  l2Tx?: Hex;
  l2Block?: string;
  creditedAt?: string;
  lastError?: string;
  attempts?: number;
};

export type RelayerState = {
  version: 1;
  bridge: Address;
  /** last BSC block fully scanned (inclusive) */
  cursor: string;
  /** nonce → record for credited deposits (receipt status success) */
  processed: Record<string, DepositRecord>;
  /** nonce → record for deposits seen on BSC but not yet credited */
  pending: Record<string, DepositRecord>;
  updatedAt: string;
};

export class StateStore {
  constructor(private readonly file: string, private readonly bridge: Address, private readonly startBlock: bigint) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }

  load(): RelayerState {
    if (!fs.existsSync(this.file)) {
      return { version: 1, bridge: this.bridge, cursor: (this.startBlock - 1n).toString(), processed: {}, pending: {}, updatedAt: new Date().toISOString() };
    }
    const s = JSON.parse(fs.readFileSync(this.file, 'utf8')) as RelayerState;
    if (s.bridge.toLowerCase() !== this.bridge.toLowerCase()) {
      throw new Error(`state file ${this.file} is for bridge ${s.bridge}, configured ${this.bridge}`);
    }
    return s;
  }

  /** Atomic write (tmp + rename). */
  save(s: RelayerState): void {
    s.updatedAt = new Date().toISOString();
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(s, null, 2) + '\n');
    fs.renameSync(tmp, this.file);
  }
}
