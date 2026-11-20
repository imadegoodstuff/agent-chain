/**
 * Opens the Bridge for the Genesis Deposit window: sets Beta caps and unpauses.
 *
 *   PER_ADDRESS_CAP=0.1 GLOBAL_CAP=100 npx hardhat run scripts/open-bridge.ts --network bsc
 *
 * Reads the Bridge address from deployments/<network>.json. Owner key = DEPLOYER_PRIVATE_KEY.
 */
import { ethers, network } from "hardhat";
import { readFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const [owner] = await ethers.getSigners();
  const file = join(__dirname, "..", "deployments", `${network.name}.json`);
  const dep = JSON.parse(readFileSync(file, "utf8")) as { contracts: Record<string, string> };
  const bridge = await ethers.getContractAt("Bridge", dep.contracts.Bridge, owner);

  const perAddress = ethers.parseEther(process.env.PER_ADDRESS_CAP ?? "0.1");
  const global = ethers.parseEther(process.env.GLOBAL_CAP ?? "100");

  console.log(`[bridge] ${dep.contracts.Bridge} owner=${owner.address}`);
  console.log(`[bridge] current paused=${await bridge.paused()} perAddressCap=${ethers.formatEther(await bridge.perAddressCap())} globalCap=${ethers.formatEther(await bridge.globalCap())}`);

  const tx1 = await bridge.setCaps(perAddress, global);
  await tx1.wait();
  console.log(`[bridge] setCaps(${ethers.formatEther(perAddress)}, ${ethers.formatEther(global)}) tx=${tx1.hash}`);

  if (await bridge.paused()) {
    const tx2 = await bridge.unpause();
    await tx2.wait();
    console.log(`[bridge] unpause tx=${tx2.hash}`);
  }
  console.log(`[bridge] now paused=${await bridge.paused()} perAddressCap=${ethers.formatEther(await bridge.perAddressCap())} globalCap=${ethers.formatEther(await bridge.globalCap())}`);
}

main().catch((e) => {
  console.error("[bridge] failed:", e);
  process.exit(1);
});
