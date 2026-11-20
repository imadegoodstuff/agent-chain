import * as fs from 'node:fs';
import * as path from 'node:path';
import { deploymentsDir } from './deployments';
import type { NetworkName } from './env';

/**
 * Append-only launch log: deployments/<network>/LAUNCH-LOG.md.
 * Every parent-chain transaction sent by the launch scripts is recorded with timestamp, hash, gas and BNB spent.
 */
export function launchLogPath(net: NetworkName): string {
  return path.join(deploymentsDir(net), 'LAUNCH-LOG.md');
}

export function appendLaunchLog(net: NetworkName, line: string): void {
  const p = launchLogPath(net);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, `# AGENT CHAIN launch log — ${net}\n\nAppend-only. Timestamps are UTC. BNB = gasUsed × effectiveGasPrice.\n\n`);
  }
  fs.appendFileSync(p, line.endsWith('\n') ? line : line + '\n');
}

export function logTx(
  net: NetworkName,
  step: string,
  r: { transactionHash: `0x${string}`; gasUsed: bigint; effectiveGasPrice?: bigint; status?: string; blockNumber?: bigint },
  note = '',
): void {
  const fee = r.gasUsed * (r.effectiveGasPrice ?? 0n);
  const bnb = (Number(fee) / 1e18).toFixed(8);
  appendLaunchLog(
    net,
    `- ${new Date().toISOString()} | ${step} | tx \`${r.transactionHash}\` | block ${r.blockNumber ?? '?'} | ${r.status ?? 'success'} | gas ${r.gasUsed} | ${bnb} BNB${note ? ` | ${note}` : ''}`,
  );
}
