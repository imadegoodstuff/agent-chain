import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

export const APP_ROOT = path.resolve(__dirname, '..', '..');
export const ENV_PATH = path.join(APP_ROOT, '.env');

dotenv.config({ path: ENV_PATH });

export type NetworkName = 'local' | 'testnet' | 'mainnet';

export function networkName(): NetworkName {
  const n = (process.env.NETWORK ?? 'testnet').toLowerCase();
  if (n !== 'local' && n !== 'testnet' && n !== 'mainnet') {
    throw new Error(`NETWORK must be local | testnet | mainnet (got "${n}")`);
  }
  return n;
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Missing required env var ${name} (set it in ${ENV_PATH})`);
  }
  return v.trim();
}

export function optionalEnv(name: string, fallback?: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== '' ? v.trim() : fallback;
}

export function privateKeyEnv(name: string): `0x${string}` {
  const raw = requireEnv(name);
  const hex = raw.startsWith('0x') ? raw : `0x${raw}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hex)) throw new Error(`${name} is not a 32-byte hex private key`);
  return hex as `0x${string}`;
}

/** Deployer key: DEPLOYER_PRIVATE_KEY if set, else CHAIN_OWNER_PRIVATE_KEY. */
export function deployerPrivateKey(): `0x${string}` {
  return optionalEnv('DEPLOYER_PRIVATE_KEY') ? privateKeyEnv('DEPLOYER_PRIVATE_KEY') : privateKeyEnv('CHAIN_OWNER_PRIVATE_KEY');
}

/** Upsert KEY=value lines in .env without touching anything else. Creates the file if missing. */
export function upsertEnv(entries: Record<string, string>): void {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  for (const [key, value] of Object.entries(entries)) {
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(content)) {
      content = content.replace(re, `${key}=${value}`);
    } else {
      if (content.length > 0 && !content.endsWith('\n')) content += '\n';
      content += `${key}=${value}\n`;
    }
    process.env[key] = value;
  }
  fs.writeFileSync(ENV_PATH, content, { encoding: 'utf8', mode: 0o600 });
}
