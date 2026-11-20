/**
 * Verifies every contract listed in deployments/<network>.json on BscScan (and Sourcify)
 * using hardhat-verify with the constructor args recorded by scripts/deploy.ts.
 *
 *   npx hardhat run scripts/verify.ts --network bscTestnet
 *   npx hardhat run scripts/verify.ts --network bsc
 *
 * Requires BSCSCAN_API_KEY in .env. Already-verified contracts are skipped.
 */
import { network, run } from "hardhat";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CONTRACT_PATHS: Record<string, string> = {
  AgentRegistryMirror: "contracts/AgentRegistryMirror.sol:AgentRegistryMirror",
  GenesisSeatClaim: "contracts/GenesisSeatClaim.sol:GenesisSeatClaim",
  Bridge: "contracts/Bridge.sol:Bridge",
  MockAgentId: "contracts/mocks/MockAgentId.sol:MockAgentId",
  MockERC20: "contracts/mocks/MockERC20.sol:MockERC20",
};

async function main() {
  const file = join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!existsSync(file)) throw new Error(`missing ${file}; run scripts/deploy.ts first`);
  const dep = JSON.parse(readFileSync(file, "utf8")) as {
    contracts: Record<string, string>;
    constructorArgs: Record<string, unknown[]>;
  };
  if (!process.env.BSCSCAN_API_KEY) console.warn("[verify] BSCSCAN_API_KEY not set — BscScan verification will fail");

  let failures = 0;
  for (const [name, address] of Object.entries(dep.contracts)) {
    const contract = CONTRACT_PATHS[name];
    const constructorArguments = dep.constructorArgs[name] ?? [];
    console.log(`[verify] ${name} @ ${address}`);
    try {
      await run("verify:verify", { address, contract, constructorArguments });
      console.log(`[verify] ${name} OK`);
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      if (/already verified/i.test(msg)) {
        console.log(`[verify] ${name} already verified`);
      } else {
        failures++;
        console.error(`[verify] ${name} FAILED: ${msg}`);
      }
    }
  }
  if (failures) process.exit(1);
}

main().catch((err) => {
  console.error("[verify] failed:", err);
  process.exit(1);
});
