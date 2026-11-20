/**
 * Deploys the AGENT CHAIN BSC-side contracts and writes deployments/<network>.json.
 *
 *   npx hardhat run scripts/deploy.ts --network bscTestnet   (chainId 97)
 *   npx hardhat run scripts/deploy.ts --network bsc          (chainId 56)
 *
 * Mainnet (56): uses the real Agent ID, BAB and ANTB addresses.
 * Testnet (97) / local: deploys MockAgentId (public mint) and MockERC20 "tANTB" first,
 *                       because the real Agent ID registry exists on mainnet only.
 *
 * Env: DEPLOYER_PRIVATE_KEY (required for live networks), optional OWNER_ADDRESS
 * (defaults to the deployer), optional BAB_ADDRESS override, optional
 * PER_ADDRESS_CAP / GLOBAL_CAP in whole ANTB (defaults 1 and 500).
 */
import { ethers, network } from "hardhat";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MAINNET } from "../hardhat.config";

type Deployment = {
  network: string;
  chainId: number;
  deployer: string;
  owner: string;
  deployedAt: string;
  contracts: Record<string, string>;
  constructorArgs: Record<string, unknown[]>;
  params: { agentId: string; bab: string; antb: string; perAddressCap: string; globalCap: string };
};

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No deployer signer. Set DEPLOYER_PRIVATE_KEY in .env");
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const owner = process.env.OWNER_ADDRESS?.trim() || deployer.address;
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`[deploy] network=${network.name} chainId=${chainId}`);
  console.log(`[deploy] deployer=${deployer.address} balance=${ethers.formatEther(balance)} BNB owner=${owner}`);

  const perAddressCap = ethers.parseEther(process.env.PER_ADDRESS_CAP ?? "1");
  const globalCap = ethers.parseEther(process.env.GLOBAL_CAP ?? "500");

  const contracts: Record<string, string> = {};
  const constructorArgs: Record<string, unknown[]> = {};

  let agentId: string;
  let bab: string;
  let antb: string;

  if (chainId === 56) {
    agentId = MAINNET.AGENT_ID;
    bab = process.env.BAB_ADDRESS?.trim() || MAINNET.BAB;
    antb = MAINNET.ANTB;
  } else {
    // Testnet / local: mocks.
    const mockAgentId = await (await ethers.getContractFactory("MockAgentId")).deploy();
    await mockAgentId.waitForDeployment();
    agentId = await mockAgentId.getAddress();
    contracts.MockAgentId = agentId;
    constructorArgs.MockAgentId = [];
    console.log(`[deploy] MockAgentId          ${agentId}`);

    const mockAntb = await (await ethers.getContractFactory("MockERC20")).deploy("Test ANTB", "tANTB");
    await mockAntb.waitForDeployment();
    antb = await mockAntb.getAddress();
    contracts.MockERC20 = antb;
    constructorArgs.MockERC20 = ["Test ANTB", "tANTB"];
    console.log(`[deploy] MockERC20 (tANTB)    ${antb}`);

    bab = process.env.BAB_ADDRESS?.trim() || ethers.ZeroAddress;
  }

  // REGISTRY_ADDRESS lets a re-run reuse an AgentRegistryMirror that already landed (e.g. after an RPC hiccup).
  if (process.env.REGISTRY_ADDRESS?.trim()) {
    contracts.AgentRegistryMirror = ethers.getAddress(process.env.REGISTRY_ADDRESS.trim());
    constructorArgs.AgentRegistryMirror = [agentId, bab, owner];
    console.log(`[deploy] AgentRegistryMirror  ${contracts.AgentRegistryMirror} (existing)`);
  } else {
    const registry = await (await ethers.getContractFactory("AgentRegistryMirror")).deploy(agentId, bab, owner);
    await registry.waitForDeployment();
    contracts.AgentRegistryMirror = await registry.getAddress();
    constructorArgs.AgentRegistryMirror = [agentId, bab, owner];
  }
  console.log(`[deploy] AgentRegistryMirror  ${contracts.AgentRegistryMirror}`);

  const seat = await (await ethers.getContractFactory("GenesisSeatClaim")).deploy(agentId, bab, owner);
  await seat.waitForDeployment();
  contracts.GenesisSeatClaim = await seat.getAddress();
  constructorArgs.GenesisSeatClaim = [agentId, bab, owner];
  console.log(`[deploy] GenesisSeatClaim     ${contracts.GenesisSeatClaim}`);

  const bridge = await (
    await ethers.getContractFactory("Bridge")
  ).deploy(antb, agentId, bab, owner, perAddressCap, globalCap);
  await bridge.waitForDeployment();
  contracts.Bridge = await bridge.getAddress();
  constructorArgs.Bridge = [antb, agentId, bab, owner, perAddressCap.toString(), globalCap.toString()];
  console.log(`[deploy] Bridge               ${contracts.Bridge}`);

  // PAUSE_BRIDGE=1 keeps the bridge closed until the L2 inbox exists (Beta launch).
  if (process.env.PAUSE_BRIDGE === "1" && owner.toLowerCase() === deployer.address.toLowerCase()) {
    const tx = await (bridge as unknown as { pause: () => Promise<{ wait: () => Promise<unknown> }> }).pause();
    await tx.wait();
    console.log(`[deploy] Bridge paused (PAUSE_BRIDGE=1)`);
  }

  const out: Deployment = {
    network: network.name,
    chainId,
    deployer: deployer.address,
    owner,
    deployedAt: new Date().toISOString(),
    contracts,
    constructorArgs,
    params: {
      agentId,
      bab,
      antb,
      perAddressCap: perAddressCap.toString(),
      globalCap: globalCap.toString(),
    },
  };
  const dir = join(__dirname, "..", "deployments");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${network.name}.json`);
  writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
  console.log(`[deploy] wrote deployments/${network.name}.json`);
  console.log(`[deploy] next: npx hardhat run scripts/verify.ts --network ${network.name}`);
}

main().catch((err) => {
  console.error("[deploy] failed:", err);
  process.exit(1);
});
