# Cancellation Deadline Setting — Design

**Date:** 2026-05-06
**Status:** Approved

## Overview

Add a tenant-level setting that defines the maximum window in which a client can cancel an appointment. If the appointment starts within that window, the client is blocked from cancelling via the UI. Admins and professionals are unaffected.

---

## 1. Schema

Two new nullable columns on the `tenants` table:

| Column | Type | Constraint | Default |
|---|---|---|---|
| `cancellation_deadline_value` | `integer` | nullable | `null` |
| `cancellation_deadline_unit` | `text` | nullable, values: `'minutes' \| 'hours' \| 'days'` | `null` |

Both columns are treated as a pair: either both are set, or both are null. `null` pair = no deadline configured, cancellation always allowed.

Migration generated via `pnpm db:generate` and applied with `pnpm db:migrate`.

---

## 2. API (`packages/api`)

### `UpdateTenantDto`

Two new optional fields:

```ts
@IsOptional() @IsInt() @Min(1) @Max(9999)
cancellationDeadlineValue?: number | null

@IsOptional() @IsIn(['minutes', 'hours', 'days'])
cancellationDeadlineUnit?: 'minutes' | 'hours' | 'days' | null
```

### `TenantsService`

- `findCurrent`: include `cancellationDeadlineValue` and `cancellationDeadlineUnit` in the `select` projection.
- `update`: include both fields in the `patch` object when provided in the DTO.

The cancel endpoint (`PATCH /appointments/:id/cancel`) is **not modified** — no server-side enforcement.

---

## 3. Frontend: Types, Context, Hook

### `TenantSettings` type (`useTenantSettings.ts`)

```ts
cancellationDeadlineValue: number | null
cancellationDeadlineUnit:  'minutes' | 'hours' | 'days' | null
```

### `TenantSettingsProvider`

Expose both fields via context with defaults `null`.

### `useUpdateTenantSettings`

Add both fields to the mutation body type.

---

## 4. Settings UI (`TenantGeneralForm.tsx`)

New row added to the "Comportamento" section, after the existing "Motivo de cancelamento" row.

**Label:** Prazo máximo de cancelamento
**Description:** Define até quando o cliente pode cancelar um agendamento antes do atendimento.

**Controls (inline):**
- Numeric input: integer, 1–9999, blank = no deadline
- Segmented control: `Minutos | Horas | Dias`

**Save behavior:**
- Auto-save on blur of numeric input (if value changed) or on unit change
- If numeric input is cleared, both `cancellationDeadlineValue` and `cancellationDeadlineUnit` are saved as `null`
- Follows the `toggleSaving` spinner pattern used by existing controls

---

## 5. `CancelAppointmentModal`

### New prop

```ts
startsAt: string  // ISO datetime string
```

### Deadline check (client-side, client role only)

```
deadlineMs = cancellationDeadlineValue × unit_in_ms
cutoff     = new Date(startsAt).getTime() - deadlineMs
blocked    = role === 'client' && deadline configured && Date.now() >= cutoff
```

Unit conversion:
- `minutes` → `× 60_000`
- `hours`   → `× 3_600_000`
- `days`    → `× 86_400_000`

### Blocked state UI

When `blocked === true`, the modal renders an error state instead of the cancel form:

```
⚠  Prazo de cancelamento encerrado
O prazo para cancelar este agendamento já passou.
Entre em contato com o estabelecimento caso precise de ajuda.

[ Fechar ]
```

### Callers updated

- **`page.tsx`**: State changes from `cancelId: string | null` to `cancelTarget: { id: string; startsAt: string } | null`.
- **`AppointmentPopover.tsx`**: Already holds the full `appointment` object; passes `appointment.startsAt` as the new prop.

---

## Out of Scope

- No server-side enforcement of the deadline on the cancel endpoint.
- No per-appointment override of the deadline.
- Professionals and admins are not subject to the deadline check.
