#!/bin/sh
# Docker CMD for the AGENT CHAIN devnet.
#  1. start `hardhat node` (chainId 11190, 250 ms blocks) in the background
#  2. wait until eth_chainId answers
#  3. deploy + seed contracts against the local node
#  4. run the activity bot in the foreground so the container stays alive
#
# State is in-memory only: every restart begins from block 0 and the deploy
# script re-creates the contracts at the same deterministic addresses.
set -eu

PORT="${PORT:-8545}"
RPC_URL="http://127.0.0.1:${PORT}"
export RPC_URL

echo "[start] launching hardhat node on 0.0.0.0:${PORT}"
npx hardhat node --hostname 0.0.0.0 --port "${PORT}" > /tmp/node.log 2>&1 &
NODE_PID=$!

# Stop the node if the bot or this script dies, so Fly restarts the machine.
trap 'echo "[start] shutting down"; kill ${NODE_PID} 2>/dev/null || true' EXIT INT TERM

echo "[start] waiting for RPC ..."
i=0
until node -e "
fetch('${RPC_URL}',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_chainId',params:[]})})
  .then(r=>r.json()).then(j=>{ if(j.result!=='0x2bb6') throw new Error('chainId '+j.result); })
  .catch(()=>process.exit(1))
" 2>/dev/null; do
  i=$((i+1))
  if [ "$i" -gt 120 ]; then
    echo "[start] node did not come up; log:"; cat /tmp/node.log; exit 1
  fi
  if ! kill -0 "${NODE_PID}" 2>/dev/null; then
    echo "[start] node process exited; log:"; cat /tmp/node.log; exit 1
  fi
  sleep 1
done
echo "[start] RPC up (chainId 0x2bb6) after ${i}s"

echo "[start] deploying contracts"
npx hardhat run scripts/deploy.ts --network devnet

echo "[start] starting activity bot"
start_bot() {
  npx hardhat run scripts/bot.ts --network devnet &
  BOT_PID=$!
}
start_bot

# Hardhat keeps every block in memory, so RSS grows without bound at 4 blocks/s.
# Rather than being OOM-killed mid-request, exit cleanly once the node passes
# MAX_NODE_RSS_KB; Fly restarts the machine and the chain starts over from
# block 0 (state reset is documented/accepted for the devnet).
MAX_NODE_RSS_KB="${MAX_NODE_RSS_KB:-700000}"
while kill -0 "${NODE_PID}" 2>/dev/null; do
  sleep 30
  if ! kill -0 "${BOT_PID}" 2>/dev/null; then
    echo "[start] bot exited, restarting"
    start_bot
  fi
  RSS_KB=$(awk '/VmRSS/ {print $2}' "/proc/${NODE_PID}/status" 2>/dev/null || echo 0)
  if [ "${RSS_KB:-0}" -gt "${MAX_NODE_RSS_KB}" ]; then
    echo "[start] node RSS ${RSS_KB} kB > ${MAX_NODE_RSS_KB} kB; restarting devnet (state reset)"
    kill "${BOT_PID}" 2>/dev/null || true
    exit 1
  fi
done
echo "[start] node exited; log tail:"; tail -n 50 /tmp/node.log
kill "${BOT_PID}" 2>/dev/null || true
exit 1
