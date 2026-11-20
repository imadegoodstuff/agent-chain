import { ethers } from "hardhat";
import type { ContractRunner, Interface } from "ethers";

/** ethers v6 `Contract.connect()` is typed as BaseContract; keep the dynamic ABI surface (no typechain). */
export type AnyContract = {
  [method: string]: any;
  interface: Interface;
  connect(runner: ContractRunner | null): AnyContract;
  getAddress(): Promise<string>;
};
export const asAny = (c: unknown) => c as AnyContract;

export const ONE = ethers.parseEther("1");
export const PER_ADDRESS_CAP = ONE; // 1 ANTB
export const GLOBAL_CAP = ethers.parseEther("500"); // 500 ANTB

/**
 * Deploys MockAgentId (Agent ID stand-in), a second MockAgentId used as BAB, MockERC20
 * (ANTB stand-in) and the three AGENT CHAIN contracts. Returns signers:
 *   owner   - contract owner
 *   holder  - holds an Agent ID
 *   holder2 - holds an Agent ID
 *   babOnly - holds only a BAB token
 *   nobody  - holds nothing
 */
export async function deployAll() {
  const [owner, holder, holder2, babOnly, nobody] = await ethers.getSigners();

  const agentIdToken = asAny(await (await ethers.getContractFactory("MockAgentId")).deploy());
  const babToken = asAny(await (await ethers.getContractFactory("MockAgentId")).deploy());
  const antb = asAny(await (await ethers.getContractFactory("MockERC20")).deploy("Mock ANTB", "tANTB"));

  await (await agentIdToken.mintTo(holder.address)).wait();
  await (await agentIdToken.mintTo(holder2.address)).wait();
  await (await babToken.mintTo(babOnly.address)).wait();

  const agentIdAddr = await agentIdToken.getAddress();
  const babAddr = await babToken.getAddress();

  const registry = asAny(
    await (await ethers.getContractFactory("AgentRegistryMirror")).deploy(agentIdAddr, babAddr, owner.address),
  );
  const seat = asAny(
    await (await ethers.getContractFactory("GenesisSeatClaim")).deploy(agentIdAddr, babAddr, owner.address),
  );
  const bridge = asAny(
    await (
      await ethers.getContractFactory("Bridge")
    ).deploy(await antb.getAddress(), agentIdAddr, babAddr, owner.address, PER_ADDRESS_CAP, GLOBAL_CAP),
  );

  return { owner, holder, holder2, babOnly, nobody, agentIdToken, babToken, antb, registry, seat, bridge };
}
