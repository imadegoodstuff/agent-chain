import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployAll } from "./fixtures";

describe("AgentRegistryMirror", () => {
  it("non-holder cannot register", async () => {
    const { registry, nobody } = await loadFixture(deployAll);
    await expect(registry.connect(nobody).register())
      .to.be.revertedWithCustomError(registry, "NotAgent")
      .withArgs(nobody.address);
    expect(await registry.count()).to.equal(0n);
  });

  it("holder registers once with sequential index and timestamp", async () => {
    const { registry, holder, holder2, babOnly } = await loadFixture(deployAll);

    await expect(registry.connect(holder).register())
      .to.emit(registry, "AgentRegistered")
      .withArgs(holder.address, 1n);
    await expect(registry.connect(babOnly).register())
      .to.emit(registry, "AgentRegistered")
      .withArgs(babOnly.address, 2n);
    await expect(registry.connect(holder2).register())
      .to.emit(registry, "AgentRegistered")
      .withArgs(holder2.address, 3n);

    expect(await registry.count()).to.equal(3n);
    expect(await registry.isRegistered(holder.address)).to.equal(true);
    expect(await registry.indexOf(holder.address)).to.equal(1n);
    expect(await registry.agentAt(2)).to.equal(babOnly.address);
    expect(await registry.registeredAt(holder.address)).to.be.greaterThan(0n);
  });

  it("double register reverts", async () => {
    const { registry, holder } = await loadFixture(deployAll);
    await registry.connect(holder).register();
    await expect(registry.connect(holder).register())
      .to.be.revertedWithCustomError(registry, "AlreadyRegistered")
      .withArgs(holder.address);
  });

  it("agentAt reverts out of range; unknown address reads as zero", async () => {
    const { registry, nobody } = await loadFixture(deployAll);
    await expect(registry.agentAt(0)).to.be.revertedWithCustomError(registry, "IndexOutOfRange");
    await expect(registry.agentAt(1)).to.be.revertedWithCustomError(registry, "IndexOutOfRange");
    expect(await registry.isRegistered(nobody.address)).to.equal(false);
    expect(await registry.registeredAt(nobody.address)).to.equal(0n);
  });

  it("has no registerFor(address) entry point", async () => {
    const { registry } = await loadFixture(deployAll);
    expect(registry.interface.getFunction("registerFor(address)")).to.equal(null);
  });
});
