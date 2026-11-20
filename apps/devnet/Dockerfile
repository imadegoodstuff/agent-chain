FROM node:20-slim

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Copy sources and compile contracts at build time (downloads solc 0.8.24).
COPY hardhat.config.ts tsconfig.json ./
COPY contracts ./contracts
COPY scripts ./scripts
COPY start.sh ./start.sh
# Strip CRLF in case the script was checked out on Windows, then compile.
RUN sed -i 's/\r$//' ./start.sh && chmod +x ./start.sh && npx hardhat compile

ENV NODE_ENV=production
ENV PORT=8545
EXPOSE 8545

CMD ["sh", "./start.sh"]
