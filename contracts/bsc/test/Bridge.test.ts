import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployAll, GLOBAL_CAP, ONE, PER_ADDRESS_CAP } from "./fixtures";

describe("Bridge (Beta)", () => {
  async function funded() {
    const f = await deployAll();
    const { antb, bridge, holder, holder2, nobody } = f;
    const bridgeAddr = await bridge.getAddress();
    for (const s of [holder, holder2, nobody]) {
      await antb.mint(s.address, ethers.parseEther("1000"));
      await antb.connect(s).approve(bridgeAddr, ethers.MaxUint256);
    }
    return { ...f, bridgeAddr };
  }

  it("constructor sets token, caps and owner", async () => {
    const { bridge, antb, owner } = await loadFixture(funded);
    expect(await bridge.antb()).to.equal(await antb.getAddress());
    expect(await bridge.perAddressCap()).to.equal(PER_ADDRESS_CAP);
    expect(await bridge.globalCap()).to.equal(GLOBAL_CAP);
    expect(await bridge.owner()).to.equal(owner.address);
    expect(await bridge.inbox()).to.equal(ethers.ZeroAddress);
  });

  it("non-holder cannot deposit even with funds + approval", async () => {
    const { bridge, nobody } = await loadFixture(funded);
    await expect(bridge.connect(nobody).deposit(ONE, nobody.address)).to.be.revertedWithCustomError(bridge, "NotAgent");
  });

  it("holder deposits; funds escrowed; event with nonce", async () => {
    const { bridge, bridgeAddr, antb, holder, holder2 } = await loadFixture(funded);
    const half = ONE / 2n;

    await expect(bridge.connect(holder).deposit(half, holder.address))
      .to.emit(bridge, "Deposited")
      .withArgs(holder.address, holder.address, half, 0n);
    await expect(bridge.connect(holder2).deposit(ONE, holder.address))
      .to.emit(bridge, "Deposited")
      .withArgs(holder2.address, holder.address, ONE, 1n);

    expect(await antb.balanceOf(bridgeAddr)).to.equal(half + ONE);
    expect(await bridge.pendingDeposits()).to.equal(half + ONE);
    expect(await bridge.totalDeposited()).to.equal(half + ONE);
    expect(await bridge.depositedBy(holder.address)).to.equal(half);
    expect(await bridge.depositCount()).to.equal(2n);
    expect(await bridge.remainingFor(holder.address)).to.equal(half);
    expect(await bridge.remainingFor(holder2.address)).to.equal(0n);
  });

  it("rejects zero amount and zero recipient", async () => {
    const { bridge, holder } = await loadFixture(funded);
    await expect(bridge.connect(holder).deposit(0, holder.address)).to.be.revertedWithCustomError(bridge, "ZeroAmount");
    await expect(bridge.connect(holder).deposit(ONE, ethers.ZeroAddress)).to.be.revertedWithCustomError(
      bridge,
      "ZeroAddress",
    );
  });

  it("enforces per-address cap cumulatively", async () => {
    const { bridge, holder } = await loadFixture(funded);
    await bridge.connect(holder).deposit(ONE / 2n, holder.address);
    await bridge.connect(holder).deposit(ONE / 2n, holder.address);
    await expect(bridge.connect(holder).deposit(1n, holder.address))
      .to.be.revertedWithCustomError(bridge, "PerAddressCapExceeded")
      .withArgs(holder.address, ONE + 1n, ONE);
  });

  it("enforces global cap", async () => {
    const { bridge, owner, holder, holder2 } = await loadFixture(funded);
    // Lower global cap to 1.5 ANTB so two holders can hit it.
    await bridge.connect(owner).setCaps(ONE, ONE + ONE / 2n);
    await bridge.connect(holder).deposit(ONE, holder.address);
    await expect(bridge.connect(holder2).deposit(ONE, holder2.address))
      .to.be.revertedWithCustomError(bridge, "GlobalCapExceeded")
      .withArgs(ONE * 2n, ONE + ONE / 2n);
    await expect(bridge.connect(holder2).deposit(ONE / 2n, holder2.address)).to.emit(bridge, "Deposited");
    expect(await bridge.remainingGlobal()).to.equal(0n);
  });

  it("owner can raise caps; non-owner cannot", async () => {
    const { bridge, owner, holder, nobody } = await loadFixture(funded);
    await expect(bridge.connect(nobody).setCaps(ONE * 2n, GLOBAL_CAP)).to.be.revertedWithCustomError(
      bridge,
      "OwnableUnauthorizedAccount",
    );
    await expect(bridge.connect(owner).setCaps(ONE * 2n, GLOBAL_CAP))
      .to.emit(bridge, "CapsUpdated")
      .withArgs(ONE * 2n, GLOBAL_CAP);
    await expect(bridge.connect(holder).deposit(ONE * 2n, holder.address)).to.emit(bridge, "Deposited");
  });

  it("pause blocks deposits; unpause restores", async () => {
    const { bridge, owner, holder, nobody } = await loadFixture(funded);
    await expect(bridge.connect(nobody).pause()).to.be.revertedWithCustomError(bridge, "OwnableUnauthorizedAccount");
    await bridge.connect(owner).pause();
    await expect(bridge.connect(holder).deposit(ONE, holder.address)).to.be.revertedWithCustomError(
      bridge,
      "EnforcedPause",
    );
    await bridge.connect(owner).unpause();
    await expect(bridge.connect(holder).deposit(ONE, holder.address)).to.emit(bridge, "Deposited");
  });

  it("withdrawTo (Beta escrow) is owner-only, bounded by escrow balance, and logged", async () => {
    const { bridge, antb, owner, holder, nobody } = await loadFixture(funded);
    await bridge.connect(holder).deposit(ONE, holder.address);

    await expect(bridge.connect(nobody).withdrawTo(nobody.address, ONE)).to.be.revertedWithCustomError(
      bridge,
      "OwnableUnauthorizedAccount",
    );
    await expect(bridge.connect(owner).withdrawTo(owner.address, ONE * 2n))
      .to.be.revertedWithCustomError(bridge, "InsufficientEscrow")
      .withArgs(ONE * 2n, ONE);
    await expect(bridge.connect(owner).withdrawTo(ethers.ZeroAddress, ONE)).to.be.revertedWithCustomError(
      bridge,
      "ZeroAddress",
    );

    const before = await antb.balanceOf(owner.address);
    await expect(bridge.connect(owner).withdrawTo(owner.address, ONE))
      .to.emit(bridge, "EscrowWithdrawn")
      .withArgs(owner.address, ONE);
    expect((await antb.balanceOf(owner.address)) - before).to.equal(ONE);
    expect(await bridge.pendingDeposits()).to.equal(0n);
    expect(await bridge.totalWithdrawn()).to.equal(ONE);
    // Accounting of deposits is unchanged by withdrawals.
    expect(await bridge.totalDeposited()).to.equal(ONE);
  });

  it("setInbox is owner-only and informational", async () => {
    const { bridge, owner, nobody, holder } = await loadFixture(funded);
    const fakeInbox = "0x000000000000000000000000000000000000dEaD";
    await expect(bridge.connect(nobody).setInbox(fakeInbox)).to.be.revertedWithCustomError(
      bridge,
      "OwnableUnauthorizedAccount",
    );
    await expect(bridge.connect(owner).setInbox(fakeInbox))
      .to.emit(bridge, "InboxUpdated")
      .withArgs(ethers.ZeroAddress, fakeInbox);
    expect(await bridge.inbox()).to.equal(fakeInbox);
    // Deposits still escrow in the bridge.
    await bridge.connect(holder).deposit(ONE, holder.address);
    expect(await bridge.pendingDeposits()).to.equal(ONE);
  });
});
