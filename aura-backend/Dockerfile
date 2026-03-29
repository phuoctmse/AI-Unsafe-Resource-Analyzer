FROM node:22-bookworm-slim AS builder

# Prisma needs OpenSSL present at generate time; slim image omits it and defaults to openssl-1.1.x binaries.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# pnpm needs this in non-interactive Docker builds (e.g. prune / install).
ENV CI=true

RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY aura-backend ./aura-backend

RUN pnpm install --frozen-lockfile --filter aura-backend...

WORKDIR /app/aura-backend

RUN chmod +x docker-entrypoint.sh \
  && pnpm exec prisma generate \
  && pnpm run build

# Production dependencies only, then regenerate Prisma client for that tree.
WORKDIR /app
RUN rm -rf node_modules aura-backend/node_modules \
  && pnpm install --frozen-lockfile --filter aura-backend... --prod \
  && pnpm --filter aura-backend exec prisma generate

FROM node:22-bookworm-slim AS runner

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder --chown=node:node /app /app

# Windows CRLF in shell scripts breaks the shebang on Linux.
RUN sed -i 's/\r$//' /app/aura-backend/docker-entrypoint.sh \
  && chmod +x /app/aura-backend/docker-entrypoint.sh

USER node

WORKDIR /app/aura-backend

ENV NODE_ENV=production

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3001/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
