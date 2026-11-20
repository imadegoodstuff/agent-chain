/**
 * Give the BoLD validator its stake: top up BNB from the chain owner (optional) and wrap BNB → WBNB via
 * WBNB.deposit() from the validator key. Targets (README §2 mainnet): ≥ 0.03 WBNB and ≥ 0.05 BNB.
 *
 *   npx tsx scripts/fund-validator-stake.ts [--dry-run]
 *   VALIDATOR_TARGET_WBNB=0.03 VALIDATOR_TARGET_BNB=0.05 npx tsx scripts/fund-validator-stake.ts
 *
 * Idempotent: each leg is skipped when the balance already meets its target. Logs to LAUNCH-LOG.md.
 */
import { encodeFunctionData, parseAbi, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { networkName, privateKeyEnv, optionalEnv } from './lib/env';
import { getNetwork } from './lib/networks';
import { parentClients, assertParentChainId, fmtBnb, waitForReceipt } from './lib/clients';
import { logTx } from './lib/launch-log';

const wbnbAbi = parseAbi(['function deposit() payable', 'function balanceOf(address) view returns (uint256)']);

async function main() {
  const netName = networkName();
  const net = getNetwork(netName);
  if (!net.stakeToken) throw new Error('no stake token (WBNB) for this network');
  const dryRun = process.argv.includes('--dry-run');
  const targetWbnb = parseEther(optionalEnv('VALIDATOR_TARGET_WBNB', '0.03') as `${number}`);
  const targetBnb = parseEther(optionalEnv('VALIDATOR_TARGET_BNB', '0.05') as `${number}`);

  const owner = parentClients(net, privateKeyEnv('CHAIN_OWNER_PRIVATE_KEY'));
  const validator = parentClients(net, privateKeyEnv('VALIDATOR_PRIVATE_KEY'));
  const pc = owner.publicClient;
  await assertParentChainId(pc, net.parentChainId);
  const gasPrice = await pc.getGasPrice();

  const vAddr = validator.account.address;
  const [bnb, wbnb] = await Promise.all([pc.getBalance({ address: vAddr }), pc.readContract({ address: net.stakeToken, abi: wbnbAbi, functionName: 'balanceOf', args: [vAddr] })]);
  console.log(`Validator ${vAddr}: ${fmtBnb(bnb)} BNB, ${fmtBnb(wbnb)} WBNB (targets ${fmtBnb(targetBnb)} BNB + ${fmtBnb(targetWbnb)} WBNB)`);

  const wrapNeeded = wbnb >= targetWbnb ? 0n : targetWbnb - wbnb;
  const wrapGas = 50_000n * gasPrice;
  const bnbNeeded = targetBnb + wrapNeeded + wrapGas;
  const topUp = bnb >= bnbNeeded ? 0n : bnbNeeded - bnb;
  console.log(`Plan: top-up ${fmtBnb(topUp)} BNB from chain owner ${owner.account.address}; wrap ${fmtBnb(wrapNeeded)} BNB → WBNB`);
  if (dryRun) return;

  if (topUp > 0n) {
    const ownerBal = await pc.getBalance({ address: owner.account.address });
    if (ownerBal < topUp + 21_000n * gasPrice) throw new Error(`chain owner has ${fmtBnb(ownerBal)} BNB, needs ${fmtBnb(topUp)}`);
    const h = await owner.walletClient.sendTransaction({ to: vAddr, value: topUp, gas: 21_000n, gasPrice });
    const r = await waitForReceipt(pc, h);
    if (r.status !== 'success') throw new Error(`top-up reverted ${h}`);
    logTx(netName, `fund validator ${vAddr} with ${fmtBnb(topUp)} BNB from chain owner`, r);
    console.log(`top-up tx ${h}`);
  }
  if (wrapNeeded > 0n) {
    const h = await validator.walletClient.sendTransaction({
      to: net.stakeToken,
      value: wrapNeeded,
      data: encodeFunctionData({ abi: wbnbAbi, functionName: 'deposit' }),
      gas: 50_000n,
      gasPrice,
    });
    const r = await waitForReceipt(pc, h);
    if (r.status !== 'success') throw new Error(`WBNB.deposit reverted ${h}`);
    logTx(netName, `validator wraps ${fmtBnb(wrapNeeded)} BNB → WBNB (${net.stakeToken}) for the BoLD stake`, r);
    console.log(`wrap tx ${h}`);
  }
  const [bnb2, wbnb2] = await Promise.all([pc.getBalance({ address: vAddr }), pc.readContract({ address: net.stakeToken, abi: wbnbAbi, functionName: 'balanceOf', args: [vAddr] })]);
  console.log(`Validator now: ${fmtBnb(bnb2)} BNB, ${fmtBnb(wbnb2)} WBNB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
