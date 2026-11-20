/**
 * Records the live Nitro ERC20Inbox of AGENT CHAIN on the BSC Bridge (informational in Beta; deposits are
 * credited by the relayer, see apps/chain/relayer).
 *
 *   INBOX=0x09A1f23Dc51088949bc043D6A3362d46dEE9b5b6 npx hardhat run scripts/set-inbox.ts --network bsc
 *
 * Owner key = DEPLOYER_PRIVATE_KEY. Idempotent: skips when inbox() already equals INBOX. Writes the tx into
 * deployments/<network>.json under "inbox".
 */
import { ethers, network } from "hardhat";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const inbox = process.env.INBOX;
  if (!inbox || !ethers.isAddress(inbox)) throw new Error("INBOX=<address> required");
  const [owner] = await ethers.getSigners();
  const file = join(__dirname, "..", "deployments", `${network.name}.json`);
  const dep = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown> & { contracts: Record<string, string> };
  const bridge = await ethers.getContractAt("Bridge", dep.contracts.Bridge, owner);

  const current = (await bridge.inbox()) as string;
  console.log(`[bridge] ${dep.contracts.Bridge} owner=${owner.address} inbox=${current}`);
  if (current.toLowerCase() === inbox.toLowerCase()) {
    console.log("[bridge] inbox already set — nothing to do");
    return;
  }
  const tx = await bridge.setInbox(inbox);
  const rcpt = await tx.wait();
  console.log(`[bridge] setInbox(${inbox}) tx=${tx.hash} block=${rcpt?.blockNumber} gasUsed=${rcpt?.gasUsed}`);

  dep.inbox = { address: inbox, tx: tx.hash, block: rcpt?.blockNumber, setAt: new Date().toISOString(), note: "AGENT CHAIN ERC20Inbox on BSC (chain 1119). Informational in Beta: deposits are credited by the relayer." };
  writeFileSync(file, JSON.stringify(dep, null, 2) + "\n");
  console.log(`[bridge] wrote ${file}`);
}

main().catch((e) => {
  console.error("[bridge] failed:", e);
  process.exit(1);
});
