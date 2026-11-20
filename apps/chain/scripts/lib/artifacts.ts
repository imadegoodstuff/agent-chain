import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Abi, Hex } from 'viem';
import { APP_ROOT } from './env';

export type Artifact = { abi: Abi; bytecode: Hex; contractName: string };

/** Load a Hardhat artifact compiled from ./contracts (run `npm run hardhat:compile` first). */
export function loadArtifact(contractName: string): Artifact {
  const p = path.join(APP_ROOT, 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(p)) {
    throw new Error(`Artifact ${p} not found. Run: npm run hardhat:compile`);
  }
  const json = JSON.parse(fs.readFileSync(p, 'utf8'));
  return { abi: json.abi as Abi, bytecode: json.bytecode as Hex, contractName };
}
