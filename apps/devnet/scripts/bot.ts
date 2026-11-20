/**
 * Activity bot: keeps the devnet busy so blocks contain real transactions.
 *
 * Every 1-3 s it performs one of:
 *   - transfer   : tANTB transfer between two random prefunded accounts
 *   - seat       : fund a fresh random wallet from account #0, mint a GenesisSeat
 *                  from it, and register it in AgentRegistry (~1 per 30 s)
 *   - price      : FeeKeeper.setAntbUsd random walk +/-0.3 % around $97
 *
 * Runs forever; RPC errors are logged and retried on the next tick.
 */
import { ethers } from "hardhat";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { HDNodeWallet, Signer } from "ethers";

const SEAT_INTERVAL_MS = 30_000;
const PRICE_CENTER = 97.0;
const PRICE_BAND = 0.08; // keep the random walk within +/-8 % of center

type Deployments = { contracts: { AgentRegistry: string; GenesisSeat: string; FeeKeeper: string } };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function ts() {
  return new Date().toISOString().slice(11, 19);
}

async function main() {
  const deployments: Deployments = JSON.parse(
    readFileSync(join(__dirname, "..", "deployments", "devnet.json"), "utf8"),
  );
  const signers = await ethers.getSigners();
  const owner = signers[0];

  const registry = await ethers.getContractAt("AgentRegistry", deployments.contracts.AgentRegistry, owner);
  const seat = await ethers.getContractAt("GenesisSeat", deployments.contracts.GenesisSeat, owner);
  const keeper = await ethers.getContractAt("FeeKeeper", deployments.contracts.FeeKeeper, owner);

  let antbUsd = Number(await keeper.antbUsd()) / 1e8;
  let lastSeatAt = 0;
  let seatCounter = Number(await seat.totalSeats());
  let txCount = 0;
  let errCount = 0;

  console.log(`[bot] started. signers=${signers.length} seats=${seatCounter} antbUsd=${antbUsd.toFixed(2)}`);

  // --- actions -----------------------------------------------------------

  async function doTransfer() {
    // Random pair of prefunded accounts (skip #0 so owner nonces stay simple).
    let a = randInt(1, signers.length - 1);
    let b = randInt(1, signers.length - 1);
    if (a === b) b = (b % (signers.length - 1)) + 1;
    const amount = ethers.parseEther((Math.random() * 0.5 + 0.01).toFixed(4));
    const tx = await signers[a].sendTransaction({ to: signers[b].address, value: amount });
    const rc = await tx.wait();
    console.log(`${ts()} transfer #${a}->#${b} ${ethers.formatEther(amount)} tANTB block=${rc?.blockNumber}`);
  }

  async function doSeat() {
    const fresh: HDNodeWallet = ethers.Wallet.createRandom().connect(ethers.provider);
    // Fund from owner.
    const fund = await owner.sendTransaction({ to: fresh.address, value: ethers.parseEther("0.05") });
    await fund.wait();
    // Mint from the fresh wallet.
    const mintTx = await seat.connect(fresh as unknown as Signer).mint();
    const rc = await mintTx.wait();
    seatCounter += 1;
    // Register it as an agent (owner-only).
    const handleHash = ethers.keccak256(ethers.toUtf8Bytes(`agent-${seatCounter}.ai`));
    const reg = await registry.register(fresh.address, handleHash);
    await reg.wait();
    console.log(`${ts()} seat #${seatCounter} -> ${fresh.address.slice(0, 10)}.. minted+registered block=${rc?.blockNumber}`);
  }

  async function doPrice() {
    const step = 1 + (Math.random() * 0.006 - 0.003); // +/-0.3 %
    let next = antbUsd * step;
    const lo = PRICE_CENTER * (1 - PRICE_BAND);
    const hi = PRICE_CENTER * (1 + PRICE_BAND);
    if (next < lo || next > hi) next = PRICE_CENTER; // re-center if drifted out of band
    const scaled = BigInt(Math.round(next * 1e8));
    const tx = await keeper.setAntbUsd(scaled);
    const rc = await tx.wait();
    antbUsd = next;
    console.log(`${ts()} price antbUsd=${next.toFixed(4)} minBaseFee=${await keeper.minBaseFeeWei()} wei block=${rc?.blockNumber}`);
  }

  // --- main loop -----------------------------------------------------------

  for (;;) {
    try {
      const now = Date.now();
      const roll = Math.random();
      if (now - lastSeatAt >= SEAT_INTERVAL_MS) {
        lastSeatAt = now;
        await doSeat();
      } else if (roll < 0.25) {
        await doPrice();
      } else {
        await doTransfer();
      }
      txCount += 1;
      if (txCount % 50 === 0) {
        const bn = await ethers.provider.getBlockNumber();
        console.log(`${ts()} stats txs=${txCount} errors=${errCount} block=${bn} seats=${seatCounter}`);
      }
    } catch (err: any) {
      errCount += 1;
      console.warn(`${ts()} error: ${err?.shortMessage ?? err?.message ?? err}`);
      await sleep(2000); // back off a little on RPC hiccups
    }
    await sleep(randInt(1000, 3000));
  }
}

main().catch((err) => {
  console.error("[bot] fatal:", err);
  process.exit(1);
});
