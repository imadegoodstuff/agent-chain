/**
 * Bridge (t)ANTB from BSC into AGENT CHAIN through the ERC20Inbox: approve + depositERC20(amount).
 * The same address receives the amount as native balance on the L2 (after the delayed-inbox finality
 * window; typically 1–3 minutes on BSC). Used to give the chain owner gas before set-l2-params.ts.
 *
 *   NETWORK=testnet npx tsx scripts/deposit-native.ts 1.5      # deposit 1.5 tANTB from CHAIN_OWNER key
 *   KEY=BATCH_POSTER_PRIVATE_KEY npx tsx scripts/deposit-native.ts 0.1
 */
import { parseEther, type Address } from 'viem';
import { networkName, privateKeyEnv, optionalEnv } from './lib/env';
import { getNetwork } from './lib/networks';
import { parentClients, assertParentChainId, waitForReceipt } from './lib/clients';
import { requireJson, type RollupFile } from './lib/deployments';
import { logTx } from './lib/launch-log';
import { erc20Abi, erc20InboxAbi } from './lib/precompiles';

async function main() {
  const amountArg = process.argv[2];
  if (!amountArg) throw new Error('usage: tsx scripts/deposit-native.ts <amount in tokens>');
  const amount = parseEther(amountArg);
  const netName = networkName();
  const net = getNetwork(netName);
  const rollup = requireJson<RollupFile>(netName, 'rollup.json', 'Run create-rollup.ts first.');
  const inbox = rollup.coreContracts.inbox as Address;
  const token = rollup.nativeToken as Address;

  const keyName = optionalEnv('KEY', 'CHAIN_OWNER_PRIVATE_KEY')!;
  const { account, publicClient, walletClient } = parentClients(net, privateKeyEnv(keyName));
  await assertParentChainId(publicClient, net.parentChainId);

  const bal = await publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });
  if (bal < amount) throw new Error(`insufficient token balance: have ${bal}, need ${amount}`);
  const allowance = await publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'allowance', args: [account.address, inbox] });
  if (allowance < amount) {
    const h = await walletClient.writeContract({ address: token, abi: erc20Abi, functionName: 'approve', args: [inbox, amount] });
    const ar = await waitForReceipt(publicClient, h);
    if (ar.status !== 'success') throw new Error(`approve reverted: ${h}`);
    logTx(netName, `deposit-native approve ${amountArg} tokens for ERC20Inbox ${inbox}`, ar);
    console.log(`approved inbox ${inbox}: tx ${h}`);
  }
  const h2 = await walletClient.writeContract({ address: inbox, abi: erc20InboxAbi, functionName: 'depositERC20', args: [amount] });
  const r = await waitForReceipt(publicClient, h2);
  logTx(netName, `deposit-native ERC20Inbox.depositERC20(${amountArg}) from ${account.address}`, r, `${amountArg} ANTB bridged to L2`);
  console.log(`depositERC20(${amountArg}) ${r.status}: tx ${h2}. Funds arrive on L2 at ${account.address} once the delayed message is sequenced.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
