import { decodeFunctionData, parseAbi, toEventSelector, toFunctionSelector, type Hex } from "viem";

/** Known function signatures for method guessing and input decoding. */
export const KNOWN_ABI = parseAbi([
  "function transfer(address to, uint256 amount)",
  "function transferFrom(address from, address to, uint256 amount)",
  "function approve(address spender, uint256 amount)",
  "function mint()",
  "function mint(address to)",
  "function mint(address to, uint256 amount)",
  "function register(bytes32 handleHash)",
  "function register(address account, bytes32 handleHash)",
  "function setActive(address account, bool active)",
  "function setAntbUsd(uint256 price)",
  "function setUsdPerGas(uint256 usdPerGas)",
  "function update(uint256 usdPerGas, uint256 antbUsdPrice)",
  "function isAgent(address account) view returns (bool)",
  "function totalSeats() view returns (uint256)",
  "function agentCount() view returns (uint256)",
  "function minBaseFeeWei() view returns (uint256)",
  "function usdPerGas() view returns (uint256)",
  "function antbUsdPrice() view returns (uint256)",
  "function seatOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 seatId) view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
]);

const selectorMap = new Map<string, { name: string; signature: string }>();
for (const item of KNOWN_ABI) {
  if (item.type !== "function") continue;
  const sig = `${item.name}(${item.inputs.map((i) => i.type).join(",")})`;
  selectorMap.set(toFunctionSelector(sig).toLowerCase(), { name: item.name, signature: sig });
}

const KNOWN_EVENTS = [
  "Transfer(address,address,uint256)",
  "Approval(address,address,uint256)",
  "SeatMinted(address,uint256)",
  "BaseFeeUpdated(uint256,uint256)",
  "BaseFeeUpdated(uint256,uint256,uint256)",
  "AgentRegistered(address,bytes32)",
  "AgentUpdated(address,bytes32,bool)",
  "OwnershipTransferred(address,address)",
];
const eventMap = new Map<string, string>(KNOWN_EVENTS.map((sig) => [toEventSelector(sig).toLowerCase(), sig]));

export function knownEventSignature(topic0: string | undefined): string | null {
  if (!topic0) return null;
  return eventMap.get(topic0.toLowerCase()) ?? null;
}

export type MethodGuess = {
  label: string;
  kind: "transfer" | "create" | "known" | "unknown";
  selector?: string;
};

export function guessMethod(input: Hex | string | undefined, to: string | null | undefined): MethodGuess {
  if (!to) return { label: "Contract Creation", kind: "create" };
  if (!input || input === "0x" || input.length < 10) return { label: "Transfer", kind: "transfer" };
  const selector = input.slice(0, 10).toLowerCase();
  const known = selectorMap.get(selector);
  if (known) return { label: known.name, kind: "known", selector };
  return { label: selector, kind: "unknown", selector };
}

export function knownSignature(selector: string): string | undefined {
  return selectorMap.get(selector.toLowerCase())?.signature;
}

export type DecodedInput = {
  signature: string;
  name: string;
  args: { type: string; name: string; value: string }[];
};

export function decodeKnownInput(input: Hex): DecodedInput | null {
  if (!input || input.length < 10) return null;
  const selector = input.slice(0, 10).toLowerCase();
  const known = selectorMap.get(selector);
  if (!known) return null;
  try {
    const decoded = decodeFunctionData({ abi: KNOWN_ABI, data: input });
    const item = KNOWN_ABI.find(
      (f) =>
        f.type === "function" &&
        f.name === decoded.functionName &&
        `${f.name}(${f.inputs.map((i) => i.type).join(",")})` === known.signature,
    );
    if (!item || item.type !== "function") return null;
    const args = (decoded.args ?? []) as readonly unknown[];
    return {
      signature: known.signature,
      name: known.name,
      args: item.inputs.map((inp, i) => ({
        type: inp.type,
        name: inp.name ?? `arg${i}`,
        value: stringifyArg(args[i]),
      })),
    };
  } catch {
    return null;
  }
}

function stringifyArg(v: unknown): string {
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return `[${v.map(stringifyArg).join(", ")}]`;
  return JSON.stringify(v, (_k, val) => (typeof val === "bigint" ? val.toString() : val));
}
