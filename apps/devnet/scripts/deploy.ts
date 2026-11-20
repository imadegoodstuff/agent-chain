/**
 * Deploys AgentRegistry, GenesisSeat and FeeKeeper to the devnet, seeds them,
 * and writes deployments/devnet.json.
 *
 * Addresses are deterministic: the deployer is always Hardhat account #0 and the
 * three contracts are always created at nonces 0, 1, 2 (in that order). Since the
 * node starts from a fresh in-memory state on every restart, the addresses are
 * identical across restarts:
 *   AgentRegistry 0x5FbDB2315678afecb367f032d93F642f64180aa3  (nonce 0)
 *   GenesisSeat   0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512  (nonce 1)
 *   FeeKeeper     0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0  (nonce 2)
 */
import { ethers, network } from "hardhat";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PUBLIC_RPC = process.env.PUBLIC_RPC_URL ?? "https://agentchain-rpc.fly.dev";

// SPEC section 3: $0.045 per 1,000,000 gas, 1e18-scaled USD per gas.
const USD_PER_GAS = 45_000_000_000n; // 0.045 / 1e6 * 1e18
// ANT IPO-day close 2026-11-19: $97.17, 1e8-scaled.
const ANTB_USD = 9_717_000_000n;

const HANDLES = [
  "alice.ai", "bob.ai", "carol.ai", "dave.ai", "erin.ai",
  "frank.ai", "grace.ai", "heidi.ai", "ivan.ai", "judy.ai",
];

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  const startNonce = await ethers.provider.getTransactionCount(deployer.address);
  console.log(`[deploy] network=${network.name} chainId=${chainId} deployer=${deployer.address} nonce=${startNonce}`);
  if (startNonce !== 0) {
    console.warn("[deploy] WARNING: deployer nonce is not 0 — addresses will differ from the documented ones");
  }

  // 1. Deploy in fixed order (nonce 0, 1, 2).
  const registry = await (await ethers.getContractFactory("AgentRegistry")).deploy();
  await registry.waitForDeployment();
  const seat = await (await ethers.getContractFactory("GenesisSeat")).deploy();
  await seat.waitForDeployment();
  const keeper = await (await ethers.getContractFactory("FeeKeeper")).deploy(USD_PER_GAS, ANTB_USD);
  await keeper.waitForDeployment();

  const addresses = {
    AgentRegistry: await registry.getAddress(),
    GenesisSeat: await seat.getAddress(),
    FeeKeeper: await keeper.getAddress(),
  };
  console.log(`[deploy] AgentRegistry ${addresses.AgentRegistry}`);
  console.log(`[deploy] GenesisSeat   ${addresses.GenesisSeat}`);
  console.log(`[deploy] FeeKeeper     ${addresses.FeeKeeper} minBaseFeeWei=${await keeper.minBaseFeeWei()}`);

  // 2. Register the first 10 accounts with handle hashes keccak256("alice.ai") ...
  for (let i = 0; i < HANDLES.length; i++) {
    const handleHash = ethers.keccak256(ethers.toUtf8Bytes(HANDLES[i]));
    const tx = await registry.register(signers[i].address, handleHash);
    await tx.wait();
  }
  console.log(`[deploy] registered ${HANDLES.length} agents (agentCount=${await registry.agentCount()})`);

  // 3. Mint a Genesis Seat for the first 12 accounts (seatIds 1..12).
  for (let i = 0; i < 12; i++) {
    const tx = await seat.connect(signers[i]).mint();
    await tx.wait();
  }
  console.log(`[deploy] minted seats (totalSeats=${await seat.totalSeats()})`);

  // 4. Write deployments/devnet.json
  const out = {
    chainId,
    rpc: PUBLIC_RPC,
    contracts: addresses,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };
  const dir = join(__dirname, "..", "deployments");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "devnet.json"), JSON.stringify(out, null, 2) + "\n");
  console.log(`[deploy] wrote deployments/devnet.json`);
}

main().catch((err) => {
  console.error("[deploy] failed:", err);
  process.exit(1);
});
