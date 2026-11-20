/**
 * Deploy the Nitro factory contracts (nitro-contracts v3.2.0) to the parent chain (BSC):
 *   Reader4844, 12 bridge templates (ETH + ERC20 flavours), BridgeCreator,
 *   OneStepProver0/Memory/Math/HostIo, OneStepProofEntry, EdgeChallengeManager,
 *   RollupAdminLogic, RollupUserLogic, UpgradeExecutor, ValidatorWalletCreator, DeployHelper, RollupCreator.
 *
 * Uses scripts/lib/deploy-rollup-creator-bsc.ts — a resumable port of @arbitrum/chain-sdk 0.28 `deployRollupCreator`
 * (same contracts, same order, same constructor args) with two BSC-specific changes:
 *   1. SequencerInbox, RollupAdminLogic, RollupUserLogic, RollupEventInbox, ERC20RollupEventInbox are the
 *      BSC-patched builds from nitro-bsc/ (ArbitrumChecker gas cap; RESEARCH.md §7.12) — stock v3.2.0 cannot be
 *      deployed on BSC because address(100) is a retired BSC precompile that burns all forwarded gas.
 *   2. progress is checkpointed in deployments/<network>/creator.progress.json so an interrupted run resumes.
 *
 * BSC has no canonical RollupCreator, so every AGENT CHAIN network owns its own factory.
 * maxDataSize = 117964 (L1-parent value) is baked into the SequencerInbox templates here and MUST be
 * passed again to createRollup.
 *
 * Writes: deployments/<network>/creator.json
 */
import { deployWeth } from '@arbitrum/chain-sdk';
import { networkName, deployerPrivateKey } from './lib/env';
import { getNetwork } from './lib/networks';
import { parentClients, assertParentChainId, fmtBnb } from './lib/clients';
import { MAX_DATA_SIZE } from './lib/params';
import { readJson, writeJson, type CreatorFile, type TokensFile } from './lib/deployments';
import { appendLaunchLog } from './lib/launch-log';
import { deployRollupCreatorBsc, BSC_PATCHED } from './lib/deploy-rollup-creator-bsc';

async function main() {
  const netName = networkName();
  const net = getNetwork(netName);
  const { account, publicClient, walletClient } = parentClients(net, deployerPrivateKey());
  await assertParentChainId(publicClient, net.parentChainId);

  const existing = readJson<CreatorFile>(netName, 'creator.json');
  if (existing && !process.argv.includes('--force')) {
    console.log(`RollupCreator already deployed at ${existing.rollupCreator} (deployments/${netName}/creator.json). Use --force to redeploy.`);
    return;
  }

  const balance = await publicClient.getBalance({ address: account.address });
  const gasPrice = await publicClient.getGasPrice();
  console.log(`Deployer ${account.address} on ${net.parentName}; balance ${fmtBnb(balance)} ${net.parentSymbol}; gas price ${gasPrice} wei`);
  // Measured on the local dry-run: ~73M gas total. At 0.05 gwei on BSC that is ~0.0037 BNB; keep a margin.
  const needWei = 80_000_000n * gasPrice;
  if (balance < needWei) {
    throw new Error(`Insufficient balance: need ≈ ${fmtBnb(needWei)} ${net.parentSymbol} for ~80M gas at current gas price`);
  }
  if (net.isMainnet && gasPrice > 1_000_000_000n) {
    throw new Error(`BSC gas price is ${Number(gasPrice) / 1e9} gwei (> 1 gwei). Wait for it to come down and retry.`);
  }

  // 1) Stake token: WBNB on BSC; on the local fake-BSC deploy a WETH9.
  let weth = net.stakeToken;
  if (!weth) {
    console.log('No WBNB on this parent — deploying WETH9 as stake token (local only) ...');
    const r = await deployWeth({ walletClient });
    weth = r.weth;
    console.log(`WETH9 at ${weth} (tx ${r.transactionHash})`);
    const tokens = readJson<TokensFile>(netName, 'tokens.json');
    if (tokens) writeJson(netName, 'tokens.json', { ...tokens, weth });
  }

  // 2) The factory set (resumable).
  console.log(`Deploying nitro-contracts v3.2.0 factory set with maxDataSize=${MAX_DATA_SIZE} (BSC-patched: ${BSC_PATCHED.join(', ')}) ...`);
  const startedAt = new Date().toISOString();
  const result = await deployRollupCreatorBsc({ net: netName, publicClient, walletClient, account, maxDataSize: MAX_DATA_SIZE });

  let gasUsed = 0n;
  for (const p of Object.values(result.progress)) gasUsed += BigInt(p.gasUsed);
  const txCount = Object.keys(result.progress).length;
  console.log(`Done: ${txCount} contracts, ${gasUsed} gas total, ≈ ${fmtBnb(gasUsed * gasPrice)} ${net.parentSymbol} at ${Number(gasPrice) / 1e9} gwei`);
  appendLaunchLog(netName, `- ${new Date().toISOString()} | deploy:creator complete (started ${startedAt}) | ${txCount} contracts | gas ${gasUsed} | ≈ ${fmtBnb(gasUsed * gasPrice)} ${net.parentSymbol} | rollupCreator ${result.rollupCreator}`);

  const { progress, templates, reader4844, ...core } = result;
  const file: CreatorFile = {
    network: netName,
    parentChainId: net.parentChainId,
    nitroContractsVersion: 'v3.2.0',
    bscPatchedContracts: [...BSC_PATCHED],
    maxDataSize: MAX_DATA_SIZE.toString(),
    ...core,
    reader4844,
    templates,
    weth,
    deployer: account.address,
    deployedAt: new Date().toISOString(),
    gasUsedTotal: gasUsed.toString(),
    txHashes: Object.fromEntries(Object.entries(progress).map(([k, v]) => [k, v.txHash])),
  };
  console.log(`Wrote ${writeJson(netName, 'creator.json', file)}`);
  console.log(JSON.stringify(core, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
