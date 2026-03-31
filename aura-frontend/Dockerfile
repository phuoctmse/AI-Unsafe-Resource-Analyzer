FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY aura-frontend/package.json ./aura-frontend/

RUN pnpm install --frozen-lockfile --filter aura-frontend...

COPY aura-frontend ./aura-frontend

ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL} \
    NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL} \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/aura-frontend

RUN pnpm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Monorepo standalone layout: server.js lives under .next/standalone/<packageName>/, not standalone/server.js.
COPY --from=builder /app/aura-frontend/.next/standalone ./
COPY --from=builder /app/aura-frontend/.next/static ./aura-frontend/.next/static
COPY --from=builder /app/aura-frontend/public ./aura-frontend/public

RUN chown -R node:node /app

USER node

WORKDIR /app/aura-frontend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" || exit 1

CMD ["node", "server.js"]
