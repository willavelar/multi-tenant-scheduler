FROM node:20-alpine AS base
RUN npm install -g pnpm@10.33.0

# --- deps: install full workspace deps (cached) ---
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/
RUN pnpm install --frozen-lockfile

# --- builder: compile shared then api ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api
RUN pnpm --filter @scheduler/shared build && pnpm --filter api build

# --- runner: prod deps only + compiled output ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/migrations ./packages/api/migrations
WORKDIR /app/packages/api
EXPOSE 3001
CMD ["node", "dist/api/src/main.js"]
