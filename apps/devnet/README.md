# AGENT CHAIN Devnet (`apps/devnet`)

Single-node EVM devnet for AGENT CHAIN (Phase 0). A Hardhat v2 node with
**chain ID 11190**, **250 ms blocks** and native currency **tANTB** (test token,
no value), plus the three Phase 0 contracts and an activity bot that keeps
blocks non-empty. Deployed on Fly.io (`sin`) as `agentchain-rpc`.

> Devnet tokens have no value. State is in-memory and resets on every restart.

## Public endpoint

| | |
|---|---|
| RPC (HTTPS) | `https://agentchain-rpc.fly.dev` |
| Chain ID | `11190` (`0x2bb6`) |
| Currency | tANTB, 18 decimals |
| Block time | 250 ms (interval mining) |
| Explorer | `https://agentchain-explorer.fly.dev` |

Quick check:

```sh
curl -s https://agentchain-rpc.fly.dev \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
# {"jsonrpc":"2.0","id":1,"result":"0x2bb6"}
```

CORS: the Hardhat node answers every origin with `Access-Control-Allow-Origin: *`
(and `*` for preflight headers), so browsers (explorer, website) can call it directly.

### Add the network to a wallet (`wallet_addEthereumChain`)

```json
{
  "chainId": "0x2bb6",
  "chainName": "AGENT CHAIN Devnet",
  "nativeCurrency": { "name": "Test ANTB", "symbol": "tANTB", "decimals": 18 },
  "rpcUrls": ["https://agentchain-rpc.fly.dev"],
  "blockExplorerUrls": ["https://agentchain-explorer.fly.dev"]
}
```

## Contracts (SPEC section 7)

Addresses are deterministic: the deployer is always Hardhat account #0 and the
contracts are created at nonces 0, 1, 2 on a fresh chain, so they are identical
after every restart. They are also written to `deployments/devnet.json`
(`{ chainId, rpc, contracts, deployer, deployedAt }`), which the website reads at build time.

| Contract | Address | Notes |
|---|---|---|
| `AgentRegistry` | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | owner-managed `address => {bytes32 handleHash, bool active}`; `register`, `revoke`, `isAgent`, `agentOf`, `agentCount` |
| `GenesisSeat` | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | non-transferable ERC-721-like; `mint()` once per address, seatIds from 1; `seatOf`, `ownerOf`, `totalSeats`; `SeatMinted(address,uint256)` |
| `FeeKeeper` | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` | `usdPerGas` (1e18-scaled), `antbUsd` (1e8-scaled), `minBaseFeeWei()`; `BaseFeeUpdated(antbUsd, minBaseFeeWei)` |

Deployer / owner: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (account #0).

Seed state written by `scripts/deploy.ts` on every boot:

- `FeeKeeper`: `usdPerGas = 45_000_000_000` ($0.045 per 1,000,000 gas), `antbUsd = 9_717_000_000` ($97.17) → `minBaseFeeWei() ≈ 463,105,896` (SPEC: ≈ 463,105,000).
- `AgentRegistry`: accounts #0–#9 registered with `handleHash = keccak256("alice.ai")`, `"bob.ai"`, `"carol.ai"`, `"dave.ai"`, `"erin.ai"`, `"frank.ai"`, `"grace.ai"`, `"heidi.ai"`, `"ivan.ai"`, `"judy.ai"`.
- `GenesisSeat`: seats 1–12 minted to accounts #0–#11.

The node's `initialBaseFeePerGas` is 463,105,000 wei; Hardhat then applies EIP-1559
adjustment per block, so the live base fee drifts toward the floor on mostly-empty blocks.

## Activity bot

`scripts/bot.ts` runs forever inside the container. Every 1–3 s it sends one of:

- a tANTB transfer between two random prefunded accounts (~75 %);
- `FeeKeeper.setAntbUsd` random walk of ±0.3 % around $97 (~25 %, re-centred if it drifts > 8 %);
- about once per 30 s: fund a fresh random wallet from account #0, `GenesisSeat.mint()` from it,
  then `AgentRegistry.register` it as `agent-<seatId>.ai`.

Errors are caught, logged and retried on the next tick; `start.sh` restarts the bot if it exits.

## Accounts (devnet only)

The node uses the Hardhat default mnemonic. **It is public; never use it anywhere with value.**

```
test test test test test test test test test test test junk
```

20 accounts (`m/44'/60'/0'/0/{0..19}`), each prefunded with 10,000 tANTB. Account #0 is
`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (private key
`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`).

## State resets

The Hardhat node keeps everything in memory and its RSS grows with every block
(4 blocks/s). `start.sh` watches the node and exits once RSS exceeds
`MAX_NODE_RSS_KB` (default 700 MB) so the machine restarts cleanly instead of
being OOM-killed; expect a planned reset every several hours. Whenever the Fly
machine restarts (memory cap, deploy, crash, host maintenance) the chain starts again from block 0,
`start.sh` re-runs the deploy script, the contracts reappear at the same
addresses with the seed state above, and the bot resumes. Anything else written
to the chain (your transactions, extra seats) is lost. Block numbers and
timestamps are not monotonic across restarts; the explorer must tolerate that.

## Local run

Requires Node 20+.

```sh
cd apps/devnet
npm install
npm run compile

# terminal 1: node on 0.0.0.0:8545 (chainId 11190, 250 ms blocks)
npm run node

# terminal 2: deploy + seed, then start the bot
npm run deploy     # writes deployments/devnet.json
npm run bot
```

`RPC_URL` (default `http://127.0.0.1:8545`) overrides the target for `deploy` / `bot`;
`PUBLIC_RPC_URL` overrides the `rpc` value written to `deployments/devnet.json`.
Or run exactly what the container runs: `sh start.sh`.

## Deploy to Fly.io

No local Docker is needed.

```sh
cd apps/devnet
fly apps create agentchain-rpc        # once
fly deploy --remote-only
fly logs
```

`fly.toml`: app `agentchain-rpc`, region `sin`, `shared-cpu-1x` / 1024 MB,
`internal_port 8545`, `force_https`, `auto_stop_machines = false`,
`min_machines_running = 1`, TCP + HTTP(POST) checks on 8545. If the machine
OOMs, raise `[[vm]] memory` to `"2048mb"` and redeploy. Each deploy restarts
the chain (see "State resets").

## Layout

```
contracts/            AgentRegistry.sol, GenesisSeat.sol, FeeKeeper.sol (Solidity 0.8.24)
scripts/deploy.ts     deploy + seed, writes deployments/devnet.json
scripts/bot.ts        activity bot
deployments/          devnet.json (committed; addresses are deterministic)
hardhat.config.ts     chainId 11190, interval 250 ms, 20 accounts x 10000 tANTB
start.sh              container entrypoint: node -> wait -> deploy -> bot
Dockerfile, fly.toml  Fly.io deployment (node:20-slim)
```
