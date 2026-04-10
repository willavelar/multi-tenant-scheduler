FROM node:20-alpine
RUN npm install -g pnpm
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/
RUN pnpm install
COPY packages/shared ./packages/shared
RUN pnpm --filter @scheduler/shared build
COPY packages/api ./packages/api
EXPOSE 3001
CMD ["pnpm", "--filter", "api", "dev"]
