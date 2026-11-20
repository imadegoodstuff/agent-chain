/**
 * Configure AGENT CHAIN's ArbOS parameters after launch, via the ArbOwner precompile (0x70) on the L2.
 * Signer = CHAIN_OWNER_PRIVATE_KEY (InitialChainOwner). Needs a little (t)ANTB on the L2 for gas
 * (bridge it with deposit-native.ts first).
 *
 * Parameters (SPEC §3 fee model + RESEARCH.md §6):
 *   setMinimumL2BaseFee     = USD_PER_MGAS/1e6 ÷ ANTB_USD → wei      (0.045, 97.17 → 463,105,382 wei)
 *   setL2BaseFee            = same value (start exactly at the floor)
 *   setL1PricingRewardRecipient = ops wallet that refunds the batch poster's BNB
 *   setL1PricingRewardRate  = ANTB-wei per L1 data unit ≈ BSC gas price × BNB/ANTB × 1.25
 *   setL1PricePerUnit       = same as reward rate (initial estimate; the dynamic part on BSC is ~0 because block.basefee == 0)
 *   setPerBatchGasCharge    = 21000 + ~ 6,000 gas of SequencerInbox overhead ≈ 27,000 (what a batch costs on top of its bytes)
 *   setNetworkFeeAccount    = NETWORK_FEE_ACCOUNT (sequencer revenue → 40/40/20 split by the treasury)
 *   setInfraFeeAccount      = same account (ArbOS splits "infra" = minimum base fee portion; one treasury receives both)
 *   setSpeedLimit           = 7,000,000 gas/s (Nitro default) — 250 ms blocks → 1.75M gas / block sustained
 *   setMaxTxGasLimit        = 32,000,000 (Nitro default)
 *
 * Re-runnable: each setter is only called when the on-chain value differs. --dry-run prints without sending.
 */
import { createPublicClient, createWalletClient, http, type Address, type Chain, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { networkName, privateKeyEnv, optionalEnv, requireEnv } from './lib/env';
import { getNetwork } from './lib/networks';
import { readJson, type RollupFile } from './lib/deployments';
import { ARB_GAS_INFO, ARB_OWNER, ARB_OWNER_PUBLIC, ARB_SYS, minBaseFeeWei, l1RewardRatePerUnit } from './lib/params';
import { arbGasInfoAbi, arbOwnerAbi, arbOwnerPublicAbi, arbSysAbi } from './lib/precompiles';

const DRY = process.argv.includes('--dry-run');

async function main() {
  const netName = networkName();
  const net = getNetwork(netName);
  const rollup = readJson<RollupFile>(netName, 'rollup.json');
  const l2Url = requireEnv('L2_RPC_URL');

  const owner = privateKeyToAccount(privateKeyEnv('CHAIN_OWNER_PRIVATE_KEY'));
  const chain: Chain = {
    id: net.childChainId,
    name: net.chainName,
    network: net.chainName.toLowerCase().replace(/\s+/g, '-'),
    nativeCurrency: { name: net.isMainnet ? 'Anthropic' : 'Test Anthropic', symbol: net.isMainnet ? 'ANTB' : 'tANTB', decimals: 18 },
    rpcUrls: { default: { http: [l2Url] }, public: { http: [l2Url] } },
  };
  const publicClient = createPublicClient({ chain, transport: http(l2Url) });
  const walletClient = createWalletClient({ chain, transport: http(l2Url), account: owner });

  const l2ChainId = await publicClient.getChainId();
  if (l2ChainId !== net.childChainId) throw new Error(`L2 RPC chainId ${l2ChainId} != expected ${net.childChainId}`);
  const arbosVersion = await publicClient.readContract({ address: ARB_SYS, abi: arbSysAbi, functionName: 'arbOSVersion' });
  const owners = await publicClient.readContract({ address: ARB_OWNER_PUBLIC, abi: arbOwnerPublicAbi, functionName: 'getAllChainOwners' });
  console.log(`L2 chainId ${l2ChainId}, ArbOS ${Number(arbosVersion) - 55}, chain owners: ${owners.join(', ')}`);
  if (!owners.map((a) => a.toLowerCase()).includes(owner.address.toLowerCase())) {
    throw new Error(`${owner.address} is not a chain owner`);
  }
  const bal = await publicClient.getBalance({ address: owner.address });
  console.log(`Owner ${owner.address} L2 balance: ${bal} wei`);
  if (bal === 0n && !DRY) throw new Error('Chain owner has no L2 gas. Run deposit-native.ts first.');

  // ---- targets
  const usdPerMgas = Number(optionalEnv('USD_PER_MGAS', '0.045'));
  const antbUsd = Number(optionalEnv('ANTB_USD_PRICE', '97.17'));
  const bnbUsd = Number(optionalEnv('BNB_USD_PRICE', '565'));
  const bscGasPriceWei = BigInt(optionalEnv('BSC_GAS_PRICE_WEI', net.isMainnet ? '50000000' : '100000000')!); // 0.05 gwei mainnet / 0.1 gwei testnet
  const minBaseFee = minBaseFeeWei(usdPerMgas, antbUsd);
  const rewardRate = l1RewardRatePerUnit(bscGasPriceWei, bnbUsd, antbUsd);
  const rewardRecipient = (optionalEnv('L1_PRICING_REWARD_RECIPIENT') ?? rollup?.batchPosters[0] ?? owner.address) as Address;
  const networkFeeAccount = (optionalEnv('NETWORK_FEE_ACCOUNT') ?? owner.address) as Address;
  const perBatchGasCharge = 27_000n;
  const speedLimit = 7_000_000n;
  const maxTxGasLimit = 32_000_000n;

  console.log('\nTargets:');
  console.log(`  minimum L2 base fee : ${minBaseFee} wei  (= $${usdPerMgas}/Mgas at ANTB=$${antbUsd})`);
  console.log(`  L1 reward rate      : ${rewardRate} ANTB-wei/unit (BSC gas ${bscGasPriceWei} wei, BNB=$${bnbUsd}, ×1.25)`);
  console.log(`  L1 reward recipient : ${rewardRecipient}`);
  console.log(`  network fee account : ${networkFeeAccount}`);

  // ---- current
  const [curMin, curRewardRate, curRewardRecipient, curNetworkFee, curInfraFee, curPerBatch, gasParams] = await Promise.all([
    publicClient.readContract({ address: ARB_GAS_INFO, abi: arbGasInfoAbi, functionName: 'getMinimumGasPrice' }),
    publicClient.readContract({ address: ARB_GAS_INFO, abi: arbGasInfoAbi, functionName: 'getL1RewardRate' }),
    publicClient.readContract({ address: ARB_GAS_INFO, abi: arbGasInfoAbi, functionName: 'getL1RewardRecipient' }),
    publicClient.readContract({ address: ARB_OWNER_PUBLIC, abi: arbOwnerPublicAbi, functionName: 'getNetworkFeeAccount' }),
    publicClient.readContract({ address: ARB_OWNER_PUBLIC, abi: arbOwnerPublicAbi, functionName: 'getInfraFeeAccount' }),
    publicClient.readContract({ address: ARB_GAS_INFO, abi: arbGasInfoAbi, functionName: 'getPerBatchGasCharge' }),
    publicClient.readContract({ address: ARB_GAS_INFO, abi: arbGasInfoAbi, functionName: 'getGasAccountingParams' }),
  ]);
  console.log('\nCurrent:');
  console.log(`  minimum L2 base fee : ${curMin}`);
  console.log(`  L1 reward rate      : ${curRewardRate} → ${curRewardRecipient}`);
  console.log(`  network/infra fee   : ${curNetworkFee} / ${curInfraFee}`);
  console.log(`  per-batch gas charge: ${curPerBatch}; speed limit ${gasParams[0]}; max tx gas ${gasParams[2]}`);

  type Call = { fn: keyof typeof setters; args: readonly unknown[]; label: string; skip: boolean };
  const setters = {
    setMinimumL2BaseFee: 1,
    setL2BaseFee: 1,
    setL1PricingRewardRecipient: 1,
    setL1PricingRewardRate: 1,
    setL1PricePerUnit: 1,
    setPerBatchGasCharge: 1,
    setNetworkFeeAccount: 1,
    setInfraFeeAccount: 1,
    setSpeedLimit: 1,
    setMaxTxGasLimit: 1,
  } as const;

  const calls: Call[] = [
    { fn: 'setMinimumL2BaseFee', args: [minBaseFee], label: `setMinimumL2BaseFee(${minBaseFee})`, skip: curMin === minBaseFee },
    { fn: 'setL2BaseFee', args: [minBaseFee], label: `setL2BaseFee(${minBaseFee})`, skip: curMin === minBaseFee },
    { fn: 'setL1PricingRewardRecipient', args: [rewardRecipient], label: `setL1PricingRewardRecipient(${rewardRecipient})`, skip: curRewardRecipient.toLowerCase() === rewardRecipient.toLowerCase() },
    { fn: 'setL1PricingRewardRate', args: [rewardRate], label: `setL1PricingRewardRate(${rewardRate})`, skip: BigInt(curRewardRate) === rewardRate },
    { fn: 'setL1PricePerUnit', args: [rewardRate], label: `setL1PricePerUnit(${rewardRate})`, skip: false },
    { fn: 'setPerBatchGasCharge', args: [perBatchGasCharge], label: `setPerBatchGasCharge(${perBatchGasCharge})`, skip: BigInt(curPerBatch) === perBatchGasCharge },
    { fn: 'setNetworkFeeAccount', args: [networkFeeAccount], label: `setNetworkFeeAccount(${networkFeeAccount})`, skip: curNetworkFee.toLowerCase() === networkFeeAccount.toLowerCase() },
    { fn: 'setInfraFeeAccount', args: [networkFeeAccount], label: `setInfraFeeAccount(${networkFeeAccount})`, skip: curInfraFee.toLowerCase() === networkFeeAccount.toLowerCase() },
    { fn: 'setSpeedLimit', args: [speedLimit], label: `setSpeedLimit(${speedLimit})`, skip: gasParams[0] === speedLimit },
    { fn: 'setMaxTxGasLimit', args: [maxTxGasLimit], label: `setMaxTxGasLimit(${maxTxGasLimit})`, skip: gasParams[2] === maxTxGasLimit },
  ];

  console.log('');
  for (const c of calls) {
    if (c.skip) {
      console.log(`  = ${c.label} (already set)`);
      continue;
    }
    if (DRY) {
      console.log(`  ~ ${c.label} (dry-run)`);
      continue;
    }
    const hash: Hex = await walletClient.writeContract({
      address: ARB_OWNER,
      abi: arbOwnerAbi,
      functionName: c.fn,
      args: c.args as never,
    });
    const r = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  ${r.status === 'success' ? '✓' : '✗'} ${c.label} tx ${hash}`);
    if (r.status !== 'success') throw new Error(`${c.label} reverted`);
  }
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
