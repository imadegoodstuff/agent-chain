# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public env is inlined at build time; keep devnet defaults consistent with fly.toml.
ARG NEXT_PUBLIC_RPC_URL=https://rpc.agent-chain.agency
ARG NEXT_PUBLIC_WEBSITE_URL=https://agent-chain.agency
ARG NEXT_PUBLIC_CHAIN_ID=11190
ARG NEXT_PUBLIC_CHAIN_NAME="AGENT CHAIN Devnet"
ARG NEXT_PUBLIC_SYMBOL=tANTB
ARG NEXT_PUBLIC_EXPLORER_NAME="AGENT CHAIN Explorer"
ARG NEXT_PUBLIC_GENESIS_SEAT=
ARG NEXT_PUBLIC_AGENT_REGISTRY=
ARG NEXT_PUBLIC_FEE_KEEPER=
ENV NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL \
    NEXT_PUBLIC_WEBSITE_URL=$NEXT_PUBLIC_WEBSITE_URL \
    NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID \
    NEXT_PUBLIC_CHAIN_NAME=$NEXT_PUBLIC_CHAIN_NAME \
    NEXT_PUBLIC_SYMBOL=$NEXT_PUBLIC_SYMBOL \
    NEXT_PUBLIC_EXPLORER_NAME=$NEXT_PUBLIC_EXPLORER_NAME \
    NEXT_PUBLIC_GENESIS_SEAT=$NEXT_PUBLIC_GENESIS_SEAT \
    NEXT_PUBLIC_AGENT_REGISTRY=$NEXT_PUBLIC_AGENT_REGISTRY \
    NEXT_PUBLIC_FEE_KEEPER=$NEXT_PUBLIC_FEE_KEEPER
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
