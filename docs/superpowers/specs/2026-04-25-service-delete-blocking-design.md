# Service Delete Blocking — Design Spec

## Goal

When deleting a service, block the operation if future non-finalized appointments exist for that service. Show the list of blocking appointments and offer the option to cancel all and delete.

## Pattern

Identical to the client/professional delete blocking already implemented. Reuses the existing `DangerZone` component's `onForceDelete` prop and the `ApiError.body` field.

## API

### `services.service.ts` — `remove(id, tenantId, cancelFuture = false)`

1. Find the service (404 if not found)
2. Query blocking appointments: `serviceId = id`, `startsAt > NOW()`, `status NOT IN ('cancelled', 'completed')`
3. If blocking and `cancelFuture=false` → throw `ConflictException({ message: '...', blockingAppointments: [...] })`
4. If blocking and `cancelFuture=true` → UPDATE appointments set `status='cancelled'` (same WHERE), then delete service
5. If no blocking → delete service

**Blocking appointment fields returned:**
- `id`, `startsAt`, `endsAt`, `status`
- `clientName` — from `users.name` joined on `appointments.clientId`
- `professionalName` — from `profUsers.name` joined via `professionals → users` alias

No `serviceName` — redundant since we know which service is being deleted.

### `services.controller.ts` — `remove()`

Add `@Query('cancelFuture') cancelFuture?: string` and pass `cancelFuture === 'true'` to the service.

New imports needed: `Query` (already in `@nestjs/common`).

## Frontend

### `hooks/useServices.ts` — new `useForceDeleteService()`

```ts
mutationFn: (id: string) => api(`/services/${id}?cancelFuture=true`, { method: 'DELETE' })
onSuccess: invalidates ['services', slug] and ['service', slug, id]
```

### `ServiceDetailView` — add `onForceDelete?: () => Promise<void>`

Pass `onForceDelete` to `DangerZone`. No other changes.

### `settings/services/[id]/page.tsx`

- Import and instantiate `useForceDeleteService`
- Add `handleForceDelete` that calls `forceDel.mutateAsync(service.id)` then redirects
- Pass `onForceDelete={handleForceDelete}` to `ServiceDetailView`

## What does NOT change

- `DangerZone` component — already supports `onForceDelete`
- `ApiError` — already carries `body`
- Any other file
