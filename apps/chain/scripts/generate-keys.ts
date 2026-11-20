/**
 * Generate the operational key pairs for AGENT CHAIN.
 *
 *   CHAIN_OWNER_PRIVATE_KEY   deployer of RollupCreator, caller of createRollup, ArbOwner on L2
 *   BATCH_POSTER_PRIVATE_KEY  posts batches to BSC (funded with BNB)
 *   VALIDATOR_PRIVATE_KEY     BoLD staker (funded with BNB + WBNB stake)
 *   SEQUENCER_PRIVATE_KEY     sequencer feed signer / preconfirmation signer (no funds)
 *
 * Private keys are written ONLY to apps/chain/.env (gitignored, mode 0600).
 * Addresses are written to apps/chain/keys/ADDRESSES.md.
 * Existing keys are never overwritten (pass --force to rotate; you will lose access to funded accounts!).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { APP_ROOT, ENV_PATH, optionalEnv, upsertEnv } from './lib/env';

const ROLES: Array<{ env: string; role: string; funding: string }> = [
  { env: 'CHAIN_OWNER_PRIVATE_KEY', role: 'Chain owner / deployer', funding: 'BNB for ~25 contract deployments + createRollup; ANTB/tANTB for retryable fees; later: ArbOwner calls on L2 (ANTB)' },
  { env: 'BATCH_POSTER_PRIVATE_KEY', role: 'Batch poster', funding: 'BNB (continuous: calldata batches to SequencerInbox)' },
  { env: 'VALIDATOR_PRIVATE_KEY', role: 'Validator / BoLD staker', funding: 'BNB for assertions + WBNB base stake (0.01 testnet / 1 mainnet)' },
  { env: 'SEQUENCER_PRIVATE_KEY', role: 'Sequencer (feed signer)', funding: 'none' },
];

function main() {
  const force = process.argv.includes('--force');
  const written: Record<string, string> = {};
  const rows: Array<{ role: string; env: string; address: string; funding: string; fresh: boolean }> = [];

  for (const r of ROLES) {
    const existing = optionalEnv(r.env);
    let pk: `0x${string}`;
    let fresh = false;
    if (existing && !force) {
      pk = (existing.startsWith('0x') ? existing : `0x${existing}`) as `0x${string}`;
    } else {
      pk = generatePrivateKey();
      written[r.env] = pk;
      fresh = true;
    }
    const address = privateKeyToAccount(pk).address;
    rows.push({ role: r.role, env: r.env, address, funding: r.funding, fresh });
  }

  if (Object.keys(written).length > 0) {
    upsertEnv(written);
    console.log(`Wrote ${Object.keys(written).length} new private key(s) to ${ENV_PATH}`);
  } else {
    console.log('All keys already present in .env; nothing generated (use --force to rotate).');
  }

  const keysDir = path.join(APP_ROOT, 'keys');
  fs.mkdirSync(keysDir, { recursive: true });
  const md = [
    '# AGENT CHAIN — operational addresses',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Private keys are **only** in `apps/chain/.env` (gitignored). This file lists public addresses so they can be funded.',
    'The same addresses are used on BSC Testnet (97) and BSC Mainnet (56); fund per network.',
    '',
    '| Role | Env var | Address | Fund with |',
    '|---|---|---|---|',
    ...rows.map((r) => `| ${r.role} | \`${r.env}\` | \`${r.address}\` | ${r.funding} |`),
    '',
    '## Funding checklist (testnet)',
    '',
    '- Chain owner: ≥ 0.5 tBNB (faucet: https://www.bnbchain.org/en/testnet-faucet) + tANTB (mint via deploy-tantb.ts, owner receives initial supply)',
    '- Batch poster: ≥ 0.2 tBNB',
    '- Validator: ≥ 0.1 tBNB + 0.02 WBNB (wrap at 0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd)',
    '',
    '## Funding checklist (mainnet)',
    '',
    '- Chain owner: ≥ 0.15 BNB + ≥ 0.05 ANTB (retryable fees for factory deployment)',
    '- Batch poster: ≥ 0.1 BNB, top up weekly (see RESEARCH.md cost model)',
    '- Validator: ≥ 0.05 BNB + 1.1 WBNB (1 WBNB base stake + buffer; wrap at 0xbb4CdB9CBd36B01bD1cBaEbF2De08d9173bc095c)',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(keysDir, 'ADDRESSES.md'), md);
  console.log(`Wrote ${path.join(keysDir, 'ADDRESSES.md')}`);
  console.log('');
  for (const r of rows) console.log(`${r.fresh ? 'NEW ' : '    '} ${r.role.padEnd(26)} ${r.address}`);
}

main();
