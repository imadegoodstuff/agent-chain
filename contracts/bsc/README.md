# AGENT CHAIN — BSC-side contracts

Parent-chain (BNB Smart Chain) contracts for AGENT CHAIN. These are the contracts Binance
Agent ID holders interact with directly on BSC: register as an agent, claim a Genesis Seat,
and deposit ANTB into the Beta bridge. They are the scoring surface for the Binance Agent ID
Hackathon (see `../../SPEC.md` §8).

Stack: Hardhat 2 (TypeScript, ethers v6), Solidity 0.8.24, OpenZeppelin 5.x, optimizer on
(200 runs), EVM target `cancun` (supported on BSC since the Pascal hardfork).

| | |
|---|---|
| Agent ID (ERC-721, soulbound, 1 per KYC'd human) | `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` — "SPACE ID Agent ID" (`AI`), deployed block 127,950,748 |
| BAB token (ERC-721, soulbound, alternative credential) | `0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8` — "Binance Account Bound Token" (`BABT`), transparent proxy |
| ANTB (BEP-20, 18 decimals, non-rebasing, beacon proxy) | `0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53` |

An address is an **agent** when `AgentID.balanceOf(a) > 0 || (bab != 0 && BAB.balanceOf(a) > 0)`.
Nothing here resolves names, acts on behalf of a third party, or stores personal data.

## Contracts

```
contracts/
  interfaces/IAgentCredential.sol  isAgent(address) / agentId() / bab()
  AgentGate.sol                    abstract: Ownable + the credential check + onlyAgent
  AgentRegistryMirror.sol          register() — scored opt-in registry
  GenesisSeatClaim.sol             claim()    — soulbound numbered seat, on-chain metadata
  Bridge.sol                       deposit()  — ANTB escrow, Beta caps
  mocks/MockAgentId.sol            testnet/unit-test stand-in for Agent ID (public mint)
  mocks/MockERC20.sol              testnet/unit-test stand-in for ANTB (public mint)
```

### `AgentGate` (abstract, inherited by all three)

| Function | Access | Notes |
|---|---|---|
| `isAgent(address) → bool` | view | Agent ID balance > 0, or BAB balance > 0 when BAB is set |
| `agentId() → address` | view | immutable |
| `bab() → address` | view | `address(0)` = BAB disabled |
| `setBab(address)` | **owner** | enable / rotate / disable the alternative credential; emits `BabUpdated` |

### `AgentRegistryMirror`

Opt-in registry. The only input is `msg.sender`; there is deliberately **no `registerFor(address)`**.
Registration is permanent — the owner cannot revoke or edit entries.

| Function | Access | Notes |
|---|---|---|
| `register() → index` | agent | once per address; stores 1-based index + `block.timestamp`; emits `AgentRegistered(agent, index)` |
| `count()` | view | number of registered agents |
| `isRegistered(a)` / `indexOf(a)` / `registeredAt(a)` | view | 0 when not registered |
| `agentAt(index)` | view | 1-based, reverts out of range |

### `GenesisSeatClaim` — ERC-721 `AGENT CHAIN Genesis Seat` (`SEAT`)

| Function | Access | Notes |
|---|---|---|
| `claim() → seatId` | agent | once per address; sequential from 1; emits `SeatClaimed(holder, seatId)` and ERC-721 `Transfer(0, holder, seatId)` |
| `totalSeats()` / `seatOf(a)` / `claimOpen()` / `claimDeadline()` | view | |
| `tokenURI(id)` | view | `data:application/json;base64,…` with name, description, `Seat` attribute and inline SVG |
| `transferFrom` / `safeTransferFrom` / `approve` / `setApprovalForAll` | — | **always revert** `NonTransferable()`; no burn exists |
| `pause()` / `unpause()` | **owner** | stop / resume new claims |
| `setClaimDeadline(uint256)` | **owner** | unix seconds; `0` = no deadline |

A Genesis Seat is an identity and priority marker: it records that the holder was a verified
human's agent before mainnet and is mirrored into the L2 genesis block. **It confers no rights to
revenue, equity or returns.** Any fee distribution described elsewhere is a governance parameter
that can change and is not promised by this contract.

### `Bridge` (ANTB deposit side, Mainnet Beta)

| Function | Access | Notes |
|---|---|---|
| `deposit(amount, l2Recipient) → nonce` | agent | `transferFrom` ANTB into escrow; per-address and global caps on cumulative deposits; emits `Deposited(from, l2Recipient, amount, nonce)` |
| `pendingDeposits()` | view | ANTB currently escrowed in the contract |
| `remainingFor(a)` / `remainingGlobal()` | view | headroom under the caps |
| `perAddressCap()` / `globalCap()` / `totalDeposited()` / `totalWithdrawn()` / `depositedBy(a)` / `depositCount()` / `inbox()` / `antb()` | view | |
| `pause()` / `unpause()` | **owner** | stop / resume deposits |
| `setCaps(perAddress, global)` | **owner** | Constructor defaults 1 ANTB / 500 ANTB; live Genesis Deposit caps 0.1 / 100 |
| `setInbox(address)` | **owner** | records the Nitro Inbox; informational only in Beta. Set 2026-11-20 to the live AGENT CHAIN `ERC20Inbox` `0x09A1f23Dc51088949bc043D6A3362d46dEE9b5b6` (tx `0x3f629035…6433`, block 134,653,241; `scripts/set-inbox.ts`) |
| `withdrawTo(to, amount)` | **owner** | **Beta escrow mechanism** — see below |

## Owner permissions

Every privileged function, who holds it and why. The owner of all three contracts is the AGENT
CHAIN deployer EOA at launch (address below) and is intended to move to a multisig before the
bridge caps are lifted (Phase 4). Nothing below lets the owner mint, burn, move or reassign a
registration or a seat, and nothing lets the owner take ANTB from a user's wallet.

| Contract | Function | Holder | Why it exists | Risk / mitigation |
|---|---|---|---|---|
| all three | `setBab(address)` | owner | BAB is an upgradeable proxy and an *alternative* credential; owner can enable, rotate or disable it. The Agent ID path is immutable and cannot be turned off. | Can only widen or narrow who counts via BAB. Emits `BabUpdated`. |
| all three | `transferOwnership` / `renounceOwnership` (OZ `Ownable`) | owner | hand over to a multisig; renounce to freeze parameters | standard OZ two-event flow |
| `GenesisSeatClaim` | `pause()` / `unpause()` | owner | stop claims if the Agent ID contract or BAB misbehaves | existing seats unaffected |
| `GenesisSeatClaim` | `setClaimDeadline(uint256)` | owner | close the claim window before genesis is written | only blocks *new* claims; `0` reopens |
| `Bridge` | `pause()` / `unpause()` | owner | emergency stop for deposits | escrow untouched |
| `Bridge` | `setCaps(uint256,uint256)` | owner | Constructor defaults 1 ANTB / 500 ANTB; set to 0.1 / 100 for the Genesis Deposit window (SPEC §8) — raised as the chain proves out | only affects future deposits; lowering below current totals simply blocks new deposits |
| `Bridge` | `setInbox(address)` | owner | records the real Nitro Inbox (set to `0x09A1…b5b6`, the AGENT CHAIN `ERC20Inbox`) | no effect on funds in this version |
| `Bridge` | `withdrawTo(address,uint256)` | owner | **Beta escrow.** Deposits are held in this contract and credited 1:1 on AGENT CHAIN by the Beta relayer (`apps/chain/relayer`, status https://agentchain-relayer.fly.dev/status) within minutes, ordered by nonce. `withdrawTo` is how escrowed ANTB is moved into the Nitro `ERC20Inbox` (to back the relayer's L2 credits) or returned to depositors if Beta is wound down. | Trusted step during Beta, bounded by the escrowed balance (max 500 ANTB under default caps), every call emits `EscrowWithdrawn`. This power disappears when the canonical token bridge replaces this contract. |

Mock contracts (`MockAgentId`, `MockERC20`) have **public mint** and are deployed on testnet /
local only, never on mainnet.

## Development

```bash
cd contracts/bsc
npm install
npm run compile
npm test                      # unit tests with mocks (no network)
BSC_FORK_URL=https://bsc-rpc.publicnode.com npm run test:fork   # optional, real Agent ID on a mainnet fork
```

Tests cover: non-holder reverts, holder registers / claims once, double-claim reverts,
non-transferability (transfer / safeTransfer / approve / setApprovalForAll), bridge caps
(per-address, global, raising caps), pause / unpause, owner-only `withdrawTo` / `setInbox` /
`setBab`, and on-chain `tokenURI`. The fork suite impersonates a real Agent ID holder.

## Deployer

Generate a fresh keypair (the private key is written **only** to `contracts/bsc/.env`, which is
gitignored at the repo root and here; the address goes to `deployments/deployer.txt`):

```bash
npm run new-deployer          # refuses to overwrite an existing key; add -- --force to rotate
```

Current deployer / initial owner: **`0x0F03F1c68d4105dd97011c15cC61467164583A4C`**
(fund with BNB for gas before deploying; ~0.02 BNB on mainnet is enough for the three contracts).

## Deployment

`.env` (copy from `.env.example`):

```
DEPLOYER_PRIVATE_KEY=0x…     # from new-deployer
BSCSCAN_API_KEY=…            # https://bscscan.com/myapikey
OWNER_ADDRESS=               # optional; defaults to the deployer
```

```bash
# BSC Testnet (chainId 97) — deploys MockAgentId + MockERC20 (tANTB) first, then the three contracts
npx hardhat run scripts/deploy.ts --network bscTestnet

# BSC Mainnet (chainId 56) — uses the real Agent ID, BAB and ANTB addresses
npx hardhat run scripts/deploy.ts --network bsc
```

Writes `deployments/bscTestnet.json` / `deployments/bsc.json` with addresses, constructor args and
parameters. Constructor parameters:

- `AgentRegistryMirror(agentId, bab, owner)`
- `GenesisSeatClaim(agentId, bab, owner)`
- `Bridge(antb, agentId, bab, owner, perAddressCap = 1e18, globalCap = 500e18)`

Optional env: `BAB_ADDRESS` (override / `0x0` to disable), `PER_ADDRESS_CAP`, `GLOBAL_CAP` (whole ANTB).

## Verification (BscScan + Sourcify)

```bash
npx hardhat run scripts/verify.ts --network bscTestnet
npx hardhat run scripts/verify.ts --network bsc
```

`scripts/verify.ts` reads `deployments/<network>.json` and calls `hardhat verify` for each contract
with the recorded constructor arguments; already-verified contracts are skipped. Manual equivalent:

```bash
npx hardhat verify --network bsc <AgentRegistryMirror> 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F 0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8 <owner>
npx hardhat verify --network bsc <GenesisSeatClaim>    0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F 0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8 <owner>
npx hardhat verify --network bsc <Bridge> 0x38Dd26788Cf2d901E3aBf04efE3007d459d0Fc53 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F 0x2B09d47D550061f995A3b5C6F0Fd58005215D7c8 <owner> 1000000000000000000 500000000000000000000
```

## Agent ID holder snapshot

`scripts/snapshot.ts` replays every ERC-721 `Transfer` of the Agent ID registry from its deployment
block (127,950,748) in adaptive chunks (≤ 49,999 blocks, halves on range errors, backs off on
429s), derives holders from per-address balances and writes `snapshots/agent-id-holders.json`:

```json
{ "contract": "0x60B9…022F", "chainId": 56, "fromBlock": 127950748, "blockNumber": 134639601,
  "lastScannedBlock": 134639601, "complete": true, "count": 236355, "transferEvents": 236355,
  "generatedAt": "…", "rpc": "…", "holders": ["0x…", "…"] }
```

```bash
npm run snapshot                     # to head
npm run snapshot -- --to 134639601   # reproducible upper block
npm run snapshot -- --resume         # continue a partial run (progress is saved every 10 chunks)
```

Most free public BSC RPCs cannot serve this scan (publicnode prunes logs older than ~1 day;
1rpc / drpc / tatum cap ranges at 50–100 blocks; dataseed returns `limit exceeded`). The default
endpoint is NodeReal's public BSC endpoint, which has full history; override with
`SNAPSHOT_RPC_URL`. The script aborts if the endpoint returns no logs through the first mint
(2026-10-19), which indicates pruned history.

Latest run: **236,355 holders**, blocks 127,950,748 → 134,639,601 (2026-11-20), 236,355 transfer
events, zero non-mint transfers (the token is soulbound, so holders == mints).

## Addresses

| Network | AgentRegistryMirror | GenesisSeatClaim | Bridge | MockAgentId | MockERC20 (tANTB) |
|---|---|---|---|---|---|
| BSC Testnet (97) | TBA | TBA | TBA | TBA | TBA |
| BSC Mainnet (56) | [`0x9C5488f9Aa9468B1db3Cc6B71143A8B2Ca810CF0`](https://bscscan.com/address/0x9C5488f9Aa9468B1db3Cc6B71143A8B2Ca810CF0#code) | [`0x3972579dd0128BF0b6778cB3B457ba1d14D1695b`](https://bscscan.com/address/0x3972579dd0128BF0b6778cB3B457ba1d14D1695b#code) | [`0x9eF8CA94a74B7Fbc5ae0b1F7a2dCaFCa14eE2A92`](https://bscscan.com/address/0x9eF8CA94a74B7Fbc5ae0b1F7a2dCaFCa14eE2A92#code) | — | — |

Mainnet deployed and BscScan-verified 2026-11-20 (solc 0.8.24, optimizer 200, cancun). Owner at launch: deployer EOA `0x0F03F1c68d4105dd97011c15cC61467164583A4C` (to be moved to a multisig; it will never call `renounceOwnership`). Live Bridge caps during the **Genesis Deposit window**: `perAddressCap = 0.1 ANTB`, `globalCap = 100 ANTB` (set via `scripts/open-bridge.ts`); constructor defaults were 1 / 500 and will be restored by `setCaps` as the chain proves out.

**AGENT CHAIN mainnet (chain 1119) is live since 2026-11-20.** Deposits are credited 1:1 by the Beta relayer within minutes, ordered by nonce — status at https://agentchain-relayer.fly.dev/status, trust model in `apps/chain/relayer/README.md`. `Bridge.inbox()` = `0x09A1f23Dc51088949bc043D6A3362d46dEE9b5b6` (the chain's `ERC20Inbox`; `INBOX=… npx hardhat run scripts/set-inbox.ts --network bsc`, recorded in `deployments/bsc.json#inbox`).

### Independent audit notes (2026-11-20)

No Critical/High findings; bytecode and verified source match this repo. Disclosed design limits of the Beta escrow:

- `withdrawTo` is unrestricted in destination and has no timelock; there is no user-side `refund()`. Mitigation: multisig owner, UI disclosure, bounded caps.
- Deposits are accounted by `amount`, not by received balance. ANTB is an upgradeable beacon proxy controlled by its issuer (can pause or compliance-block any address). The relayer checks `ANTB.balanceOf(Bridge) + totalWithdrawn ≥ totalDeposited` before every crediting round and pauses crediting if it does not hold (implemented in `apps/chain/relayer`).
- `setBab` lets the owner point the BAB slot at any ERC-721, which could widen the gate beyond KYC'd humans. It will only ever be set to `address(0)` or the canonical BAB proxy.
- `l2Recipient` may be a contract address on BSC; such an address has no code in AGENT CHAIN genesis. The UI warns when the recipient has code.
- `isAgent(address(0))` reverts rather than returning false; `isAgent` depends on the Agent ID contract not reverting (it is a non-upgradeable contract).

`$AGENT` (Flap launch) is the fourth scored contract and is not part of this package; it has not been launched.

## Disclaimers

AGENT CHAIN is independent and not affiliated with, endorsed by, or sponsored by Anthropic, PBC,
Binance, or BNB Chain. ANTB is issued by BTech Holdings Ltd (bStocks) under ADGM rules; bStocks
are not available to US persons and are restricted in other jurisdictions.

Nothing here is investment advice. Genesis Seats and `$AGENT` confer no rights to revenue, equity,
or returns; fee distributions are protocol parameters that governance can change. The Beta bridge
holds funds in a contract whose owner can move them (see Owner permissions); deposit only what you
are prepared to have escrowed under those terms.

License: MIT.
