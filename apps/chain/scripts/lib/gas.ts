import type { Address, PublicClient } from 'viem';

/**
 * Sum gasUsed of every transaction sent by `from` in blocks (startBlock, endBlock].
 * Used to measure the real cost of multi-transaction procedures (deployRollupCreator = 24 deploys).
 */
export async function sumGasUsedBy(
  publicClient: PublicClient,
  from: Address,
  startBlock: bigint,
  endBlock: bigint,
): Promise<{ txCount: number; gasUsed: bigint; feeWei: bigint; perTx: Array<{ hash: `0x${string}`; gasUsed: bigint }> }> {
  let txCount = 0;
  let gasUsed = 0n;
  let feeWei = 0n;
  const perTx: Array<{ hash: `0x${string}`; gasUsed: bigint }> = [];
  const lower = from.toLowerCase();
  for (let b = startBlock + 1n; b <= endBlock; b++) {
    const block = await publicClient.getBlock({ blockNumber: b, includeTransactions: true });
    for (const tx of block.transactions) {
      if (typeof tx === 'string') continue;
      if (tx.from.toLowerCase() !== lower) continue;
      const r = await publicClient.getTransactionReceipt({ hash: tx.hash });
      txCount++;
      gasUsed += r.gasUsed;
      feeWei += r.gasUsed * (r.effectiveGasPrice ?? 0n);
      perTx.push({ hash: tx.hash, gasUsed: r.gasUsed });
    }
  }
  return { txCount, gasUsed, feeWei, perTx };
}
