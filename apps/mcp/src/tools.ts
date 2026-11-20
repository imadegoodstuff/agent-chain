import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatUnits, hexToString, type Address } from "viem";
import { CONFIG, DISCLAIMER } from "./config.js";
import {
  AGENT_REGISTRY_ABI,
  ERC721_BALANCE_ABI,
  FEE_KEEPER_ABI,
  GENESIS_SEAT_ABI,
  assertAddress,
  assertHash,
  bscClient,
  fetchExplorerHead,
  l2,
  toJson,
  weiToAntb,
} from "./chain.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

function ok(payload: unknown) {
  return { content: [{ type: "text" as const, text: toJson(payload) }] };
}

function fail(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { isError: true, content: [{ type: "text" as const, text: toJson({ error: message }) }] };
}

/** Wrap a tool body so any thrown error becomes an MCP error result instead of a crash. */
function guarded<T>(fn: (args: T) => Promise<unknown>) {
  return async (args: T) => {
    try {
      return ok(await fn(args));
    } catch (err) {
      return fail(err);
    }
  };
}

// ---------------------------------------------------------------------------
// Tool implementations (exported so the smoke test can call them directly too)
// ---------------------------------------------------------------------------

export async function head() {
  let explorer: unknown = null;
  let explorerError: string | undefined;
  try {
    explorer = await fetchExplorerHead();
  } catch (err) {
    explorerError = err instanceof Error ? err.message : String(err);
  }

  const [chainId, blockNumber, gasPrice, block] = await Promise.all([
    l2.getChainId(),
    l2.getBlockNumber(),
    l2.getGasPrice(),
    l2.getBlock({ blockTag: "latest" }),
  ]);

  return {
    network: "AGENT CHAIN Devnet",
    chainId,
    expectedChainId: CONFIG.chainId,
    rpcUrl: CONFIG.rpcUrl,
    explorerUrl: CONFIG.explorerUrl,
    latestBlock: blockNumber,
    latestBlockHash: block.hash,
    latestBlockTimestamp: Number(block.timestamp),
    gasPriceWei: gasPrice,
    baseFeePerGasWei: block.baseFeePerGas ?? null,
    txCountInLatestBlock: block.transactions.length,
    explorerHead: explorer,
    explorerError,
    disclaimer: DISCLAIMER,
  };
}

export async function getBlock(input: { number?: string | number; includeTransactions?: boolean }) {
  const includeTransactions = input.includeTransactions ?? false;
  const raw = input.number === undefined ? "latest" : String(input.number).trim();

  const block =
    raw === "latest" || raw === "pending" || raw === "safe" || raw === "finalized" || raw === "earliest"
      ? await l2.getBlock({ blockTag: raw, includeTransactions })
      : /^0x[0-9a-fA-F]{64}$/.test(raw)
        ? await l2.getBlock({ blockHash: raw as `0x${string}`, includeTransactions })
        : await l2.getBlock({ blockNumber: BigInt(raw), includeTransactions });

  return {
    number: block.number,
    hash: block.hash,
    parentHash: block.parentHash,
    timestamp: Number(block.timestamp),
    miner: block.miner,
    gasUsed: block.gasUsed,
    gasLimit: block.gasLimit,
    baseFeePerGasWei: block.baseFeePerGas ?? null,
    txCount: block.transactions.length,
    transactions: block.transactions,
    explorerUrl: `${CONFIG.explorerUrl}/block/${block.number}`,
  };
}

export async function getTx(input: { hash: string }) {
  const hash = assertHash(input.hash);
  const tx = await l2.getTransaction({ hash }).catch(() => null);
  if (!tx) return { found: false, hash };

  const receipt = await l2.getTransactionReceipt({ hash }).catch(() => null);
  return {
    found: true,
    hash,
    blockNumber: tx.blockNumber,
    from: tx.from,
    to: tx.to,
    nonce: tx.nonce,
    valueWei: tx.value,
    value: `${weiToAntb(tx.value)} ${CONFIG.gasSymbol}`,
    input: tx.input,
    gas: tx.gas,
    gasPriceWei: tx.gasPrice ?? null,
    maxFeePerGasWei: tx.maxFeePerGas ?? null,
    status: receipt ? (receipt.status === "success" ? "success" : "reverted") : "pending",
    gasUsed: receipt?.gasUsed ?? null,
    effectiveGasPriceWei: receipt?.effectiveGasPrice ?? null,
    contractAddress: receipt?.contractAddress ?? null,
    logs: receipt?.logs.length ?? 0,
    explorerUrl: `${CONFIG.explorerUrl}/tx/${hash}`,
  };
}

export async function isAgent(input: { address: string; checkBsc?: boolean }) {
  const address = assertAddress(input.address);
  const checkBsc = input.checkBsc ?? false;

  const [active, agentOf, seatId] = await Promise.all([
    l2.readContract({
      address: CONFIG.contracts.agentRegistry,
      abi: AGENT_REGISTRY_ABI,
      functionName: "isAgent",
      args: [address],
    }),
    l2.readContract({
      address: CONFIG.contracts.agentRegistry,
      abi: AGENT_REGISTRY_ABI,
      functionName: "agentOf",
      args: [address],
    }),
    l2.readContract({
      address: CONFIG.contracts.genesisSeat,
      abi: GENESIS_SEAT_ABI,
      functionName: "seatOf",
      args: [address],
    }),
  ]);

  let bscAgentId:
    | { checked: true; balance: string; holdsAgentId: boolean; contract: Address; rpc: string }
    | { checked: true; error: string }
    | { checked: false } = { checked: false };

  if (checkBsc) {
    try {
      const balance = await bscClient.readContract({
        address: CONFIG.bsc.agentIdContract,
        abi: ERC721_BALANCE_ABI,
        functionName: "balanceOf",
        args: [address],
      });
      bscAgentId = {
        checked: true,
        balance: balance.toString(),
        holdsAgentId: balance > 0n,
        contract: CONFIG.bsc.agentIdContract,
        rpc: CONFIG.bsc.rpcUrl,
      };
    } catch (err) {
      bscAgentId = { checked: true, error: err instanceof Error ? err.message : String(err) };
    }
  }

  return {
    address,
    l2: {
      registry: CONFIG.contracts.agentRegistry,
      isAgent: active,
      handleHash: agentOf[0],
      active: agentOf[1],
      genesisSeatId: seatId === 0n ? null : seatId,
    },
    bscAgentId,
    note:
      "This tool checks whether a specific address you already hold is registered. It must not be used to discover or resolve other people's wallets by name.",
  };
}

export async function feeEstimate(input: { gas?: number | string }) {
  const gasRaw = input.gas ?? 21_000;
  const gas = BigInt(gasRaw);
  if (gas <= 0n) throw new Error("gas must be > 0");

  const [usdPerGas, antbUsd, minBaseFeeWei, lastUpdated, rpcGasPrice] = await Promise.all([
    l2.readContract({ address: CONFIG.contracts.feeKeeper, abi: FEE_KEEPER_ABI, functionName: "usdPerGas" }),
    l2.readContract({ address: CONFIG.contracts.feeKeeper, abi: FEE_KEEPER_ABI, functionName: "antbUsd" }),
    l2.readContract({ address: CONFIG.contracts.feeKeeper, abi: FEE_KEEPER_ABI, functionName: "minBaseFeeWei" }),
    l2.readContract({ address: CONFIG.contracts.feeKeeper, abi: FEE_KEEPER_ABI, functionName: "lastUpdated" }),
    l2.getGasPrice(),
  ]);

  // usdPerGas is 1e18-scaled USD per gas; antbUsd is 1e8-scaled USD per ANTB.
  const costWei = gas * minBaseFeeWei;
  const usdCostScaled = gas * usdPerGas; // 1e18-scaled USD
  const usdCost = Number(formatUnits(usdCostScaled, 18));

  return {
    feeKeeper: CONFIG.contracts.feeKeeper,
    gas,
    keeper: {
      usdPerGas: `${formatUnits(usdPerGas, 18)} USD/gas`,
      usdPerMillionGas: `${(Number(formatUnits(usdPerGas, 18)) * 1_000_000).toFixed(4)} USD`,
      antbUsd: `${formatUnits(antbUsd, 8)} USD/ANTB`,
      minBaseFeeWei,
      lastUpdated: Number(lastUpdated),
    },
    estimate: {
      antb: weiToAntb(costWei),
      wei: costWei,
      usd: usdCost < 0.01 ? usdCost.toPrecision(3) : usdCost.toFixed(2),
      formula: "cost_wei = gas × minBaseFeeWei; minBaseFeeWei = usdPerGas × 1e8 / antbUsd",
    },
    devnetRpcGasPriceWei: rpcGasPrice,
    note:
      "Estimate uses the FeeKeeper's current price. On devnet the RPC's own gas price is a placeholder and does not reflect the keeper. Figures are illustrative; the USD rate is a protocol parameter.",
    disclaimer: DISCLAIMER,
  };
}

export async function genesisStats() {
  const [totalSeats, agentCount, blockNumber, chainId] = await Promise.all([
    l2.readContract({ address: CONFIG.contracts.genesisSeat, abi: GENESIS_SEAT_ABI, functionName: "totalSeats" }),
    l2.readContract({ address: CONFIG.contracts.agentRegistry, abi: AGENT_REGISTRY_ABI, functionName: "agentCount" }),
    l2.getBlockNumber(),
    l2.getChainId(),
  ]);

  return {
    chainId,
    latestBlock: blockNumber,
    genesisSeat: {
      contract: CONFIG.contracts.genesisSeat,
      totalSeats,
      transferable: false,
      description:
        "A Genesis Seat is a numbered, non-transferable identity token. It marks priority and membership; it is not a promise of returns.",
    },
    agentRegistry: {
      contract: CONFIG.contracts.agentRegistry,
      activeAgents: agentCount,
    },
    bscScoredContracts: {
      note: "Mainnet BSC contracts (Bridge, GenesisSeatClaim, AgentRegistryMirror, $AGENT) are published in docs/hackathon/SUBMISSION.md once deployed.",
    },
    disclaimer: DISCLAIMER,
  };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerTools(server: McpServer) {
  server.registerTool(
    "agentchain_head",
    {
      title: "AGENT CHAIN head",
      description:
        "Current head of AGENT CHAIN: chain id, latest block, gas price, and the explorer /api/head snapshot (recent blocks, recent txs, avg block time, total Genesis Seats).",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    guarded(async () => head()),
  );

  server.registerTool(
    "agentchain_block",
    {
      title: "AGENT CHAIN block",
      description:
        "Fetch a block by number, hash, or tag ('latest' by default). Set includeTransactions=true for full tx objects.",
      inputSchema: {
        number: z
          .union([z.string(), z.number().int().nonnegative()])
          .optional()
          .describe("Block number (decimal), 0x-hash, or tag: latest|earliest|safe|finalized|pending"),
        includeTransactions: z.boolean().optional().describe("Return full transaction objects"),
      },
      annotations: READ_ONLY,
    },
    guarded(getBlock),
  );

  server.registerTool(
    "agentchain_tx",
    {
      title: "AGENT CHAIN transaction",
      description: "Fetch a transaction and its receipt by hash on AGENT CHAIN.",
      inputSchema: {
        hash: z.string().describe("0x-prefixed 32-byte transaction hash"),
      },
      annotations: READ_ONLY,
    },
    guarded(getTx),
  );

  server.registerTool(
    "agentchain_is_agent",
    {
      title: "Is this address an agent on AGENT CHAIN?",
      description:
        "Check whether an address is registered in the L2 AgentRegistry (isAgent / agentOf) and whether it holds a Genesis Seat. " +
        "Optionally also read the Binance Agent ID ERC-721 balanceOf on BSC (checkBsc=true). " +
        "Use only for addresses the user controls or explicitly provides; never to discover someone's wallet by name.",
      inputSchema: {
        address: z.string().describe("0x EVM address"),
        checkBsc: z.boolean().optional().describe("Also query Agent ID balanceOf on BSC mainnet via a public RPC"),
      },
      annotations: READ_ONLY,
    },
    guarded(isAgent),
  );

  server.registerTool(
    "agentchain_fee_estimate",
    {
      title: "AGENT CHAIN fee estimate",
      description:
        "Estimate the fee for a given gas amount using the on-chain FeeKeeper (USD per gas, ANTB/USD price → min base fee). Returns ANTB and USD.",
      inputSchema: {
        gas: z
          .union([z.number().int().positive(), z.string()])
          .optional()
          .describe("Gas units, default 21000 (simple transfer). Agent call ≈ 45000, deploy ≈ 180000."),
      },
      annotations: READ_ONLY,
    },
    guarded(feeEstimate),
  );

  server.registerTool(
    "agentchain_genesis_stats",
    {
      title: "AGENT CHAIN genesis stats",
      description: "Total Genesis Seats minted, active agents in the registry, chain id and latest block.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    guarded(async () => genesisStats()),
  );
}
