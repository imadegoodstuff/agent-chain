/**
 * Launches the $AGENT token on Flap (flap.sh) BNB Chain mainnet via Portal.newTokenV6 (TOKEN_TAXED_V3).
 *
 *   npx tsx scripts/launch-agent-token.ts            # DRY RUN: upload meta, mine salt, approve if needed, simulate only
 *   LAUNCH=1 npx tsx scripts/launch-agent-token.ts   # sends newTokenV6 after a passing simulation
 *
 * Parameters come from docs/token/FLAP-LAUNCH.md (owner-approved sheet). Uses CHAIN_OWNER_PRIVATE_KEY from .env.
 * Mainnet only. Metadata CID + salt are cached in deployments/mainnet/agent-token.prep.json so the dry run and the
 * live run use the identical params (predicted address == actual address).
 *
 * References: https://github.com/flap-sh/flap-skills (launch-bnb-token-on-flap) and
 * https://docs.flap.sh/en/flap/v2/developers/bonding-curve/launch-tokens
 */
import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  formatUnits,
  parseUnits,
  parseAbi,
  getContractAddress,
  keccak256,
  toBytes,
  toHex,
  decodeEventLog,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { bsc } from "viem/chains";
import { appendLaunchLog, logTx } from "./lib/launch-log";
import { readJson, writeJson } from "./lib/deployments";

// ── Flap BNB mainnet (skill references/construct-tx.md, salt-finding.md; verified on BscScan) ──
const PORTAL: Address = "0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0"; // TransparentUpgradeableProxy -> Portal
const TAX_TOKEN_V3_IMPL: Address = "0x024f18294970B5c76c0691b87f138A0317156422"; // FlapTaxTokenV3
const TAX_TOKEN_SUFFIX = "7777";
const TOKEN_TAXED_V3 = 6; // enum IPortalTypes.TokenVersion
const UPLOAD_API = "https://funcs.flap.sh/api/upload";
const QUOTE_TOKENS_API = "https://flap.sh/api/launch/quote-tokens";

// ── Launch sheet (docs/token/FLAP-LAUNCH.md) ──
const NAME = "AGENT CHAIN";
const SYMBOL = "AGENT";
const DESCRIPTION =
  "The index token of AGENT CHAIN — the first agent-native Layer 2 on BNB Chain. Gas on the chain is tokenized AI equity (ANTB); every account is a verified Agent ID. $AGENT does not pay for gas and promises no yield — it is the protocol's community and governance token. Risk warning: crypto assets can lose all value. agent-chain.agency";
const WEBSITE = "https://agent-chain.agency";
const TWITTER = "agent_chainL2";
const GITHUB = "https://github.com/imadegoodstuff/agent-chain";
const QUOTE_TOKEN: Address = "0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53"; // ANTB
const QUOTE_AMT_HUMAN = process.env.QUOTE_AMT ?? "0.6";
const BENEFICIARY: Address = "0xD800D290F7A87590b9A99295A21dA87D7443FcaB";
const BUY_TAX_BPS = 100;
const SELL_TAX_BPS = 100;
const TAX_DURATION = 365n * 24n * 60n * 60n; // 365 days
const ANTI_FARMER_DURATION = 30n * 24n * 60n * 60n; // 30 days (Flap UI default)
const MKT_BPS = 10000; // 100% to beneficiary
const DEFLATION_BPS = 0;
const DIVIDEND_BPS = 0;
const LP_BPS = 0;
const DEX_THRESH = 1; // FOUR_FIFTHS
const MIGRATOR_TYPE = 1; // V2_MIGRATOR (tax tokens)
const DEX_ID = 0; // PancakeSwap on BNB Chain
const LP_FEE_PROFILE = 0;

const RPC = process.env.PARENT_CHAIN_RPC_MAINNET || "https://bsc-dataseed.bnbchain.org";
const RPC_FALLBACK = "https://bsc-rpc.publicnode.com";
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const LOGO_PATH = path.join(REPO_ROOT, "brand", "token-logo-1024.png");
const PREP_FILE = "agent-token.prep.json";
const OUT_FILE = "agent-token.json";

const portalAbi = parseAbi([
  "struct NewTokenV6Params { string name; string symbol; string meta; uint8 dexThresh; bytes32 salt; uint8 migratorType; address quoteToken; uint256 quoteAmt; address beneficiary; bytes permitData; bytes32 extensionID; bytes extensionData; uint8 dexId; uint8 lpFeeProfile; uint16 buyTaxRate; uint16 sellTaxRate; uint64 taxDuration; uint64 antiFarmerDuration; uint16 mktBps; uint16 deflationBps; uint16 dividendBps; uint16 lpBps; uint256 minimumShareBalance; address dividendToken; address commissionReceiver; uint8 tokenVersion; }",
  "function newTokenV6(NewTokenV6Params params) payable returns (address)",
  "struct TokenStateV8Safe { uint8 status; uint256 reserve; uint256 circulatingSupply; uint256 price; uint8 tokenVersion; uint256 r; uint256 h; uint256 k; uint256 dexSupplyThresh; address quoteTokenAddress; bool nativeToQuoteSwapEnabled; bytes32 extensionID; uint256 buyTaxRate; uint256 sellTaxRate; address pool; uint256 progress; uint8 lpFeeProfile; uint8 dexId; }",
  "function getTokenV8Safe(address token) view returns (TokenStateV8Safe)",
  "function nftGate(address token) view returns (address)",
  "function newFeatureSwitch() view returns (bool)",
  "function quoteTokenCreationDisabled(address quoteToken) view returns (bool)",
  "struct QuoteTokenConfiguration { uint8 enabled; uint8 defaultCurve; uint8 alternativeCurve; uint8 nativeToQuoteSwapType; uint8 dexId; }",
  "function getQuoteTokenConfiguration(address quoteToken) view returns (QuoteTokenConfiguration)",
  "event TokenCreated(uint256 ts, address creator, uint256 nonce, address token, string name, string symbol, string meta)",
  "event VanityTokenCreated(address token, address creator, address beneficiary)",
  "event TokenBought(uint256 ts, address token, address buyer, uint256 amount, uint256 eth, uint256 fee, uint256 postPrice)",
  "event FlapTokenAsymmetricTaxSet(address token, uint256 buyTax, uint256 sellTax)",
]);

const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
]);

const taxTokenAbi = parseAbi([
  "function buyTaxRate() view returns (uint16)",
  "function sellTaxRate() view returns (uint16)",
  "function taxExpirationTime() view returns (uint256)",
  "function antiFarmerExpirationTime() view returns (uint256)",
  "function taxProcessor() view returns (address)",
  "function quoteToken() view returns (address)",
  "function metaURI() view returns (string)",
  "function maxSupply() view returns (uint256)",
  "function owner() view returns (address)",
]);

type Prep = { meta: string; salt: Hex; predictedToken: Address; uploadedAt: string; approveTx?: Hex };

const log = (m: string) => console.log(`[launch] ${m}`);

// ── Step 6: metadata upload (references/meta-upload.md) ──
async function uploadMeta(creator: Address): Promise<string> {
  const query = `mutation Create($file: Upload!, $meta: MetadataInput!) { create(file: $file, meta: $meta) }`;
  const image = fs.readFileSync(LOGO_PATH);
  const attempt = async (meta: Record<string, unknown>) => {
    const form = new FormData();
    form.append("operations", JSON.stringify({ query, variables: { file: null, meta } }));
    form.append("map", JSON.stringify({ "0": ["variables.file"] }));
    form.append("0", new File([image], "image.png", { type: "image/png" }), "image.png");
    const res = await fetch(UPLOAD_API, { method: "POST", body: form });
    const text = await res.text();
    let json: any;
    try { json = JSON.parse(text); } catch { throw new Error(`upload: non-JSON response ${res.status}: ${text.slice(0, 300)}`); }
    if (!res.ok || json.errors || !json?.data?.create) throw new Error(`upload failed ${res.status}: ${JSON.stringify(json.errors ?? json).slice(0, 500)}`);
    return json.data.create as string;
  };
  const base = { description: DESCRIPTION, website: WEBSITE, twitter: TWITTER, telegram: null, creator };
  try {
    return await attempt({ ...base, github: GITHUB });
  } catch (e) {
    log(`meta upload with github field rejected (${(e as Error).message.slice(0, 160)}); retrying without it`);
    return attempt(base);
  }
}

// ── Step 7: salt mining (references/salt-finding.md) ──
function findSalt(maxMs: number): { salt: Hex; address: Address; iterations: number } {
  const bytecode = ("0x3d602d80600a3d3981f3363d3d373d3d3d363d73" + TAX_TOKEN_V3_IMPL.slice(2).toLowerCase() + "5af43d82803e903d91602b57fd5bf3") as Hex;
  const predict = (salt: Hex): Address => getContractAddress({ from: PORTAL, salt: toBytes(salt), bytecode, opcode: "CREATE2" });
  let salt = keccak256(toHex(generatePrivateKey()));
  let iterations = 0;
  const start = Date.now();
  while (!predict(salt).toLowerCase().endsWith(TAX_TOKEN_SUFFIX)) {
    salt = keccak256(salt);
    iterations++;
    if (Date.now() - start > maxMs) throw new Error(`salt mining exceeded ${maxMs} ms after ${iterations} iterations`);
  }
  return { salt, address: predict(salt), iterations };
}

async function main() {
  const live = process.env.LAUNCH === "1";
  const pk = process.env.CHAIN_OWNER_PRIVATE_KEY as Hex;
  if (!pk) throw new Error("CHAIN_OWNER_PRIVATE_KEY missing");
  const account = privateKeyToAccount(pk);
  const transport = http(RPC, { retryCount: 2 });
  const pub = createPublicClient({ chain: bsc, transport });
  const wallet = createWalletClient({ account, chain: bsc, transport });
  const fallback = createPublicClient({ chain: bsc, transport: http(RPC_FALLBACK) });

  // ── Preflight (references/preflight.md) ──
  const chainId = await pub.getChainId();
  if (chainId !== 56) throw new Error(`RPC chainId ${chainId} != 56`);
  const block = await pub.getBlockNumber();
  const bnb = await pub.getBalance({ address: account.address });
  const quoteBal = await pub.readContract({ address: QUOTE_TOKEN, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
  log(`mode=${live ? "LIVE" : "DRY RUN"} launcher=${account.address} block=${block} BNB=${formatEther(bnb)} ANTB=${formatEther(quoteBal)}`);
  if (bnb < parseUnits("0.01", 18)) throw new Error("launcher BNB < 0.01, refusing");

  // quote token: API (decimals) + on-chain allowlist
  const qt = await (await fetch(QUOTE_TOKENS_API)).json() as { chains: { chainId: number; quoteTokens: { symbol: string; address: string; decimals: number }[] }[] };
  const bnbChain = qt.chains.find((c) => c.chainId === 56);
  const antb = bnbChain?.quoteTokens.find((t) => t.address.toLowerCase() === QUOTE_TOKEN.toLowerCase());
  if (!antb) throw new Error("ANTB not in flap.sh quote-tokens for chainId 56 — STOP (sheet fallback: BNB quote needs owner decision)");
  const onchainDecimals = await pub.readContract({ address: QUOTE_TOKEN, abi: erc20Abi, functionName: "decimals" });
  if (antb.decimals !== onchainDecimals) throw new Error(`ANTB decimals mismatch api=${antb.decimals} chain=${onchainDecimals}`);
  const quoteAmt = parseUnits(QUOTE_AMT_HUMAN, antb.decimals);
  log(`quote token ${antb.symbol} ${QUOTE_TOKEN} decimals=${antb.decimals}; quoteAmt=${QUOTE_AMT_HUMAN} (${quoteAmt} wei)`);
  if (quoteBal < quoteAmt) throw new Error(`launcher ANTB ${formatEther(quoteBal)} < quoteAmt ${QUOTE_AMT_HUMAN}`);

  const qcfg = await pub.readContract({ address: PORTAL, abi: portalAbi, functionName: "getQuoteTokenConfiguration", args: [QUOTE_TOKEN] });
  const qDisabled = await pub.readContract({ address: PORTAL, abi: portalAbi, functionName: "quoteTokenCreationDisabled", args: [QUOTE_TOKEN] });
  const featureSwitch = await pub.readContract({ address: PORTAL, abi: portalAbi, functionName: "newFeatureSwitch" });
  log(`portal quote cfg: enabled=${qcfg.enabled} defaultCurve=${qcfg.defaultCurve} dexId=${qcfg.dexId} creationDisabled=${qDisabled} newFeatureSwitch=${featureSwitch}`);
  if (qcfg.enabled !== 1) throw new Error("ANTB is not enabled as a quote token on the Portal — STOP");
  if (qDisabled) throw new Error("ANTB token creation is disabled on the Portal — STOP");

  // ── Prep (meta CID + salt), cached so dry and live runs are identical ──
  let prep = readJson<Prep>("mainnet", PREP_FILE);
  if (!prep || process.env.REPREP === "1") {
    if (!fs.existsSync(LOGO_PATH)) throw new Error(`logo missing: ${LOGO_PATH}`);
    log(`uploading metadata (image ${path.relative(REPO_ROOT, LOGO_PATH)}, ${fs.statSync(LOGO_PATH).size} bytes) …`);
    const meta = await uploadMeta(account.address);
    log(`meta CID ${meta} → https://flap.mypinata.cloud/ipfs/${meta}`);
    const metaJson = await (await fetch(`https://flap.mypinata.cloud/ipfs/${meta}`)).text().catch(() => "");
    if (metaJson) log(`meta JSON: ${metaJson.slice(0, 600)}`);
    const mined = findSalt(120_000);
    log(`salt ${mined.salt} → predicted token ${mined.address} (${mined.iterations} iterations)`);
    prep = { meta, salt: mined.salt, predictedToken: mined.address, uploadedAt: new Date().toISOString() };
    writeJson("mainnet", PREP_FILE, prep);
  } else {
    log(`using cached prep: meta=${prep.meta} salt=${prep.salt} predicted=${prep.predictedToken}`);
  }
  // predicted address must not already exist
  const existing = await pub.getBytecode({ address: prep.predictedToken });
  if (existing && existing !== "0x") throw new Error(`predicted token ${prep.predictedToken} already has code — re-run with REPREP=1`);

  const params = {
    name: NAME,
    symbol: SYMBOL,
    meta: prep.meta,
    dexThresh: DEX_THRESH,
    salt: prep.salt,
    migratorType: MIGRATOR_TYPE,
    quoteToken: QUOTE_TOKEN,
    quoteAmt,
    beneficiary: BENEFICIARY,
    permitData: "0x" as Hex,
    extensionID: ("0x" + "00".repeat(32)) as Hex,
    extensionData: "0x" as Hex,
    dexId: DEX_ID,
    lpFeeProfile: LP_FEE_PROFILE,
    buyTaxRate: BUY_TAX_BPS,
    sellTaxRate: SELL_TAX_BPS,
    taxDuration: TAX_DURATION,
    antiFarmerDuration: ANTI_FARMER_DURATION,
    mktBps: MKT_BPS,
    deflationBps: DEFLATION_BPS,
    dividendBps: DIVIDEND_BPS,
    lpBps: LP_BPS,
    minimumShareBalance: 0n,
    // Portal rule: "dividendToken cannot be zero when quoteToken is ERC20" — address(0) is only valid for a native-BNB
    // quote. With dividendBps = 0 this is tracker-only (no dividends are paid); set it to the quote token explicitly.
    dividendToken: QUOTE_TOKEN,
    commissionReceiver: zeroAddress,
    tokenVersion: TOKEN_TAXED_V3,
  } as const;
  if (MKT_BPS + DEFLATION_BPS + DIVIDEND_BPS + LP_BPS !== 10000) throw new Error("bps must sum to 10000");

  console.log("[launch] newTokenV6 params (human units):");
  console.log(JSON.stringify({
    ...params,
    quoteAmt: `${QUOTE_AMT_HUMAN} ANTB (${quoteAmt})`,
    taxDuration: `${TAX_DURATION}s (365 days)`,
    antiFarmerDuration: `${ANTI_FARMER_DURATION}s (30 days)`,
    buyTaxRate: `${BUY_TAX_BPS} bps (1%)`,
    sellTaxRate: `${SELL_TAX_BPS} bps (1%)`,
    tax_split: `beneficiary ${MKT_BPS / 100}% / burn ${DEFLATION_BPS / 100}% / dividend ${DIVIDEND_BPS / 100}% / lp ${LP_BPS / 100}%`,
    tokenVersion: `${TOKEN_TAXED_V3} (TOKEN_TAXED_V3)`,
    dexThresh: `${DEX_THRESH} (FOUR_FIFTHS)`,
    migratorType: `${MIGRATOR_TYPE} (V2_MIGRATOR)`,
    dexId: `${DEX_ID} (PancakeSwap)`,
    minimumShareBalance: "0",
    msgValue: "0 (ERC-20 quote)",
  }, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));

  // ── Approve exactly quoteAmt to the Portal (needed for the simulation to pass; harmless) ──
  const txs: Record<string, Hex> = {};
  const feeBefore = bnb;
  let allowance = await pub.readContract({ address: QUOTE_TOKEN, abi: erc20Abi, functionName: "allowance", args: [account.address, PORTAL] });
  log(`current ANTB allowance launcher→Portal = ${formatEther(allowance)}`);
  if (prep.approveTx) txs.approve = prep.approveTx;
  if (allowance < quoteAmt) {
    const simA = await pub.simulateContract({ account, address: QUOTE_TOKEN, abi: erc20Abi, functionName: "approve", args: [PORTAL, quoteAmt] });
    const hash = await wallet.writeContract(simA.request);
    log(`approve tx ${hash}`);
    const r = await pub.waitForTransactionReceipt({ hash });
    if (r.status !== "success") throw new Error(`approve reverted: ${hash}`);
    txs.approve = hash;
    prep = { ...prep, approveTx: hash };
    writeJson("mainnet", PREP_FILE, prep);
    logTx("mainnet", `flap launch: approve ${QUOTE_AMT_HUMAN} ANTB for Portal ${PORTAL}`, r);
    allowance = await pub.readContract({ address: QUOTE_TOKEN, abi: erc20Abi, functionName: "allowance", args: [account.address, PORTAL] });
    log(`allowance now ${formatEther(allowance)}`);
  }

  // ── Step 2: DRY RUN simulation ──
  log("simulating Portal.newTokenV6 …");
  let sim;
  try {
    sim = await pub.simulateContract({ account, address: PORTAL, abi: portalAbi, functionName: "newTokenV6", args: [params], value: 0n });
  } catch (e: any) {
    console.error("[launch] simulation REVERTED:", e.shortMessage ?? e.message);
    if (e.cause?.data) console.error("[launch] revert data:", JSON.stringify(e.cause.data, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
    if (e.metaMessages) console.error(e.metaMessages.join("\n"));
    throw e;
  }
  const simulated = sim.result as Address;
  const gasEst = await pub.estimateContractGas({ account, address: PORTAL, abi: portalAbi, functionName: "newTokenV6", args: [params], value: 0n });
  log(`simulation OK → returns token ${simulated}; gas estimate ${gasEst}`);
  if (simulated.toLowerCase() !== prep.predictedToken.toLowerCase()) throw new Error(`simulated ${simulated} != CREATE2 prediction ${prep.predictedToken}`);

  if (!live) {
    log("DRY RUN complete — no launch tx sent. Re-run with LAUNCH=1 to send.");
    return;
  }

  // ── Step 3: send ──
  log("sending Portal.newTokenV6 …");
  const hash = await wallet.writeContract({ ...sim.request, gas: (gasEst * 125n) / 100n });
  log(`launch tx ${hash}`);
  let rcpt;
  try {
    rcpt = await pub.waitForTransactionReceipt({ hash, timeout: 180_000 });
  } catch {
    log("primary RPC receipt wait failed; trying fallback RPC");
    rcpt = await fallback.waitForTransactionReceipt({ hash, timeout: 180_000 });
  }
  txs.newTokenV6 = hash;
  log(`status=${rcpt.status} block=${rcpt.blockNumber} gasUsed=${rcpt.gasUsed}`);
  if (rcpt.status !== "success") {
    logTx("mainnet", "flap launch: Portal.newTokenV6 REVERTED", rcpt);
    throw new Error(`newTokenV6 reverted: ${hash}`);
  }

  // decode events
  let token: Address | undefined;
  let bought: { amount: bigint; eth: bigint; fee: bigint } | undefined;
  let taxEvent: { buyTax: bigint; sellTax: bigint } | undefined;
  let vanityBeneficiary: Address | undefined;
  for (const l of rcpt.logs) {
    if (l.address.toLowerCase() !== PORTAL.toLowerCase()) continue;
    try {
      const ev = decodeEventLog({ abi: portalAbi, data: l.data, topics: l.topics });
      if (ev.eventName === "TokenCreated") token = ev.args.token;
      if (ev.eventName === "TokenBought") bought = { amount: ev.args.amount, eth: ev.args.eth, fee: ev.args.fee };
      if (ev.eventName === "FlapTokenAsymmetricTaxSet") taxEvent = { buyTax: ev.args.buyTax, sellTax: ev.args.sellTax };
      if (ev.eventName === "VanityTokenCreated") vanityBeneficiary = ev.args.beneficiary;
    } catch { /* other portal events */ }
  }
  if (!token) throw new Error("TokenCreated event not found in receipt");
  log(`TokenCreated → ${token} (predicted ${prep.predictedToken}, match=${token.toLowerCase() === prep.predictedToken.toLowerCase()})`);
  if (bought) log(`TokenBought: ${formatEther(bought.amount)} AGENT for ${formatEther(bought.eth)} ANTB (fee ${formatEther(bought.fee)} ANTB)`);
  if (taxEvent) log(`FlapTokenAsymmetricTaxSet: buy ${taxEvent.buyTax} / sell ${taxEvent.sellTax}`);
  if (vanityBeneficiary) log(`VanityTokenCreated beneficiary=${vanityBeneficiary}`);
  logTx("mainnet", `flap launch: Portal.newTokenV6 ${NAME} (${SYMBOL}) TOKEN_TAXED_V3 → token ${token}`, rcpt,
    bought ? `first buy ${formatEther(bought.eth)} ANTB → ${formatEther(bought.amount)} AGENT` : "no first buy");

  // ── Verify on-chain ──
  const rd = <T,>(fn: string, abi: any, addr: Address, args: unknown[] = []) =>
    pub.readContract({ address: addr, abi, functionName: fn, args } as any) as Promise<T>;
  const [tName, tSymbol, tSupply, tDecimals] = await Promise.all([
    rd<string>("name", erc20Abi, token), rd<string>("symbol", erc20Abi, token), rd<bigint>("totalSupply", erc20Abi, token), rd<number>("decimals", erc20Abi, token),
  ]);
  const [buyTax, sellTax, taxExp, afExp, taxProcessor, tQuote, metaURI, maxSupply, tOwner] = await Promise.all([
    rd<number>("buyTaxRate", taxTokenAbi, token), rd<number>("sellTaxRate", taxTokenAbi, token), rd<bigint>("taxExpirationTime", taxTokenAbi, token),
    rd<bigint>("antiFarmerExpirationTime", taxTokenAbi, token), rd<Address>("taxProcessor", taxTokenAbi, token), rd<Address>("quoteToken", taxTokenAbi, token),
    rd<string>("metaURI", taxTokenAbi, token), rd<bigint>("maxSupply", taxTokenAbi, token), rd<Address>("owner", taxTokenAbi, token),
  ]);
  const state = await pub.readContract({ address: PORTAL, abi: portalAbi, functionName: "getTokenV8Safe", args: [token] });
  const gate = await pub.readContract({ address: PORTAL, abi: portalAbi, functionName: "nftGate", args: [token] });
  const agentBal = await pub.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
  const bnbAfter = await pub.getBalance({ address: account.address });
  const quoteAfter = await pub.readContract({ address: QUOTE_TOKEN, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });

  log(`token name="${tName}" symbol="${tSymbol}" decimals=${tDecimals} totalSupply=${formatUnits(tSupply, tDecimals)} maxSupply=${formatUnits(maxSupply, tDecimals)}`);
  log(`tax buy=${buyTax} sell=${sellTax} taxExpiration=${new Date(Number(taxExp) * 1000).toISOString()} antiFarmerExpiration=${new Date(Number(afExp) * 1000).toISOString()}`);
  log(`taxProcessor=${taxProcessor} quoteToken=${tQuote} owner=${tOwner} metaURI=${metaURI}`);
  log(`portal state: status=${state.status} (1=Tradable) tokenVersion=${state.tokenVersion} quote=${state.quoteTokenAddress} reserve=${formatEther(state.reserve)} circ=${formatEther(state.circulatingSupply)} price=${state.price} progress=${state.progress} buyTax=${state.buyTaxRate} sellTax=${state.sellTaxRate}`);
  log(`nftGate=${gate}`);
  log(`launcher AGENT balance=${formatUnits(agentBal, tDecimals)}; BNB ${formatEther(feeBefore)} → ${formatEther(bnbAfter)} (Δ ${formatEther(feeBefore - bnbAfter)}); ANTB ${formatEther(quoteBal)} → ${formatEther(quoteAfter)} (Δ ${formatEther(quoteBal - quoteAfter)})`);

  const checks = {
    nameOk: tName === NAME,
    symbolOk: tSymbol === SYMBOL,
    tradable: state.status === 1,
    tokenVersionOk: state.tokenVersion === TOKEN_TAXED_V3,
    quoteOk: state.quoteTokenAddress.toLowerCase() === QUOTE_TOKEN.toLowerCase(),
    taxOk: buyTax === BUY_TAX_BPS && sellTax === SELL_TAX_BPS,
    noGate: gate === zeroAddress,
    predictedMatch: token.toLowerCase() === prep.predictedToken.toLowerCase(),
    firstBuyReceived: agentBal > 0n,
  };
  log(`checks: ${JSON.stringify(checks)}`);

  const out = {
    network: "mainnet",
    chainId: 56,
    token,
    predictedToken: prep.predictedToken,
    portal: PORTAL,
    taxTokenV3Impl: TAX_TOKEN_V3_IMPL,
    taxProcessor,
    launcher: account.address,
    beneficiary: BENEFICIARY,
    vanityBeneficiaryEvent: vanityBeneficiary,
    quoteToken: QUOTE_TOKEN,
    quoteTokenSymbol: "ANTB",
    meta: prep.meta,
    metaUrl: `https://flap.mypinata.cloud/ipfs/${prep.meta}`,
    txs,
    block: rcpt.blockNumber.toString(),
    gasUsed: rcpt.gasUsed.toString(),
    params: {
      name: NAME, symbol: SYMBOL, tokenVersion: "TOKEN_TAXED_V3 (6)", dexThresh: "FOUR_FIFTHS (1)", migratorType: "V2_MIGRATOR (1)", dexId: DEX_ID,
      salt: prep.salt, quoteAmt: `${QUOTE_AMT_HUMAN} ANTB`, quoteAmtWei: quoteAmt.toString(),
      buyTaxBps: BUY_TAX_BPS, sellTaxBps: SELL_TAX_BPS, taxDurationSec: TAX_DURATION.toString(), antiFarmerDurationSec: ANTI_FARMER_DURATION.toString(),
      mktBps: MKT_BPS, deflationBps: DEFLATION_BPS, dividendBps: DIVIDEND_BPS, lpBps: LP_BPS, commissionReceiver: zeroAddress, extensionID: "0x0 (no Agent ID gate)",
      dividendToken: `${QUOTE_TOKEN} (= quoteToken; required non-zero for ERC-20 quote, dividendBps = 0 so no dividends)`,
    },
    firstBuy: bought ? { antbIn: formatEther(bought.eth), feeAntb: formatEther(bought.fee), agentOut: formatEther(bought.amount) } : null,
    launcherAgentBalance: formatUnits(agentBal, tDecimals),
    spent: { bnb: formatEther(feeBefore - bnbAfter), antb: formatEther(quoteBal - quoteAfter) },
    onchain: {
      name: tName, symbol: tSymbol, decimals: tDecimals, totalSupply: tSupply.toString(), maxSupply: maxSupply.toString(),
      buyTaxRate: buyTax, sellTaxRate: sellTax, taxExpirationTime: taxExp.toString(), antiFarmerExpirationTime: afExp.toString(),
      owner: tOwner, metaURI, portalStatus: state.status, nftGate: gate, reserve: state.reserve.toString(), circulatingSupply: state.circulatingSupply.toString(), price: state.price.toString(),
    },
    checks,
    flapUrl: `https://flap.sh/bnb/${token}`,
    dexscreenerUrl: `https://dexscreener.com/bsc/${token}`,
    bscscanUrl: `https://bscscan.com/token/${token}`,
    launchedAt: new Date().toISOString(),
  };
  const p = writeJson("mainnet", OUT_FILE, out);
  log(`wrote ${p}`);
  appendLaunchLog("mainnet", `  - $AGENT live: token ${token} | Flap https://flap.sh/bnb/${token} | DexScreener https://dexscreener.com/bsc/${token} | beneficiary ${BENEFICIARY} | checks ${JSON.stringify(checks)}`);
}

main().catch((e) => {
  console.error("[launch] failed:", e?.shortMessage ?? e?.message ?? e);
  process.exit(1);
});
