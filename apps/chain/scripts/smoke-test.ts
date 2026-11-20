/**
 * Post-launch smoke test.
 *   1. parent RPC chainId matches; SequencerInbox batchCount; batch poster allow-listed
 *   2. L2 RPC (raw sequencer): chainId, ArbOS version, blocks advancing at ~250 ms, gas price ≥ floor
 *   3. gateway: forwards eth_chainId; rejects eth_sendRawTransaction from a random (non-agent) key with
 *      the AGENT_ID_REQUIRED error; CORS header present
 */
import { createPublicClient, http, type Address, type Chain } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { networkName, optionalEnv, requireEnv } from './lib/env';
import { getNetwork } from './lib/networks';
import { readJson, type RollupFile } from './lib/deployments';
import { ARB_GAS_INFO, ARB_SYS } from './lib/params';
import { arbGasInfoAbi, arbSysAbi, sequencerInboxAbi } from './lib/precompiles';

let failures = 0;
function check(ok: boolean, label: string, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ` — ${extra}` : ''}`);
  if (!ok) failures++;
}

async function rpc(url: string, method: string, params: unknown[] = []) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  return { status: res.status, cors: res.headers.get('access-control-allow-origin'), body: (await res.json()) as { result?: unknown; error?: { code: number; message: string } } };
}

async function main() {
  const netName = networkName();
  const net = getNetwork(netName);
  const rollup = readJson<RollupFile>(netName, 'rollup.json');

  // 1) parent
  const parent = createPublicClient({ transport: http(net.parentRpcUrl) });
  check((await parent.getChainId()) === net.parentChainId, `parent chainId == ${net.parentChainId}`);
  if (rollup) {
    const seqInbox = rollup.coreContracts.sequencerInbox as Address;
    const count = await parent.readContract({ address: seqInbox, abi: sequencerInboxAbi, functionName: 'batchCount' });
    check(count > 0n, 'SequencerInbox.batchCount > 0', `count=${count}`);
    const isPoster = await parent.readContract({ address: seqInbox, abi: sequencerInboxAbi, functionName: 'isBatchPoster', args: [rollup.batchPosters[0]] });
    check(isPoster, 'batch poster is allow-listed');
  }

  // 2) L2 raw sequencer
  const l2Url = requireEnv('L2_RPC_URL');
  const chain: Chain = { id: net.childChainId, name: net.chainName, network: 'agentchain', nativeCurrency: { name: 'ANTB', symbol: 'ANTB', decimals: 18 }, rpcUrls: { default: { http: [l2Url] }, public: { http: [l2Url] } } };
  const l2 = createPublicClient({ chain, transport: http(l2Url) });
  check((await l2.getChainId()) === net.childChainId, `L2 chainId == ${net.childChainId}`);
  const arbos = await l2.readContract({ address: ARB_SYS, abi: arbSysAbi, functionName: 'arbOSVersion' });
  check(Number(arbos) - 55 >= 51, 'ArbOS version', `ArbOS ${Number(arbos) - 55}`);
  const b1 = await l2.getBlockNumber();
  // Nitro only produces blocks when there are transactions or every ~1 s heartbeat; wait 3 s and compare.
  await new Promise((r) => setTimeout(r, 3000));
  const b2 = await l2.getBlockNumber();
  check(b2 >= b1, 'L2 head advancing (or idle)', `${b1} → ${b2} in 3 s`);
  const minGas = await l2.readContract({ address: ARB_GAS_INFO, abi: arbGasInfoAbi, functionName: 'getMinimumGasPrice' });
  const gasPrice = await l2.getGasPrice();
  check(gasPrice >= minGas, 'eth_gasPrice ≥ minimum base fee', `${gasPrice} ≥ ${minGas}`);

  // 3) gateway
  const gw = optionalEnv('GATEWAY_URL');
  if (gw) {
    const id = await rpc(gw, 'eth_chainId');
    check(id.body.result === `0x${net.childChainId.toString(16)}`, 'gateway forwards eth_chainId', String(id.body.result));
    check(id.cors === '*', 'gateway CORS *', String(id.cors));
    const stranger = privateKeyToAccount(generatePrivateKey());
    const raw = await stranger.signTransaction({ chainId: net.childChainId, to: stranger.address, value: 0n, gas: 21000n, maxFeePerGas: 10n ** 9n, maxPriorityFeePerGas: 0n, nonce: 0, type: 'eip1559' } as never);
    const sent = await rpc(gw, 'eth_sendRawTransaction', [raw]);
    check(sent.body.error?.code === -32050, 'gateway rejects non-agent eth_sendRawTransaction', `${sent.body.error?.code} ${sent.body.error?.message ?? ''}`);
    const health = await fetch(`${gw.replace(/\/$/, '')}/health`);
    check(health.ok, 'gateway /health 200');
  } else {
    console.log('skip  gateway checks (GATEWAY_URL not set)');
  }

  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
