import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { deployAll } from "./fixtures";

describe("GenesisSeatClaim", () => {
  it("metadata: name/symbol", async () => {
    const { seat } = await loadFixture(deployAll);
    expect(await seat.name()).to.equal("AGENT CHAIN Genesis Seat");
    expect(await seat.symbol()).to.equal("SEAT");
  });

  it("non-holder cannot claim", async () => {
    const { seat, nobody } = await loadFixture(deployAll);
    await expect(seat.connect(nobody).claim()).to.be.revertedWithCustomError(seat, "NotAgent");
    expect(await seat.totalSeats()).to.equal(0n);
  });

  it("holders claim sequential seats starting at 1", async () => {
    const { seat, holder, holder2, babOnly } = await loadFixture(deployAll);

    await expect(seat.connect(holder).claim())
      .to.emit(seat, "SeatClaimed")
      .withArgs(holder.address, 1n)
      .and.to.emit(seat, "Transfer")
      .withArgs(ethers.ZeroAddress, holder.address, 1n);
    await expect(seat.connect(holder2).claim()).to.emit(seat, "SeatClaimed").withArgs(holder2.address, 2n);
    await expect(seat.connect(babOnly).claim()).to.emit(seat, "SeatClaimed").withArgs(babOnly.address, 3n);

    expect(await seat.totalSeats()).to.equal(3n);
    expect(await seat.seatOf(holder.address)).to.equal(1n);
    expect(await seat.ownerOf(2)).to.equal(holder2.address);
    expect(await seat.balanceOf(babOnly.address)).to.equal(1n);
  });

  it("double claim reverts", async () => {
    const { seat, holder } = await loadFixture(deployAll);
    await seat.connect(holder).claim();
    await expect(seat.connect(holder).claim())
      .to.be.revertedWithCustomError(seat, "AlreadyClaimed")
      .withArgs(holder.address);
  });

  it("is non-transferable: transferFrom / safeTransferFrom / approve / setApprovalForAll revert", async () => {
    const { seat, holder, holder2 } = await loadFixture(deployAll);
    await seat.connect(holder).claim();

    await expect(seat.connect(holder).transferFrom(holder.address, holder2.address, 1)).to.be.revertedWithCustomError(
      seat,
      "NonTransferable",
    );
    await expect(
      seat.connect(holder)["safeTransferFrom(address,address,uint256)"](holder.address, holder2.address, 1),
    ).to.be.revertedWithCustomError(seat, "NonTransferable");
    await expect(seat.connect(holder).approve(holder2.address, 1)).to.be.revertedWithCustomError(
      seat,
      "NonTransferable",
    );
    await expect(seat.connect(holder).setApprovalForAll(holder2.address, true)).to.be.revertedWithCustomError(
      seat,
      "NonTransferable",
    );
    expect(await seat.ownerOf(1)).to.equal(holder.address);
  });

  it("tokenURI returns on-chain JSON with the seat number", async () => {
    const { seat, holder } = await loadFixture(deployAll);
    await seat.connect(holder).claim();
    const uri = await seat.tokenURI(1);
    expect(uri.startsWith("data:application/json;base64,")).to.equal(true);
    const json = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString("utf8"));
    expect(json.name).to.equal("Genesis Seat #1");
    expect(json.attributes[0].value).to.equal(1);
    expect(json.image.startsWith("data:image/svg+xml;base64,")).to.equal(true);
    const svg = Buffer.from(json.image.split(",")[1], "base64").toString("utf8");
    expect(svg).to.contain("SEAT #1");
    await expect(seat.tokenURI(2)).to.be.revertedWithCustomError(seat, "ERC721NonexistentToken");
  });

  it("pause blocks claims; unpause restores; only owner", async () => {
    const { seat, owner, holder, nobody } = await loadFixture(deployAll);
    await expect(seat.connect(nobody).pause()).to.be.revertedWithCustomError(seat, "OwnableUnauthorizedAccount");
    await seat.connect(owner).pause();
    expect(await seat.claimOpen()).to.equal(false);
    await expect(seat.connect(holder).claim()).to.be.revertedWithCustomError(seat, "EnforcedPause");
    await seat.connect(owner).unpause();
    expect(await seat.claimOpen()).to.equal(true);
    await expect(seat.connect(holder).claim()).to.emit(seat, "SeatClaimed");
  });

  it("claimDeadline: claims revert after deadline, 0 disables", async () => {
    const { seat, owner, holder, holder2 } = await loadFixture(deployAll);
    const now = await time.latest();
    await expect(seat.connect(owner).setClaimDeadline(now + 100))
      .to.emit(seat, "ClaimDeadlineUpdated")
      .withArgs(0n, BigInt(now + 100));
    await seat.connect(holder).claim();
    await time.increase(200);
    expect(await seat.claimOpen()).to.equal(false);
    await expect(seat.connect(holder2).claim()).to.be.revertedWithCustomError(seat, "ClaimClosed");
    await seat.connect(owner).setClaimDeadline(0);
    await expect(seat.connect(holder2).claim()).to.emit(seat, "SeatClaimed").withArgs(holder2.address, 2n);
  });

  it("owner has no mint/burn/transfer power (no such functions)", async () => {
    const { seat } = await loadFixture(deployAll);
    for (const sig of ["mint()", "mintTo(address)", "burn(uint256)", "adminTransfer(address,address,uint256)"]) {
      expect(seat.interface.getFunction(sig)).to.equal(null);
    }
  });
});
