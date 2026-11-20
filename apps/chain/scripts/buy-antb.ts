/**
 * Buys ANTB with BNB for the chain owner via PancakeSwap V3 (WBNB -> USDT -> ANTB).
 *
 *   BNB_IN=0.04 MIN_ANTB_OUT=0.2 npx tsx scripts/buy-antb.ts
 *
 * Uses CHAIN_OWNER_PRIVATE_KEY from .env. Mainnet only.
 */
import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  encodeFunctionData,
  encodePacked,
  parseAbi,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";

const RPC = process.env.PARENT_CHAIN_RPC_MAINNET || "https://bsc-dataseed.bnbchain.org";
const ROUTER = "0x1b81D678ffb9C0263b24A97847620C99d213eB14"; // PancakeSwap V3 SwapRouter
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEbF2De08d9173bc095c";
const USDT = "0x55d398326f99059fF775485246999027B3197955";
const ANTB = "0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53";

const routerAbi = parseAbi([
  "function exactInput((bytes path,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum) params) payable returns (uint256 amountOut)",
  "function refundETH() payable",
  "function multicall(bytes[] data) payable returns (bytes[] results)",
]);
const erc20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);

async function main() {
  const pk = process.env.CHAIN_OWNER_PRIVATE_KEY as Hex;
  if (!pk) throw new Error("CHAIN_OWNER_PRIVATE_KEY missing");
  const account = privateKeyToAccount(pk);
  const pub = createPublicClient({ chain: bsc, transport: http(RPC) });
  const wallet = createWalletClient({ account, chain: bsc, transport: http(RPC) });

  const bnbIn = parseEther(process.env.BNB_IN ?? "0.04");
  const minOut = parseEther(process.env.MIN_ANTB_OUT ?? "0.2");

  const before = await pub.readContract({ address: ANTB, abi: erc20, functionName: "balanceOf", args: [account.address] });
  console.log(`[buy] ${account.address} BNB=${formatEther(await pub.getBalance({ address: account.address }))} ANTB=${formatEther(before)}`);
  console.log(`[buy] swapping ${formatEther(bnbIn)} BNB -> >= ${formatEther(minOut)} ANTB via WBNB(500)USDT(2500)ANTB`);

  // path: tokenIn, fee, tokenMid, fee, tokenOut
  const path = encodePacked(
    ["address", "uint24", "address", "uint24", "address"],
    [WBNB, 500, USDT, 2500, ANTB],
  );
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const swap = encodeFunctionData({
    abi: routerAbi,
    functionName: "exactInput",
    args: [{ path, recipient: account.address, deadline, amountIn: bnbIn, amountOutMinimum: minOut }],
  });
  const refund = encodeFunctionData({ abi: routerAbi, functionName: "refundETH" });

  const sim = await pub.simulateContract({
    account,
    address: ROUTER,
    abi: routerAbi,
    functionName: "multicall",
    args: [[swap, refund]],
    value: bnbIn,
  });
  const hash = await wallet.writeContract(sim.request);
  console.log(`[buy] tx ${hash}`);
  const rcpt = await pub.waitForTransactionReceipt({ hash });
  console.log(`[buy] status=${rcpt.status} gasUsed=${rcpt.gasUsed}`);

  const after = await pub.readContract({ address: ANTB, abi: erc20, functionName: "balanceOf", args: [account.address] });
  console.log(`[buy] ANTB now ${formatEther(after)} (+${formatEther(after - before)}), BNB ${formatEther(await pub.getBalance({ address: account.address }))}`);
}

main().catch((e) => {
  console.error("[buy] failed:", e);
  process.exit(1);
});
