/**
 * Build the BSC-patched nitro-contracts v3.2.0 artifacts (see nitro-bsc/patches/ArbitrumChecker.sol, RESEARCH §7.12).
 *
 *   npx tsx scripts/build-nitro-bsc.ts
 *
 * 1. copies node_modules/@arbitrum/nitro-contracts/src → nitro-bsc/src (gitignored)
 * 2. overwrites src/libraries/ArbitrumChecker.sol with the patched version
 * 3. `hardhat compile` with nitro-bsc/hardhat.config.ts (upstream compiler settings)
 * 4. writes abi + bytecode of the contracts whose bytecode changes to nitro-bsc/artifacts-bsc/<Name>.json (committed)
 *
 * deploy-creator.ts loads these artifacts in place of the SDK's via scripts/lib/nitro-bsc-patch.ts.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { APP_ROOT } from './lib/env';

const NITRO_SRC = path.join(APP_ROOT, 'node_modules', '@arbitrum', 'nitro-contracts', 'src');
const DIR = path.join(APP_ROOT, 'nitro-bsc');
const SRC = path.join(DIR, 'src');
const OUT = path.join(DIR, 'artifacts-bsc');

/** Contracts whose creation/runtime bytecode embeds ArbitrumChecker.runningOnArbitrum(). */
export const PATCHED_CONTRACTS: Array<{ name: string; source: string }> = [
  { name: 'SequencerInbox', source: 'src/bridge/SequencerInbox.sol' },
  { name: 'RollupAdminLogic', source: 'src/rollup/RollupAdminLogic.sol' },
  { name: 'RollupUserLogic', source: 'src/rollup/RollupUserLogic.sol' },
  { name: 'RollupEventInbox', source: 'src/rollup/RollupEventInbox.sol' },
  { name: 'ERC20RollupEventInbox', source: 'src/rollup/ERC20RollupEventInbox.sol' },
];

/** Directories that are not needed for the factory set (tests, mocks) — skipped to keep the compile small. */
const SKIP_DIRS = new Set(['mocks', 'test-helpers']);

function copyDir(from: string, to: string) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const f = path.join(from, e.name);
    const t = path.join(to, e.name);
    if (e.isDirectory()) copyDir(f, t);
    else fs.copyFileSync(f, t);
  }
}

function main() {
  const version = JSON.parse(fs.readFileSync(path.join(NITRO_SRC, '..', 'package.json'), 'utf8')).version as string;
  if (version !== '3.2.0') throw new Error(`expected @arbitrum/nitro-contracts 3.2.0, found ${version}`);

  fs.rmSync(SRC, { recursive: true, force: true });
  fs.mkdirSync(SRC, { recursive: true });
  for (const e of fs.readdirSync(NITRO_SRC, { withFileTypes: true })) {
    if (e.isDirectory() && SKIP_DIRS.has(e.name)) continue;
    const f = path.join(NITRO_SRC, e.name);
    const t = path.join(SRC, e.name);
    if (e.isDirectory()) copyDir(f, t);
    else fs.copyFileSync(f, t);
  }
  fs.copyFileSync(path.join(DIR, 'patches', 'ArbitrumChecker.sol'), path.join(SRC, 'libraries', 'ArbitrumChecker.sol'));
  console.log(`Copied nitro-contracts v${version} src → ${SRC} (patched libraries/ArbitrumChecker.sol)`);

  execSync(`npx hardhat --config nitro-bsc/hardhat.config.ts compile`, { cwd: APP_ROOT, stdio: 'inherit' });

  fs.mkdirSync(OUT, { recursive: true });
  for (const c of PATCHED_CONTRACTS) {
    const p = path.join(DIR, 'artifacts', c.source, `${c.name}.json`);
    const art = JSON.parse(fs.readFileSync(p, 'utf8'));
    const deployedLen = (art.deployedBytecode.length - 2) / 2;
    if (deployedLen > 24_576) throw new Error(`${c.name} runtime bytecode ${deployedLen} B exceeds EIP-170`);
    const out = {
      _comment: `nitro-contracts v${version} ${c.name} recompiled with nitro-bsc/patches/ArbitrumChecker.sol (BSC parent). solc 0.8.17, london, bytecodeHash none.`,
      contractName: c.name,
      sourceName: c.source,
      abi: art.abi,
      bytecode: art.bytecode,
      deployedBytecode: art.deployedBytecode,
    };
    fs.writeFileSync(path.join(OUT, `${c.name}.json`), JSON.stringify(out) + '\n');
    console.log(`${c.name}: runtime ${deployedLen} B → ${path.join(OUT, `${c.name}.json`)}`);
  }
}

main();
