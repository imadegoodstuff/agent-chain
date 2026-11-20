# syntax=docker/dockerfile:1
# Build context = repo root (E:\scash\agent-chain) so docs/ and the devnet
# deployment file can be copied in:
#   fly deploy --remote-only --config apps/web/fly.toml --dockerfile apps/web/Dockerfile .

FROM node:20-alpine AS deps
WORKDIR /app
COPY apps/web/package.json apps/web/package-lock.json* ./
RUN npm ci --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY apps/web/ ./
# Optional inputs. The bracket-glob trick makes COPY succeed even when the
# optional source does not exist yet (SPEC.md always exists in the root).
COPY SPEC.md doc[s] ./docs/
COPY SPEC.md apps/devnet/deployments/devnet.jso[n] ./deployments/
ARG NEXT_PUBLIC_RPC_URL=https://rpc.agent-chain.agency
ARG NEXT_PUBLIC_EXPLORER_URL=https://explorer.agent-chain.agency
ARG NEXT_PUBLIC_SITE_URL=https://agent-chain.agency
ENV NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL \
    NEXT_PUBLIC_EXPLORER_URL=$NEXT_PUBLIC_EXPLORER_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    DOCS_DIR=/app/docs \
    DEPLOYMENTS_DIR=/app/deployments
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DOCS_DIR=/app/docs \
    DEPLOYMENTS_DIR=/app/deployments
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/docs ./docs
COPY --from=builder --chown=nextjs:nodejs /app/deployments ./deployments
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
