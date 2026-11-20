/**
 * Fund the launch roles (chain owner, batch poster, validator) with BNB from the BSC contracts deployer
 * wallet (contracts/bsc/.env → DEPLOYER_PRIVATE_KEY, 0x0F03…583A4C).
 *
 *   npx tsx scripts/fund-roles.ts                 # default amounts: owner 0.09, batch poster 0.03, validator 0.02
 *   npx tsx scripts/fund-roles.ts --dry-run
 *   FUND_OWNER_BNB=0.05 FUND_POSTER_BNB=0 FUND_VALIDATOR_BNB=0 npx tsx scripts/fund-roles.ts
 *
 * Idempotent: a role whose balance already is ≥ its target amount is skipped. Never prints private keys.
 * Uses https://bsc-dataseed.bnbchain.org for sends (RPC_URL env to override). Logs to deployments/<net>/LAUNCH-LOG.md.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { createPublicClient, createWalletClient, http, parseEther, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { APP_ROOT, networkName, privateKeyEnv, optionalEnv } from './lib/env';
import { getNetwork, parentChainObject } from './lib/networks';
import { fmtBnb } from './lib/clients';
import { logTx, appendLaunchLog } from './lib/launch-log';

const TRANSFER_GAS = 21_000n;

function loadBscDeployerKey(): Hex {
  const p = path.resolve(APP_ROOT, '..', '..', 'contracts', 'bsc', '.env');
  if (!fs.existsSync(p)) throw new Error(`contracts/bsc/.env not found at ${p}`);
  const parsed = dotenv.parse(fs.readFileSync(p, 'utf8'));
  const raw = parsed.DEPLOYER_PRIVATE_KEY?.trim();
  if (!raw) throw new Error('DEPLOYER_PRIVATE_KEY missing in contracts/bsc/.env');
  const hex = raw.startsWith('0x') ? raw : `0x${raw}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hex)) throw new Error('contracts/bsc DEPLOYER_PRIVATE_KEY is not a 32-byte hex key');
  return hex as Hex;
}

async function main() {
  const netName = networkName();
  const net = getNetwork(netName);
  if (!net.isMainnet) throw new Error('fund-roles.ts is for NETWORK=mainnet (the BSC deployer wallet only holds mainnet BNB)');
  const dryRun = process.argv.includes('--dry-run');

  const rpcUrl = optionalEnv('RPC_URL', 'https://bsc-dataseed.bnbchain.org')!;
  const chain = parentChainObject({ ...net, parentRpcUrl: rpcUrl });
  const transport = http(rpcUrl, { timeout: 60_000, retryCount: 0 });
  const publicClient = createPublicClient({ chain, transport });
  if ((await publicClient.getChainId()) !== net.parentChainId) throw new Error('RPC is not BSC mainnet');

  const funder = privateKeyToAccount(loadBscDeployerKey());
  const walletClient = createWalletClient({ chain, transport, account: funder });

  const targets: Array<{ role: string; address: Address; bnb: string }> = [
    { role: 'chain owner', address: privateKeyToAccount(privateKeyEnv('CHAIN_OWNER_PRIVATE_KEY')).address, bnb: optionalEnv('FUND_OWNER_BNB', '0.09')! },
    { role: 'batch poster', address: privateKeyToAccount(privateKeyEnv('BATCH_POSTER_PRIVATE_KEY')).address, bnb: optionalEnv('FUND_POSTER_BNB', '0.03')! },
    { role: 'validator', address: privateKeyToAccount(privateKeyEnv('VALIDATOR_PRIVATE_KEY')).address, bnb: optionalEnv('FUND_VALIDATOR_BNB', '0.02')! },
  ];

  const gasPrice = await publicClient.getGasPrice();
  const funderBal = await publicClient.getBalance({ address: funder.address });
  console.log(`Funder ${funder.address}: ${fmtBnb(funderBal)} BNB; gas price ${Number(gasPrice) / 1e9} gwei; rpc ${rpcUrl}`);

  const plan: Array<{ role: string; address: Address; value: bigint }> = [];
  for (const t of targets) {
    const want = parseEther(t.bnb);
    if (want === 0n) continue;
    const have = await publicClient.getBalance({ address: t.address });
    if (have >= want) {
      console.log(`skip ${t.role} ${t.address}: already ${fmtBnb(have)} BNB (target ${t.bnb})`);
      continue;
    }
    plan.push({ role: t.role, address: t.address, value: want });
  }
  const total = plan.reduce((a, p) => a + p.value, 0n) + TRANSFER_GAS * gasPrice * BigInt(plan.length);
  console.log(`Plan: ${plan.map((p) => `${p.role} ← ${fmtBnb(p.value)}`).join(', ') || '(nothing)'}; total ${fmtBnb(total)} BNB`);
  if (plan.length === 0) return;
  if (total > funderBal) throw new Error(`Funder has ${fmtBnb(funderBal)} BNB, needs ${fmtBnb(total)}`);
  if (dryRun) {
    console.log('--dry-run: not sending.');
    return;
  }

  let nonce = await publicClient.getTransactionCount({ address: funder.address, blockTag: 'pending' });
  for (const p of plan) {
    const hash = await walletClient.sendTransaction({ to: p.address, value: p.value, gas: TRANSFER_GAS, gasPrice, nonce: nonce++ });
    console.log(`→ ${p.role} ${p.address} ${fmtBnb(p.value)} BNB: tx ${hash}`);
    const r = await publicClient.waitForTransactionReceipt({ hash });
    if (r.status !== 'success') throw new Error(`transfer to ${p.role} reverted: ${hash}`);
    logTx(netName, `fund ${p.role} ${p.address} with ${fmtBnb(p.value)} BNB (from BSC deployer ${funder.address})`, r);
  }
  const after = await publicClient.getBalance({ address: funder.address });
  appendLaunchLog(netName, `  - funder ${funder.address} balance after funding: ${fmtBnb(after)} BNB`);
  console.log(`Funder balance now ${fmtBnb(after)} BNB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
