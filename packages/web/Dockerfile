FROM node:20-alpine AS base
RUN npm install -g pnpm@10.33.0

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/web/package.json ./packages/web/
RUN pnpm install --frozen-lockfile --filter web

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules
COPY packages/web ./packages/web
COPY pnpm-workspace.yaml package.json ./
WORKDIR /app/packages/web
ARG NEXT_PUBLIC_API_URL=http://api:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/web/.next/standalone ./
COPY --from=builder /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=builder /app/packages/web/public ./packages/web/public
EXPOSE 3000
CMD ["node", "packages/web/server.js"]
