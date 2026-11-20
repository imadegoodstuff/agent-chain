/**
 * Resumable port of @arbitrum/chain-sdk 0.28 `deployRollupCreator` (itself a viem port of nitro-contracts v3.2.0
 * scripts/deploymentUtils.ts) for BNB Smart Chain.
 *
 * Differences from the SDK function:
 *   - the five contracts that embed ArbitrumChecker.runningOnArbitrum() come from nitro-bsc/artifacts-bsc/
 *     (gas-capped ArbSys probe; see nitro-bsc/patches and RESEARCH.md §7.12) — all others are the upstream artifacts
 *   - no ArbSys probe from the script either (BSC's eth_call to 0x…64 fails with "deprecated"; BSC is never Arbitrum)
 *   - every deployment is checkpointed in deployments/<network>/creator.progress.json and reused on re-run
 *     (the SDK has no resume: an interrupted run would redeploy ~73M gas worth of contracts)
 *   - explicit gas: eth_estimateGas × 1.15, capped at BSC's EIP-7825 limit 16,777,216; legacy gasPrice tx
 *   - own receipt polling loop (no viem watcher), each tx appended to LAUNCH-LOG.md
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import { encodeDeployData, getAddress, type Abi, type Address, type Hex, type PublicClient, type WalletClient } from 'viem';
import { APP_ROOT, type NetworkName } from './env';
import { deploymentsDir } from './deployments';
import { BSC_TX_GAS_CAP } from './params';
import { logTx } from './launch-log';
import { fmtBnb } from './clients';

type Artifact = { abi: Abi; bytecode: Hex };
type Progress = Record<string, { address: Address; txHash: Hex; gasUsed: string }>;

const sdkRequire = createRequire(require.resolve('@arbitrum/chain-sdk'));

/** Contracts rebuilt with the BSC patch (must match scripts/build-nitro-bsc.ts PATCHED_CONTRACTS). */
export const BSC_PATCHED = ['SequencerInbox', 'RollupAdminLogic', 'RollupUserLogic', 'RollupEventInbox', 'ERC20RollupEventInbox'] as const;

function upstream(p: string): Artifact {
  const a = sdkRequire(p);
  const bytecode = typeof a.bytecode === 'string' ? a.bytecode : a.bytecode.object; // Reader4844 is a forge/yul artifact
  return { abi: a.abi ?? [], bytecode };
}
function patched(name: (typeof BSC_PATCHED)[number]): Artifact {
  const p = path.join(APP_ROOT, 'nitro-bsc', 'artifacts-bsc', `${name}.json`);
  if (!fs.existsSync(p)) throw new Error(`${p} missing — run: npx tsx scripts/build-nitro-bsc.ts`);
  const a = JSON.parse(fs.readFileSync(p, 'utf8'));
  return { abi: a.abi, bytecode: a.bytecode };
}

const ART = {
  Reader4844: () => upstream('@arbitrum/nitro-contracts/out/yul/Reader4844.yul/Reader4844.json'),
  Bridge: () => upstream('@arbitrum/nitro-contracts/build/contracts/src/bridge/Bridge.sol/Bridge.json'),
  SequencerInbox: () => patched('SequencerInbox'),
  Inbox: () => upstream('@arbitrum/nitro-contracts/build/contracts/src/bridge/Inbox.sol/Inbox.json'),
  RollupEventInbox: () => patched('RollupEventInbox'),
  Outbox: () => upstream('@arbitrum/nitro-contracts/build/contracts/src/bridge/Outbox.sol/Outbox.json'),
  ERC20Bridge: () => upstream('@arbitrum/nitro-contracts/build/contracts/src/bridge/ERC20Bridge.sol/ERC20Bridge.json'),
  ERC20Inbox: () => upstream('@arbitrum/nitro-contracts/build/contracts/src/bridge/ERC20Inbox.sol/ERC20Inbox.json'),
  ERC20RollupEventInbox: () => patched('ERC20RollupEventInbox'),
  ERC20Outbox: () => upstream('@arbitrum/nitro-contracts/build/contracts/src/bridge/ERC20Outbox.sol/ERC20Outbox.json'),
  BridgeCreator: () => upstream('@arbitrum/nitro-contracts/build/contracts/src/rollup/BridgeCreator.sol/BridgeCreator.json'),
  OneStepProver0: () => upstream('@arbitrum/nitro-contracts/build/contracts/src/osp/OneStepProver0.sol/OneStepProver0.json'),
  OneStepProverMemory: () => upstream('@arbitrum/nitro-contracts/build/contracts/src/osp/OneStepProverMemory.sol/OneStepProverMemory.json'),
  OneStepProverMath: () => upstream('@arbitrum/nitro-contracts/build/contracts/src/osp/OneStepProverMath.sol/OneStepProverMath.json'),
  OneStepProverHostIo: () => upstream('@arbitrum/nitro-contracts/build/contracts/src/osp/OneStepProverHostIo.sol/OneStepProverHostIo.json'),
  OneStepProofEntry: () => upstream('@arbitrum/nitro-contracts/build/contracts/src/osp/OneStepProofEntry.sol/OneStepProofEntry.json'),
  EdgeChallengeManager: () => upstream('@arbitrum/nitro-contracts/build/contracts/src/challengeV2/EdgeChallengeManager.sol/EdgeChallengeManager.json'),
  RollupAdminLogic: () => patched('RollupAdminLogic'),
  RollupUserLogic: () => patched('RollupUserLogic'),
  UpgradeExecutor: () => upstream('@offchainlabs/upgrade-executor/build/contracts/src/UpgradeExecutor.sol/UpgradeExecutor.json'),
  ValidatorWalletCreator: () => upstream('@arbitrum/nitro-contracts/build/contracts/src/rollup/ValidatorWalletCreator.sol/ValidatorWalletCreator.json'),
  DeployHelper: () => upstream('@arbitrum/nitro-contracts/build/contracts/src/rollup/DeployHelper.sol/DeployHelper.json'),
  RollupCreator: () => upstream('@arbitrum/nitro-contracts/build/contracts/src/rollup/RollupCreator.sol/RollupCreator.json'),
};

export type RollupCreatorDeployment = {
  rollupCreator: Address;
  bridgeCreator: Address;
  osp: Address;
  challengeManager: Address;
  rollupAdminLogic: Address;
  rollupUserLogic: Address;
  upgradeExecutor: Address;
  validatorWalletCreator: Address;
  deployHelper: Address;
  transactionHash: Hex;
  reader4844: Address;
  templates: Record<string, Address>;
  progress: Progress;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function deployRollupCreatorBsc(opts: {
  net: NetworkName;
  publicClient: PublicClient;
  walletClient: WalletClient;
  account: { address: Address };
  maxDataSize: bigint;
  log?: (s: string) => void;
}): Promise<RollupCreatorDeployment> {
  const { net, publicClient, walletClient, account, maxDataSize } = opts;
  const log = opts.log ?? console.log;
  const progressPath = path.join(deploymentsDir(net), 'creator.progress.json');
  const progress: Progress = fs.existsSync(progressPath) ? JSON.parse(fs.readFileSync(progressPath, 'utf8')) : {};
  const save = () => fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2) + '\n');

  // Keep the event loop alive during long polls (a silent exit was observed with viem's watcher on Windows).
  const keepalive = setInterval(() => {}, 10_000);

  async function waitReceipt(hash: Hex) {
    for (let i = 0; i < 600; i++) {
      try {
        const r = await publicClient.getTransactionReceipt({ hash });
        if (r) return r;
      } catch (e) {
        if (!(e as Error).message?.match(/could not be found|not found/i)) log(`  (receipt poll error: ${(e as Error).message.split('\n')[0]})`);
      }
      await sleep(1_000);
    }
    throw new Error(`timeout waiting for receipt ${hash}`);
  }

  async function deploy(label: string, art: Artifact, args?: readonly unknown[]): Promise<Address> {
    const done = progress[label];
    if (done) {
      const code = await publicClient.getBytecode({ address: done.address });
      if (code && code !== '0x') {
        log(`  reuse ${label} at ${done.address} (tx ${done.txHash})`);
        return done.address;
      }
      log(`  checkpoint for ${label} has no code on chain, redeploying`);
    }
    const data = encodeDeployData({ abi: art.abi, bytecode: art.bytecode, ...(args ? { args } : {}) } as never);
    const est = await publicClient.estimateGas({ account: account.address, data });
    let gas = (est * 115n) / 100n;
    if (gas > BSC_TX_GAS_CAP) {
      if (est > BSC_TX_GAS_CAP) throw new Error(`${label}: estimated ${est} gas exceeds the BSC per-tx cap ${BSC_TX_GAS_CAP}`);
      gas = BSC_TX_GAS_CAP;
    }
    const gasPrice = await publicClient.getGasPrice();
    const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: 'pending' });
    const hash = await walletClient.sendTransaction({ account: walletClient.account!, chain: walletClient.chain, data, gas, gasPrice, nonce } as never);
    log(`  ${label}: tx ${hash} (gas limit ${gas}, est ${est}, nonce ${nonce})`);
    const r = await waitReceipt(hash);
    if (r.status !== 'success' || !r.contractAddress) throw new Error(`${label} deployment ${hash} reverted`);
    const address = getAddress(r.contractAddress);
    progress[label] = { address, txHash: hash, gasUsed: r.gasUsed.toString() };
    save();
    logTx(net, `deploy:creator ${label} → ${address}`, r);
    log(`  ${label} at ${address} (gas ${r.gasUsed}, ${fmtBnb(r.gasUsed * (r.effectiveGasPrice ?? gasPrice))} BNB)`);
    return address;
  }

  try {
    // BSC is never an Arbitrum chain → Reader4844 is deployed (the SDK skips it only on Arbitrum parents).
    const reader4844 = await deploy('Reader4844', ART.Reader4844());

    const eth = {
      bridge: await deploy('Bridge', ART.Bridge()),
      sequencerInbox: await deploy('SequencerInbox (eth)', ART.SequencerInbox(), [maxDataSize, reader4844, false, false]),
      delayBufferableSequencerInbox: await deploy('SequencerInbox (eth, delay-bufferable)', ART.SequencerInbox(), [maxDataSize, reader4844, false, true]),
      inbox: await deploy('Inbox', ART.Inbox(), [maxDataSize]),
      rollupEventInbox: await deploy('RollupEventInbox', ART.RollupEventInbox()),
      outbox: await deploy('Outbox', ART.Outbox()),
    };
    const erc20 = {
      bridge: await deploy('ERC20Bridge', ART.ERC20Bridge()),
      sequencerInbox: await deploy('SequencerInbox (erc20)', ART.SequencerInbox(), [maxDataSize, reader4844, true, false]),
      delayBufferableSequencerInbox: await deploy('SequencerInbox (erc20, delay-bufferable)', ART.SequencerInbox(), [maxDataSize, reader4844, true, true]),
      inbox: await deploy('ERC20Inbox', ART.ERC20Inbox(), [maxDataSize]),
      rollupEventInbox: await deploy('ERC20RollupEventInbox', ART.ERC20RollupEventInbox()),
      outbox: await deploy('ERC20Outbox', ART.ERC20Outbox()),
    };
    // Field order must match BridgeCreator's BridgeTemplates tuple (bridge, sequencerInbox, delayBufferableSequencerInbox, inbox, rollupEventInbox, outbox).
    const toTuple = (t: typeof eth) => [t.bridge, t.sequencerInbox, t.delayBufferableSequencerInbox, t.inbox, t.rollupEventInbox, t.outbox];
    const bridgeCreator = await deploy('BridgeCreator', ART.BridgeCreator(), [toTuple(eth), toTuple(erc20)]);

    const prover0 = await deploy('OneStepProver0', ART.OneStepProver0());
    const proverMem = await deploy('OneStepProverMemory', ART.OneStepProverMemory());
    const proverMath = await deploy('OneStepProverMath', ART.OneStepProverMath());
    const proverHostIo = await deploy('OneStepProverHostIo', ART.OneStepProverHostIo(), ['0x0000000000000000000000000000000000000000']);
    const osp = await deploy('OneStepProofEntry', ART.OneStepProofEntry(), [prover0, proverMem, proverMath, proverHostIo]);

    const challengeManager = await deploy('EdgeChallengeManager', ART.EdgeChallengeManager());
    const rollupAdminLogic = await deploy('RollupAdminLogic', ART.RollupAdminLogic());
    const rollupUserLogic = await deploy('RollupUserLogic', ART.RollupUserLogic());
    const upgradeExecutor = await deploy('UpgradeExecutor', ART.UpgradeExecutor());
    const validatorWalletCreator = await deploy('ValidatorWalletCreator', ART.ValidatorWalletCreator());
    const deployHelper = await deploy('DeployHelper', ART.DeployHelper());
    const rollupCreator = await deploy('RollupCreator', ART.RollupCreator(), [
      account.address,
      bridgeCreator,
      osp,
      challengeManager,
      rollupAdminLogic,
      rollupUserLogic,
      upgradeExecutor,
      validatorWalletCreator,
      deployHelper,
    ]);

    return {
      rollupCreator,
      bridgeCreator,
      osp,
      challengeManager,
      rollupAdminLogic,
      rollupUserLogic,
      upgradeExecutor,
      validatorWalletCreator,
      deployHelper,
      transactionHash: progress['RollupCreator'].txHash,
      reader4844,
      templates: {
        ethBridge: eth.bridge,
        ethSequencerInbox: eth.sequencerInbox,
        ethDelayBufferableSequencerInbox: eth.delayBufferableSequencerInbox,
        ethInbox: eth.inbox,
        ethRollupEventInbox: eth.rollupEventInbox,
        ethOutbox: eth.outbox,
        erc20Bridge: erc20.bridge,
        erc20SequencerInbox: erc20.sequencerInbox,
        erc20DelayBufferableSequencerInbox: erc20.delayBufferableSequencerInbox,
        erc20Inbox: erc20.inbox,
        erc20RollupEventInbox: erc20.rollupEventInbox,
        erc20Outbox: erc20.outbox,
      },
      progress,
    };
  } finally {
    clearInterval(keepalive);
  }
}
