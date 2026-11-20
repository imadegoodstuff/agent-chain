#!/usr/bin/env bash
# AGENT CHAIN Nitro node entrypoint (Fly.io).
#
# Inputs (Fly secrets / env):
#   NETWORK                    testnet | mainnet            (selects /home/user/config/node-config.<NETWORK>.json)
#   CHAIN_NAME                 "AGENT CHAIN Testnet" | "AGENT CHAIN"
#   PARENT_CHAIN_RPC_URL       BSC RPC (dedicated endpoint recommended)
#   CHAIN_INFO_JSON            output of scripts/write-chain-info.ts (compact JSON array)  — written to the volume
#   BATCH_POSTER_PRIVATE_KEY   hex (0x optional)
#   VALIDATOR_PRIVATE_KEY      hex (0x optional)
#   SEQUENCER_SENDER_WHITELIST optional comma-separated addresses; when set the sequencer rejects all other senders
#   NITRO_EXTRA_ARGS           optional extra CLI flags appended verbatim
set -euo pipefail

DATA_DIR=/home/user/.arbitrum
CONF_DIR=/home/user/config
NETWORK="${NETWORK:-testnet}"
TEMPLATE="${CONF_DIR}/node-config.${NETWORK}.json"
RENDERED="${DATA_DIR}/node-config.rendered.json"

mkdir -p "${DATA_DIR}"

if [[ ! -f "${TEMPLATE}" ]]; then
  echo "entrypoint: no template for NETWORK=${NETWORK} (${TEMPLATE})" >&2
  exit 1
fi

# chain-info.json: prefer the secret (always fresh); fall back to a file already on the volume.
if [[ -n "${CHAIN_INFO_JSON:-}" ]]; then
  printf '%s' "${CHAIN_INFO_JSON}" > "${DATA_DIR}/chain-info.json"
elif [[ ! -f "${DATA_DIR}/chain-info.json" ]]; then
  echo "entrypoint: CHAIN_INFO_JSON secret missing and ${DATA_DIR}/chain-info.json not present" >&2
  exit 1
fi
jq -e 'type=="array" and length==1 and .[0]["chain-id"]' "${DATA_DIR}/chain-info.json" >/dev/null \
  || { echo "entrypoint: chain-info.json is not a one-element chain info array" >&2; exit 1; }

: "${PARENT_CHAIN_RPC_URL:?PARENT_CHAIN_RPC_URL is required}"
: "${BATCH_POSTER_PRIVATE_KEY:?BATCH_POSTER_PRIVATE_KEY is required}"
: "${VALIDATOR_PRIVATE_KEY:?VALIDATOR_PRIVATE_KEY is required}"
export CHAIN_NAME="${CHAIN_NAME:-AGENT CHAIN}"
# Nitro wants raw hex without 0x
export BATCH_POSTER_PRIVATE_KEY="${BATCH_POSTER_PRIVATE_KEY#0x}"
export VALIDATOR_PRIVATE_KEY="${VALIDATOR_PRIVATE_KEY#0x}"
export PARENT_CHAIN_RPC_URL

# Only substitute the variables we own (keeps any other '$' in the JSON intact).
envsubst '${CHAIN_NAME} ${PARENT_CHAIN_RPC_URL} ${BATCH_POSTER_PRIVATE_KEY} ${VALIDATOR_PRIVATE_KEY}' \
  < "${TEMPLATE}" > "${RENDERED}"
chmod 600 "${RENDERED}"
jq -e . "${RENDERED}" >/dev/null || { echo "entrypoint: rendered config is not valid JSON" >&2; exit 1; }

# Sanity: the config's chain id must match the chain-info entry.
CFG_CHAIN_ID=$(jq -r '.chain.id' "${RENDERED}")
INFO_CHAIN_ID=$(jq -r '.[0]["chain-id"]' "${DATA_DIR}/chain-info.json")
if [[ "${CFG_CHAIN_ID}" != "${INFO_CHAIN_ID}" ]]; then
  echo "entrypoint: chain id mismatch: config=${CFG_CHAIN_ID} chain-info=${INFO_CHAIN_ID}" >&2
  exit 1
fi

ARGS=(
  --conf.file "${RENDERED}"
  # replicate the base image's default entrypoint flags (we override ENTRYPOINT)
  --validation.wasm.allowed-wasm-module-roots /home/user/nitro-legacy/machines,/home/user/target/machines
)
if [[ -n "${SEQUENCER_SENDER_WHITELIST:-}" ]]; then
  ARGS+=(--execution.sequencer.sender-whitelist "${SEQUENCER_SENDER_WHITELIST}")
fi
if [[ -n "${NITRO_EXTRA_ARGS:-}" ]]; then
  # shellcheck disable=SC2206
  ARGS+=(${NITRO_EXTRA_ARGS})
fi

echo "entrypoint: starting nitro for chain ${CFG_CHAIN_ID} (${NETWORK}) with parent ${PARENT_CHAIN_RPC_URL%%\?*}"
exec /usr/local/bin/nitro "${ARGS[@]}" "$@"
