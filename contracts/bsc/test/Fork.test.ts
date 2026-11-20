/**
 * Optional BSC mainnet fork tests. Enabled only when BSC_FORK_URL is set, e.g.
 *
 *   BSC_FORK_URL=https://bsc-rpc.publicnode.com npx hardhat test test/Fork.test.ts
 *
 * Uses the real Agent ID registry and a known Agent ID holder (impersonated). Public
 * RPCs are rate-limited and sometimes non-archive, so this suite is best-effort.
 */
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { MAINNET } from "../hardhat.config";
import { asAny } from "./fixtures";

// First address minted in a block we observed on mainnet (2026-11-19). Any holder works.
const KNOWN_HOLDER = "0x5c15f9db35223641c72f53f42666310619aa8a92";

const describeFork = process.env.BSC_FORK_URL ? describe : describe.skip;

describeFork("BSC mainnet fork", function () {
  this.timeout(300_000);

  async function setup() {
    const [owner] = await ethers.getSigners();
    // Well-known Hardhat accounts have received Agent IDs / BAB tokens on mainnet from
    // strangers, so use a freshly generated key as the "no credential" account.
    const nobody = ethers.Wallet.createRandom().connect(ethers.provider);
    for (const a of [KNOWN_HOLDER, nobody.address]) {
      await network.provider.send("hardhat_setBalance", [a, "0x56BC75E2D63100000"]); // 100 BNB
    }
    await network.provider.send("hardhat_impersonateAccount", [KNOWN_HOLDER]);
    const holder = await ethers.getSigner(KNOWN_HOLDER);

    const registry = asAny(
      await (await ethers.getContractFactory("AgentRegistryMirror")).deploy(MAINNET.AGENT_ID, MAINNET.BAB, owner.address),
    );
    const seat = asAny(
      await (await ethers.getContractFactory("GenesisSeatClaim")).deploy(MAINNET.AGENT_ID, MAINNET.BAB, owner.address),
    );
    return { owner, nobody, holder, registry, seat };
  }

  it("real Agent ID holder passes isAgent; fresh account does not", async () => {
    const { registry, holder, nobody } = await setup();
    const agentId = await ethers.getContractAt("MockAgentId", MAINNET.AGENT_ID); // IERC721 ABI subset
    expect(await agentId.balanceOf(holder.address)).to.be.greaterThan(0n);
    expect(await registry.isAgent(holder.address)).to.equal(true);
    expect(await registry.isAgent(nobody.address)).to.equal(false);
  });

  it("real holder registers and claims a seat; fresh account cannot", async () => {
    const { registry, seat, holder, nobody } = await setup();
    await expect(registry.connect(holder).register()).to.emit(registry, "AgentRegistered").withArgs(holder.address, 1n);
    await expect(seat.connect(holder).claim()).to.emit(seat, "SeatClaimed").withArgs(holder.address, 1n);
    await expect(registry.connect(nobody).register()).to.be.revertedWithCustomError(registry, "NotAgent");
    await expect(seat.connect(nobody).claim()).to.be.revertedWithCustomError(seat, "NotAgent");
  });
});
