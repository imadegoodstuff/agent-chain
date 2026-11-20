# AGENT CHAIN Nitro node — sequencer + batch poster + BoLD validator in one container.
# Base: official Arbitrum Nitro node image (v3.12.4, 2026-11-09; supports ArbOS 61 / consensus-v61).
# Build: fly deploy --remote-only   (no local Docker needed)
ARG NITRO_IMAGE=offchainlabs/nitro-node:v3.12.4-960ca0a-stripped
FROM ${NITRO_IMAGE}

USER root
RUN apt-get update \
 && apt-get install -y --no-install-recommends gettext-base jq ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

# Fail the build early if this image variant lacks the replay machines the validator needs.
RUN test -d /home/user/target/machines && ls /home/user/target/machines | head -20

COPY --chown=user:user config/node-config.testnet.json config/node-config.mainnet.json /home/user/config/
COPY --chown=user:user node/entrypoint.sh /usr/local/bin/agentchain-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/agentchain-entrypoint.sh \
 && chmod +x /usr/local/bin/agentchain-entrypoint.sh \
 && mkdir -p /home/user/.arbitrum && chown -R user:user /home/user/.arbitrum

USER user
WORKDIR /home/user
VOLUME ["/home/user/.arbitrum"]

# 8547 HTTP RPC, 8548 WS RPC, 9642 sequencer feed
EXPOSE 8547 8548 9642

ENV NETWORK=testnet
ENTRYPOINT ["/usr/local/bin/agentchain-entrypoint.sh"]
