/**
 * Create the AGENT CHAIN rollup on BSC via our own RollupCreator (nitro-contracts v3.2.0, BoLD).
 *
 *   - custom gas token  = tANTB (testnet) / ANTB (mainnet), 18 decimals, with a fee-token pricer (mandatory
 *                         for a custom-gas-token *rollup*, i.e. DataAvailabilityCommittee=false)
 *   - stake token       = WBNB (BoLD base stake 0.01 testnet / 1 mainnet)
 *   - ArbOS 61 (Elara), WASM module root consensus-v61
 *   - timing parameters scaled to BSC's 0.45 s blocks (scripts/lib/params.ts)
 *
 * Prerequisites: deployments/<network>/creator.json (deploy-creator.ts), tokens.json (deploy-tantb.ts +
 * deploy-pricer.ts). The deployer must hold ≥ 0.1248 (t)ANTB: custom-gas-token retryable fees for the
 * L2 factory deployment are a constant 0.1248 tokens (chain SDK approves the RollupCreator automatically).
 *
 * Writes: deployments/<network>/rollup.json and config/chain-config.<network>.json (final chain config).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseAbi, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  createRollupEnoughCustomFeeTokenAllowance,
  createRollupPrepareCustomFeeTokenApprovalTransactionRequest,
  createRollupPrepareDeploymentParamsConfig,
  createRollupPrepareTransactionReceipt,
  createRollupPrepareTransactionRequest,
  prepareChainConfig,
} from '@arbitrum/chain-sdk';
import { APP_ROOT, networkName, deployerPrivateKey, privateKeyEnv, optionalEnv } from './lib/env';
import { getNetwork } from './lib/networks';
import { parentClients, assertParentChainId, fmtBnb, waitForReceipt } from './lib/clients';
import { logTx } from './lib/launch-log';
import {
  CREATE_ROLLUP_GAS_LIMIT,
  MAX_DATA_SIZE,
  MAX_FEE_PER_GAS_FOR_RETRYABLES,
  MINI_STAKE_VALUES,
  WASM_MODULE_ROOT_CONSENSUS_V61,
  INITIAL_ARBOS_VERSION,
  baseStakeFor,
  rollupTimingParams,
} from './lib/params';
import { readJson, requireJson, writeJson, bigintReplacer, type CreatorFile, type RollupFile, type TokensFile } from './lib/deployments';

const erc20Abi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]);

async function main() {
  const netName = networkName();
  const net = getNetwork(netName);
  const creator = requireJson<CreatorFile>(netName, 'creator.json', 'Run deploy-creator.ts first.');
  const tokens = readJson<TokensFile>(netName, 'tokens.json');

  const nativeToken = (tokens?.nativeToken ?? net.nativeToken) as Address | undefined;
  if (!nativeToken) throw new Error('nativeToken unknown: run deploy-tantb.ts (testnet) or set ANTB_ADDRESS (mainnet)');
  const feeTokenPricer = tokens?.feeTokenPricer as Address | undefined;
  if (!feeTokenPricer) throw new Error('feeTokenPricer missing: run deploy-pricer.ts first');
  const stakeToken = (net.stakeToken ?? creator.weth) as Address;

  const existing = readJson<RollupFile>(netName, 'rollup.json');
  if (existing && !process.argv.includes('--force')) {
    console.log(`Rollup already created (rollup=${existing.coreContracts.rollup}). Use --force to create another one.`);
    return;
  }

  const { account: deployer, publicClient } = parentClients(net, deployerPrivateKey(), {
    rollupCreator: creator.rollupCreator,
    weth: stakeToken,
  });
  await assertParentChainId(publicClient, net.parentChainId);

  const chainOwner = privateKeyToAccount(privateKeyEnv('CHAIN_OWNER_PRIVATE_KEY')).address;
  const batchPoster = privateKeyToAccount(privateKeyEnv('BATCH_POSTER_PRIVATE_KEY')).address;
  const validator = privateKeyToAccount(privateKeyEnv('VALIDATOR_PRIVATE_KEY')).address;

  // --- sanity: balances
  const bnb = await publicClient.getBalance({ address: deployer.address });
  const [tokBal, tokDec, tokSym] = await Promise.all([
    publicClient.readContract({ address: nativeToken, abi: erc20Abi, functionName: 'balanceOf', args: [deployer.address] }),
    publicClient.readContract({ address: nativeToken, abi: erc20Abi, functionName: 'decimals' }),
    publicClient.readContract({ address: nativeToken, abi: erc20Abi, functionName: 'symbol' }),
  ]);
  console.log(`Deployer ${deployer.address}: ${fmtBnb(bnb)} ${net.parentSymbol}, ${tokBal} ${tokSym}-wei (decimals ${tokDec})`);
  if (tokDec !== 18) throw new Error(`gas token must have 18 decimals (got ${tokDec})`);
  const needTok = 124_800_000_000_000_000n; // 0.1248 tokens (SDK constant for custom-gas-token retryables)
  if (tokBal < needTok) throw new Error(`Deployer needs ≥ 0.1248 ${tokSym} for retryable fees (has ${tokBal} wei)`);

  // --- chain config (Nitro genesis parameters)
  const chainConfig = prepareChainConfig({
    chainId: net.childChainId,
    arbitrum: {
      InitialChainOwner: chainOwner,
      DataAvailabilityCommittee: false, // Rollup mode: calldata to BSC
      InitialArbOSVersion: INITIAL_ARBOS_VERSION,
      MaxCodeSize: 24_576,
      MaxInitCodeSize: 49_152,
    },
  });
  const cfgPath = path.join(APP_ROOT, 'config', `chain-config.${netName}.json`);
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
  fs.writeFileSync(cfgPath, JSON.stringify(chainConfig, null, 2) + '\n');
  console.log(`Wrote ${cfgPath}`);

  // --- RollupCreator.createRollup config
  const timing = rollupTimingParams(net);
  const config = createRollupPrepareDeploymentParamsConfig(publicClient, {
    chainId: BigInt(net.childChainId),
    owner: chainOwner,
    chainConfig,
    stakeToken,
    baseStake: baseStakeFor(net),
    miniStakeValues: [...MINI_STAKE_VALUES],
    loserStakeEscrow: chainOwner,
    wasmModuleRoot: WASM_MODULE_ROOT_CONSENSUS_V61,
    ...timing,
  });

  console.log('createRollup params:');
  console.log(
    JSON.stringify(
      {
        chainId: net.childChainId,
        chainOwner,
        batchPosters: [batchPoster],
        validators: [validator],
        nativeToken,
        feeTokenPricer,
        stakeToken,
        baseStake: config.baseStake,
        wasmModuleRoot: config.wasmModuleRoot,
        maxDataSize: MAX_DATA_SIZE,
        timing,
      },
      bigintReplacer,
      2,
    ),
  );

  if (process.argv.includes('--dry-run')) {
    console.log('--dry-run: not sending.');
    return;
  }

  const startBlock = await publicClient.getBlockNumber({ cacheTime: 0 });

  // 1) Allowance for the custom-gas-token retryable fees (0.1248 tokens), same as the SDK's createRollup().
  const allowanceParams = { nativeToken, account: deployer.address, publicClient, rollupCreatorAddressOverride: creator.rollupCreator };
  if (!(await createRollupEnoughCustomFeeTokenAllowance(allowanceParams))) {
    const approval = await createRollupPrepareCustomFeeTokenApprovalTransactionRequest(allowanceParams);
    const ah = await publicClient.sendRawTransaction({ serializedTransaction: await deployer.signTransaction(approval as never) });
    const ar = await waitForReceipt(publicClient, ah);
    if (ar.status !== 'success') throw new Error(`approval reverted: ${ah}`);
    logTx(netName, `create:rollup approve ${tokSym} (0.1248 retryable fees) for RollupCreator ${creator.rollupCreator}`, ar);
    console.log(`Approved RollupCreator to pull ${tokSym} retryable fees: tx ${ah}`);
  }

  // 2) createRollup with an EXPLICIT gas limit.
  //    BSC enforces EIP-7825 (BEP-652, Mendel hard fork 2026-04-28): any tx with gasLimit > 16,777,216 is
  //    rejected. eth_estimateGas for createRollup over-estimates (~23.3M on the local dry run) while the
  //    actual usage is 7.76M, so the SDK's default path (estimate → send) would be rejected by BSC.
  //    12M = 1.55× measured usage and safely under the cap.
  const txRequest = await createRollupPrepareTransactionRequest({
    params: {
      config,
      batchPosters: [batchPoster],
      validators: [validator],
      nativeToken,
      feeTokenPricer,
      maxDataSize: MAX_DATA_SIZE,
      deployFactoriesToL2: true,
      maxFeePerGasForRetryables: MAX_FEE_PER_GAS_FOR_RETRYABLES,
      batchPosterManager: chainOwner,
    },
    account: deployer.address,
    publicClient,
    rollupCreatorAddressOverride: creator.rollupCreator,
    gasOverrides: { gasLimit: { base: CREATE_ROLLUP_GAS_LIMIT } },
  });
  txRequest.nonce = await publicClient.getTransactionCount({ address: deployer.address, blockTag: 'pending' });

  // Pre-flight: simulate the exact call so a revert is diagnosed before BNB is spent on a 12M-gas tx.
  try {
    await publicClient.call({ account: deployer.address, to: txRequest.to as Address, data: txRequest.data as `0x${string}`, gas: CREATE_ROLLUP_GAS_LIMIT, value: txRequest.value });
    console.log('Pre-flight eth_call of createRollup succeeded.');
  } catch (e) {
    const err = e as Error & { cause?: { data?: unknown; reason?: string; shortMessage?: string } };
    console.error('Pre-flight eth_call of createRollup REVERTED — not sending.');
    console.error(err.cause?.shortMessage ?? err.message);
    if (err.cause?.data) console.error('revert data:', JSON.stringify(err.cause.data));
    throw err;
  }

  console.log(`Sending createRollup with gas limit ${txRequest.gas} (EIP-7825 cap 16,777,216) ...`);
  const txHash = await publicClient.sendRawTransaction({ serializedTransaction: await deployer.signTransaction(txRequest as never) });
  console.log(`createRollup tx ${txHash} sent, waiting for receipt ...`);
  const rawReceipt = await waitForReceipt(publicClient, txHash);
  logTx(netName, `create:rollup RollupCreator.createRollup (chainId ${net.childChainId})`, rawReceipt);
  const transactionReceipt = createRollupPrepareTransactionReceipt(rawReceipt);
  if (transactionReceipt.status !== 'success') {
    throw new Error(`createRollup reverted (tx ${txHash}). Note: identical deployParams revert with a CREATE2 collision (RollupProxy salt = keccak(deployParams)); change a parameter to redeploy.`);
  }
  const coreContracts = transactionReceipt.getCoreContracts();

  console.log(`createRollup tx ${transactionReceipt.transactionHash} gasUsed ${transactionReceipt.gasUsed} (block ${transactionReceipt.blockNumber}, started at ${startBlock})`);
  console.log(JSON.stringify(coreContracts, bigintReplacer, 2));

  const file: RollupFile = {
    network: netName,
    parentChainId: net.parentChainId,
    childChainId: net.childChainId,
    chainName: net.chainName,
    transactionHash: transactionReceipt.transactionHash,
    deployedAtBlockNumber: coreContracts.deployedAtBlockNumber,
    chainOwner,
    batchPosters: [batchPoster],
    validators: [validator],
    stakeToken,
    nativeToken,
    feeTokenPricer,
    wasmModuleRoot: WASM_MODULE_ROOT_CONSENSUS_V61,
    coreContracts: coreContracts as unknown as RollupFile['coreContracts'],
    chainConfig,
    timing: JSON.parse(JSON.stringify(timing, bigintReplacer)),
    gasUsed: transactionReceipt.gasUsed.toString(),
    deployedAt: new Date().toISOString(),
  };
  console.log(`Wrote ${writeJson(netName, 'rollup.json', file)}`);
  if (optionalEnv('L2_RPC_URL')) console.log('Next: npm run write:chain-info');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
