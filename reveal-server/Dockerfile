# Build stage
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm build

# Production stage - must use glibc-based image (not alpine) for Reveal .NET engine
FROM node:22-slim AS production

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libicu72 \
    libssl3 \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod

# Download the native .NET binary for the current platform
RUN cd node_modules/reveal-sdk-node && node install.js

# Make the native binary executable
RUN chmod +x node_modules/.pnpm/reveal-sdk-node*/node_modules/reveal-sdk-node/native/*/RevealEnginePrg || true

COPY --from=builder /app/dist ./dist

# Mount the JWT public key at this path
COPY jwt-public.pem /app/jwt-public.pem

RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

ENV DOTNET_BUNDLE_EXTRACT_BASE_DIR=/tmp/.net

EXPOSE 5111

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5111/health || exit 1

CMD ["node", "dist/index.js"]
