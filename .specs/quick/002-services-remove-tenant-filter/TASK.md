# Quick Task 002: Add explicit tenantId filter on appointments queries in ServicesService.remove

**Date:** 2026-05-17
**Status:** Done

## Description

Add `eq(appointments.tenantId, tenantId)` to both `appointments` queries inside `ServicesService.remove` — the SELECT that identifies blocking appointments and the UPDATE that cancels them. The fix makes the tenant filter explicit and consistent with the defensive pattern applied across the rest of the API.

## Root Cause

`packages/api/src/services/services.service.ts` — the `remove` method runs two queries against the `appointments` table inside `withTenant`:

1. **SELECT** (lines ~76–80): identifies future, non-cancelled appointments linked to the service being deleted.
2. **UPDATE** (lines ~92–96): marks those appointments as `cancelled_by_professional` when `cancelFuture = true`.

Both WHERE clauses filter by `serviceId`, `startsAt > now`, and `status NOT IN (...)`, but neither includes `eq(appointments.tenantId, tenantId)`.

The `serviceId` is implicitly bound to the correct tenant because `existing` was already validated against `tenantId` (lines 56–60), so there is no active data leak. The issue is a missing **defense-in-depth** layer: if RLS is bypassed (e.g., migration, maintenance role) the queries would operate without a tenant boundary. Every other module that writes to `appointments` includes this explicit filter.

## Fix

In `ServicesService.remove`, add `eq(appointments.tenantId, tenantId)` as the first condition in both WHERE clauses:

```ts
// SELECT — blocking check
.where(and(
  eq(appointments.tenantId, tenantId),   // ← add
  eq(appointments.serviceId, id),
  gt(appointments.startsAt, now),
  notInArray(appointments.status, ['cancelled_by_client', 'cancelled_by_professional', 'completed']),
))

// UPDATE — cancel blocking
.where(and(
  eq(appointments.tenantId, tenantId),   // ← add
  eq(appointments.serviceId, id),
  gt(appointments.startsAt, now),
  notInArray(appointments.status, ['cancelled_by_client', 'cancelled_by_professional', 'completed']),
))
```

## Files to Change

- `packages/api/src/services/services.service.ts` — two WHERE clauses inside `remove` (~lines 76–80 and ~92–96)

## Verification

- [x] `pnpm test:api` passes with no regressions (62/62)
- [x] Both WHERE clauses in `remove` include `eq(appointments.tenantId, tenantId)` as their first condition
- [x] No other methods in `ServicesService` query `appointments` without an explicit `tenantId` filter

## Commit

`[pending]`
