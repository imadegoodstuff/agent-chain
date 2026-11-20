import fs from "node:fs";
import path from "node:path";

export type Deployments = {
  chainId?: number;
  rpc?: string;
  contracts?: { AgentRegistry?: string; GenesisSeat?: string; FeeKeeper?: string };
  deployer?: string;
  deployedAt?: string;
};

function candidates(): string[] {
  const out: string[] = [];
  if (process.env.DEPLOYMENTS_DIR) out.push(path.join(process.env.DEPLOYMENTS_DIR, "devnet.json"));
  out.push(path.join(process.cwd(), "deployments", "devnet.json"));
  out.push(path.join(process.cwd(), "..", "devnet", "deployments", "devnet.json"));
  out.push(path.resolve(process.cwd(), "../../apps/devnet/deployments/devnet.json"));
  return out;
}

let cache: { value: Deployments | null; present: boolean } | null = null;

/** Reads apps/devnet/deployments/devnet.json if present (never throws). */
export function readDeployments(): { value: Deployments | null; present: boolean } {
  if (cache) return cache;
  for (const p of candidates()) {
    try {
      if (fs.existsSync(p)) {
        const value = JSON.parse(fs.readFileSync(p, "utf8")) as Deployments;
        cache = { value, present: true };
        return cache;
      }
    } catch {
      /* ignore */
    }
  }
  cache = { value: null, present: false };
  return cache;
}

/**
 * GenesisSeat address: devnet.json → env → documented deterministic devnet
 * address (deploy.ts: deployer nonce 1). The UI hides seat data if the call fails.
 */
export function genesisSeatAddress(): `0x${string}` | null {
  const d = readDeployments().value;
  const a = d?.contracts?.GenesisSeat ?? process.env.GENESIS_SEAT_ADDRESS ?? process.env.NEXT_PUBLIC_GENESIS_SEAT;
  if (a && /^0x[0-9a-fA-F]{40}$/.test(a)) return a as `0x${string}`;
  return "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
}

export function contractAddresses(): { AgentRegistry: string; GenesisSeat: string; FeeKeeper: string; fromFile: boolean } {
  const d = readDeployments();
  return {
    AgentRegistry: d.value?.contracts?.AgentRegistry ?? "TBA",
    GenesisSeat: d.value?.contracts?.GenesisSeat ?? "TBA",
    FeeKeeper: d.value?.contracts?.FeeKeeper ?? "TBA",
    fromFile: d.present,
  };
}
