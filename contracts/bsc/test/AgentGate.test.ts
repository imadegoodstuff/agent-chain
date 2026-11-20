import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployAll } from "./fixtures";

describe("AgentGate (via AgentRegistryMirror)", () => {
  it("exposes agentId() and bab()", async () => {
    const { registry, agentIdToken, babToken } = await loadFixture(deployAll);
    expect(await registry.agentId()).to.equal(await agentIdToken.getAddress());
    expect(await registry.bab()).to.equal(await babToken.getAddress());
  });

  it("isAgent: Agent ID holder true, BAB-only holder true, nobody false", async () => {
    const { registry, holder, babOnly, nobody } = await loadFixture(deployAll);
    expect(await registry.isAgent(holder.address)).to.equal(true);
    expect(await registry.isAgent(babOnly.address)).to.equal(true);
    expect(await registry.isAgent(nobody.address)).to.equal(false);
  });

  it("owner can disable BAB with setBab(0); non-owner cannot", async () => {
    const { registry, owner, babOnly, nobody, babToken } = await loadFixture(deployAll);
    await expect(registry.connect(nobody).setBab(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      registry,
      "OwnableUnauthorizedAccount",
    );
    await expect(registry.connect(owner).setBab(ethers.ZeroAddress))
      .to.emit(registry, "BabUpdated")
      .withArgs(await babToken.getAddress(), ethers.ZeroAddress);
    expect(await registry.bab()).to.equal(ethers.ZeroAddress);
    expect(await registry.isAgent(babOnly.address)).to.equal(false);
  });

  it("rejects zero Agent ID address in constructor", async () => {
    const [owner] = await ethers.getSigners();
    const f = await ethers.getContractFactory("AgentRegistryMirror");
    await expect(f.deploy(ethers.ZeroAddress, ethers.ZeroAddress, owner.address)).to.be.revertedWithCustomError(
      f,
      "ZeroAddress",
    );
  });
});
