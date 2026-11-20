/**
 * Produce the files the Nitro node needs from the createRollup outputs:
 *
 *   deployments/<network>/chain-info.json   → `--chain.info-files` (array with one chain entry)
 *   deployments/<network>/node-config.json  → rendered node config (secrets still as ${PLACEHOLDERS};
 *                                              the Docker entrypoint fills them from Fly secrets)
 *
 * Also prints the `fly secrets set` command for CHAIN_INFO_JSON.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { APP_ROOT, networkName } from './lib/env';
import { getNetwork } from './lib/networks';
import { requireJson, writeJson, type RollupFile } from './lib/deployments';

export type ChainInfoEntry = {
  'chain-id': number;
  'parent-chain-id': number;
  'parent-chain-is-arbitrum': boolean;
  'chain-name': string;
  'chain-config': unknown;
  'sequencer-url'?: string;
  'feed-url'?: string;
  'rollup': {
    'bridge': string;
    'inbox': string;
    'sequencer-inbox': string;
    'rollup': string;
    'validator-utils'?: string;
    'validator-wallet-creator': string;
    'stake-token': string;
    'deployed-at': number;
  };
};

function main() {
  const netName = networkName();
  const net = getNetwork(netName);
  const rollup = requireJson<RollupFile>(netName, 'rollup.json', 'Run create-rollup.ts first.');
  const cc = rollup.coreContracts;

  const entry: ChainInfoEntry = {
    'chain-id': rollup.childChainId,
    'parent-chain-id': rollup.parentChainId,
    'parent-chain-is-arbitrum': false,
    'chain-name': rollup.chainName,
    'chain-config': rollup.chainConfig,
    'rollup': {
      'bridge': cc.bridge as string,
      'inbox': cc.inbox as string,
      'sequencer-inbox': cc.sequencerInbox as string,
      'rollup': cc.rollup as string,
      ...(cc.validatorUtils ? { 'validator-utils': cc.validatorUtils as string } : {}),
      'validator-wallet-creator': cc.validatorWalletCreator as string,
      'stake-token': rollup.stakeToken,
      'deployed-at': rollup.deployedAtBlockNumber,
    },
  };
  const chainInfo = [entry];
  const p = writeJson(netName, 'chain-info.json', chainInfo);
  console.log(`Wrote ${p}`);

  // Render node config from the template for this network (non-secret values only).
  const tplPath = path.join(APP_ROOT, 'config', `node-config.${netName === 'local' ? 'testnet' : netName}.json`);
  if (fs.existsSync(tplPath)) {
    const tpl = fs.readFileSync(tplPath, 'utf8');
    // Only the chain name is rendered here; RPC URL (may carry an API key) and private keys stay as
    // ${PLACEHOLDERS} and are filled from Fly secrets by node/entrypoint.sh at container start.
    const rendered = tpl.replace(/\$\{CHAIN_NAME\}/g, rollup.chainName);
    const outPath = path.join(APP_ROOT, 'deployments', netName, 'node-config.json');
    fs.writeFileSync(outPath, rendered);
    console.log(`Wrote ${outPath} (RPC URL and private keys remain as \${...} placeholders for the entrypoint)`);
    void net;
  }

  const compact = JSON.stringify(chainInfo);
  console.log('\nFly secret for the node app (run from apps/chain):');
  console.log(`  fly secrets set -a agentchain-node CHAIN_INFO_JSON='${compact.replace(/'/g, "'\\''")}'`);
}

main();
