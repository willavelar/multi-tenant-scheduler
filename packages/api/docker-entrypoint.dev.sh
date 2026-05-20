#!/bin/sh
set -e

# Build shared first so @scheduler/shared/dist exists before NestJS starts
pnpm --filter @scheduler/shared build

# Watch shared in background — updates dist/ whenever src/ changes
pnpm --filter @scheduler/shared dev &

# Start NestJS in watch mode (becomes PID 1 via exec for proper signal handling)
exec pnpm --filter api dev
