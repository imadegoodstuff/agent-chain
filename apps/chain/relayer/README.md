# apps/chain/relayer — Beta bridge relayer (BSC `Bridge` → native ANTB on AGENT CHAIN)

Live: **https://agentchain-relayer.fly.dev/status** (Fly app `agentchain-relayer`, region `sin`, one machine, 1 GB volume).

## What it does

1. Polls BSC every 15 s for `Bridge.Deposited(from, l2Recipient, amount, nonce)` on `0x9eF8CA94a74B7Fbc5ae0b1F7a2dCaFCa14eE2A92` (deployed block 134,642,093), 20 blocks behind head (BSC fast finality is ~2 blocks), in ≤ 1000-block `eth_getLogs` chunks. `bsc-dataseed` rejects `eth_getLogs`, so after one failure that endpoint is skipped for logs and `bsc-rpc.publicnode.com` serves them; block numbers and reads still go to dataseed.
2. For every nonce it has not credited yet, sends **exactly `amount` wei of native ANTB** on AGENT CHAIN (chain 1119) from the chain owner `0x8D61bD807Da29C71eAbA6e85Fc42796E357fA443` to `l2Recipient`, in nonce order, waits for the receipt and records `{nonce, bscTx, l2Tx, l2Block}`.
3. Serves `GET /health` (200/503) and `GET /status` (cursor, BSC head, processed count, pending deposits with their last error, owner L2 balance, escrow check, last loop time).

## Guarantees and limits

- **Never double-pays a nonce.** State lives in one JSON file on the Fly volume (`/data/relayer-state.json`, atomic tmp+rename): `cursor`, `processed{nonce}`, `pending{nonce}`. The file is re-read immediately before every send; the L2 tx hash is written *before* the receipt is awaited, so a crash between broadcast and receipt is resolved on restart by looking the hash up instead of resending. Exactly one machine may run (`fly deploy --ha=false`).
- **Order is preserved.** Credits go strictly by nonce; if a nonce cannot be paid the relayer stops and retries that nonce next loop rather than skipping ahead ("first across" is honoured).
- **Refuses to send when the owner's L2 balance < amount + gas** — logs `INSUFFICIENT OWNER L2 BALANCE`, keeps the deposit pending (visible in `/status`), retries every loop. Refill: `npx tsx scripts/deposit-native.ts <antb>` from `apps/chain` (ERC20Inbox → arrives in ~1 min).
- **Escrow invariant check** (audit note in `contracts/bsc/README.md`): before crediting it verifies `ANTB.balanceOf(Bridge) + totalWithdrawn ≥ totalDeposited` on BSC; if the issuer ever freezes/claws back the escrow, crediting pauses instead of minting unbacked L2 balance.
- Per-credit hard cap `MAX_CREDIT_WEI` (1 ANTB, the Beta per-address cap); larger deposits are left pending for manual review.
- A reorg deeper than 20 BSC blocks that removes a deposit after it was credited is not handled automatically (would need a manual clawback). BSC has not reorged past finality since Luban (2023).

## Trust model — read before depositing

This is a **centralised relayer during Beta**. Concretely:

- Your ANTB stays **escrowed in the BSC `Bridge` contract**; the relayer does not touch it. The owner of `Bridge` (deployer EOA `0x0F03F1c68d4105dd97011c15cC61467164583A4C`, to be moved to a multisig) can move escrowed ANTB with `withdrawTo(address,uint256)` — no timelock, any destination, every call emits `EscrowWithdrawn`. There is no user-side refund function. Deposit only amounts you are prepared to have held under those terms.
- The L2 credit is a **plain native transfer from the chain owner's L2 balance**, which the chain owner pre-funds by bridging ANTB through the canonical Nitro `ERC20Inbox` (`0x09A1f23Dc51088949bc043D6A3362d46dEE9b5b6`, now also recorded on-chain via `Bridge.setInbox`). The L2 balance you receive is real native ANTB backed 1:1 by ANTB locked in the Nitro bridge escrow on BSC — but the step that turns *your* BSC deposit into that L2 transfer is the relayer, an off-chain process run by the AGENT CHAIN team. If it stops, deposits are delayed until it is restarted (nothing is lost; the state file and the on-chain events let anyone recompute what is owed).
- The chain owner key signs the credits. It is the same EOA that owns the rollup (via UpgradeExecutor) and ArbOS; compromise of that key compromises the chain, not only the relayer.
- Withdrawals L2 → BSC are not offered during Beta (the canonical Nitro outbox path exists for the owner; a user-facing flow comes with the token bridge).
- Exit path: once the canonical token bridge replaces this flow, escrowed ANTB is moved by `withdrawTo` into the Nitro bridge (or returned to depositors), and the relayer is retired.

Everything the relayer does is auditable from public data: BSC `Deposited` events ↔ L2 transfers from `0x8D61…A443` ↔ `/status`.

## Run

```powershell
cd apps/chain/relayer
npm install; npm run typecheck
# local (state file in temp, L2 via the public gateway — the owner is allow-listed):
$env:CHAIN_OWNER_PRIVATE_KEY = '<from apps/chain/.env>'; $env:STATE_FILE = "$env:TEMP\relayer.json"; $env:L2_RPC_URL = 'https://agentchain-gateway.fly.dev'; npm run dev
curl http://127.0.0.1:8080/status
```

Fly (already done 2026-11-20; re-deploy with the same flags):

```powershell
fly apps create agentchain-relayer --org personal
fly volumes create relayer_data --region sin --size 1 -a agentchain-relayer --yes        # vol_vz862znwxoenkzqv
fly secrets set -a agentchain-relayer CHAIN_OWNER_PRIVATE_KEY=<from apps/chain/.env>  # or `fly secrets import`
fly deploy --remote-only --ha=false -a agentchain-relayer
curl https://agentchain-relayer.fly.dev/status
```

Env (all in `fly.toml` except the key): `BSC_RPC_URLS`, `BRIDGE_ADDRESS`, `BRIDGE_DEPLOY_BLOCK`, `L2_RPC_URL` (`http://agentchain-node.internal:8547` inside Fly), `L2_CHAIN_ID`, `CONFIRMATIONS`, `CHUNK_BLOCKS`, `POLL_INTERVAL_MS`, `STATE_FILE`, `MAX_CREDIT_WEI`, secret `CHAIN_OWNER_PRIVATE_KEY`.

## Operations

| Task | How |
|---|---|
| Is it alive / caught up? | `GET /health` → 200 when the last loop was < 75 s ago and errored nothing; `cursor` should trail `bscHead` by ≈ 20 |
| Deposits waiting | `GET /status` → `pending[]` with `lastError` (e.g. insufficient owner balance) |
| Refill the owner on L2 | `cd apps/chain; npx tsx scripts/deposit-native.ts 0.5` |
| Inspect / back up state | `fly ssh console -a agentchain-relayer -C "cat /data/relayer-state.json"`; Fly snapshots the volume daily |
| Reset the cursor (re-scan) | edit `cursor` in the state file — processed nonces are never re-paid |
| Logs | `fly logs -a agentchain-relayer` |
