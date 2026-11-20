/**
 * Deploy tANTB — the AGENT CHAIN Testnet gas token on BSC Testnet (or on the local Hardhat "fake BSC").
 * Refuses to run on mainnet (ANTB already exists there).
 *
 * Writes: deployments/<network>/tokens.json and TANTB_ADDRESS in .env
 */
import { parseEther } from 'viem';
import { networkName, deployerPrivateKey, upsertEnv } from './lib/env';
import { getNetwork } from './lib/networks';
import { parentClients, assertParentChainId, fmtBnb } from './lib/clients';
import { loadArtifact } from './lib/artifacts';
import { readJson, writeJson, type TokensFile } from './lib/deployments';

async function main() {
  const netName = networkName();
  const net = getNetwork(netName);
  if (net.isMainnet) throw new Error('deploy-tantb.ts is testnet/local only. Mainnet gas token is ANTB.');

  const { account, publicClient, walletClient } = parentClients(net, deployerPrivateKey());
  await assertParentChainId(publicClient, net.parentChainId);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer ${account.address} on ${net.parentName} (chainId ${net.parentChainId}), balance ${fmtBnb(balance)} ${net.parentSymbol}`);

  const existing = readJson<TokensFile>(netName, 'tokens.json');
  if (existing?.nativeToken && !process.argv.includes('--force')) {
    console.log(`tANTB already deployed at ${existing.nativeToken} (deployments/${netName}/tokens.json). Use --force to redeploy.`);
    return;
  }

  const art = loadArtifact('TestANTB');
  const initialSupply = parseEther('1000000'); // 1,000,000 tANTB to the deployer (testnet only, no value)
  console.log('Deploying TestANTB ...');
  const hash = await walletClient.deployContract({ abi: art.abi, bytecode: art.bytecode, args: [initialSupply] });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error('no contractAddress in receipt');
  console.log(`tANTB deployed at ${receipt.contractAddress} (tx ${hash}, gas ${receipt.gasUsed})`);

  const file: TokensFile = {
    network: netName,
    parentChainId: net.parentChainId,
    nativeToken: receipt.contractAddress,
    nativeTokenSymbol: 'tANTB',
    weth: existing?.weth,
    feeTokenPricer: existing?.feeTokenPricer,
    feeTokenPricerExchangeRate: existing?.feeTokenPricerExchangeRate,
    txHashes: { ...(existing?.txHashes ?? {}), tANTB: hash },
    deployedAt: new Date().toISOString(),
  };
  const p = writeJson(netName, 'tokens.json', file);
  if (netName !== 'local') {
    upsertEnv({ TANTB_ADDRESS: receipt.contractAddress });
    console.log(`Wrote ${p}; TANTB_ADDRESS updated in .env`);
  } else {
    console.log(`Wrote ${p}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
