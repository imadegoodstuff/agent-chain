/**
 * Deploy the fee-token pricer (ANTB per BNB, 18 decimals) on the parent chain.
 * Required so the SequencerInbox emits batch spending reports for a custom-gas-token *rollup*.
 *
 * Exchange rate = BNB_USD_PRICE / ANTB_USD_PRICE (from .env). The fee keeper may update it later via
 * setExchangeRate(); on BSC block.basefee == 0 so this rate currently has no effect on fees
 * (see RESEARCH.md §6 "L1 pricing on BSC") but it must be non-zero and honest.
 *
 * Writes: deployments/<network>/tokens.json (feeTokenPricer)
 */
import { networkName, deployerPrivateKey, optionalEnv } from './lib/env';
import { getNetwork } from './lib/networks';
import { parentClients, assertParentChainId } from './lib/clients';
import { loadArtifact } from './lib/artifacts';
import { readJson, writeJson, type TokensFile } from './lib/deployments';
import { antbPerBnbRate } from './lib/params';

async function main() {
  const netName = networkName();
  const net = getNetwork(netName);
  const { account, publicClient, walletClient } = parentClients(net, deployerPrivateKey());
  await assertParentChainId(publicClient, net.parentChainId);

  const tokens = readJson<TokensFile>(netName, 'tokens.json');
  if (tokens?.feeTokenPricer && !process.argv.includes('--force')) {
    console.log(`Pricer already deployed at ${tokens.feeTokenPricer}. Use --force to redeploy.`);
    return;
  }

  const bnbUsd = Number(optionalEnv('BNB_USD_PRICE', '565'));
  const antbUsd = Number(optionalEnv('ANTB_USD_PRICE', '97.17'));
  const rate = antbPerBnbRate(bnbUsd, antbUsd);
  console.log(`Deployer ${account.address}; exchange rate = ${bnbUsd}/${antbUsd} = ${rate} ANTB-wei per BNB`);

  const art = loadArtifact('OwnerAdjustableExchangeRatePricer');
  const hash = await walletClient.deployContract({ abi: art.abi, bytecode: art.bytecode, args: [rate] });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error('no contractAddress in receipt');
  console.log(`FeeTokenPricer deployed at ${receipt.contractAddress} (tx ${hash}, gas ${receipt.gasUsed})`);

  const nativeToken = tokens?.nativeToken ?? net.nativeToken;
  if (!nativeToken) throw new Error('nativeToken unknown: run deploy-tantb.ts first (testnet) or set ANTB_ADDRESS');
  const file: TokensFile = {
    network: netName,
    parentChainId: net.parentChainId,
    nativeToken,
    nativeTokenSymbol: tokens?.nativeTokenSymbol ?? (net.isMainnet ? 'ANTB' : 'tANTB'),
    weth: tokens?.weth,
    feeTokenPricer: receipt.contractAddress,
    feeTokenPricerExchangeRate: rate.toString(),
    txHashes: { ...(tokens?.txHashes ?? {}), feeTokenPricer: hash },
    deployedAt: new Date().toISOString(),
  };
  console.log(`Wrote ${writeJson(netName, 'tokens.json', file)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
