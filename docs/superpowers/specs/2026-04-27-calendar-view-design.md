# Calendar View — Design Spec
**Date:** 2026-04-27  
**Status:** Approved

---

## Overview

Add a Google Calendar–style view to the appointments page. The page gains a toggle (Calendário / Listagem) that defaults to calendar mode. Three sub-views exist: Semana (default), Dia, and Mês. All existing filters (Serviço, Status, Profissional, Cliente) remain available; the date range is controlled by calendar navigation, not the filter panel.

---

## Component Architecture

### New files

```
packages/web/src/app/(tenant)/(app)/appointments/
  page.tsx                             ← existing; adds view-mode toggle state

packages/web/src/app/(tenant)/(app)/appointments/_components/
  AppointmentFilters.tsx               ← extracted filter panel (was inline in page.tsx)
  CalendarView.tsx                     ← shell: nav header + Dia/Semana/Mês selector
  CalendarWeekGrid.tsx                 ← 7-column time grid
  CalendarDayGrid.tsx                  ← 1-column time grid
  CalendarMonthGrid.tsx                ← 7 × 5-6 month grid
  CalendarEventBlock.tsx               ← colored block for day/week views
  CalendarMonthEvent.tsx               ← compact event strip for month view
  AppointmentPopover.tsx               ← floating detail popover
```

### Modified files

```
packages/api/src/appointments/appointments.controller.ts   ← raise limit cap to 500; add DELETE endpoint
packages/api/src/appointments/appointments.service.ts      ← add delete() method
packages/web/src/hooks/useAppointments.ts                  ← add useAppointmentsCalendar + useDeleteAppointment
```

---

## API Changes

### 1 — Raise `GET /appointments` limit cap to 500

Currently capped at 100. Change to 500 for calendar queries:

```ts
// appointments.controller.ts
Math.min(500, Math.max(1, parseInt(limit)))
```

The frontend calendar hook sends `limit=500` with the visible date range.

### 2 — Add `DELETE /appointments/:id`

Hard-deletes the appointment record (admin only). The existing `cancel` action only changes status; `DELETE` removes the row.

```ts
// appointments.controller.ts
@Delete(':id')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles('tenant_admin')
remove(@Param('id') id: string, @TenantId() tenantId: string) {
  return this.service.remove(id, tenantId)
}
```

```ts
// appointments.service.ts
async remove(id: string, tenantId: string) {
  return withTenant(db, tenantId, async (tx) => {
    await tx.delete(appointments).where(eq(appointments.id, id))
  })
}
```

New frontend mutation `useDeleteAppointment` follows the same pattern as `useCancelAppointment`.

---

## Data Fetching

### New hook: `useAppointmentsCalendar`

```ts
// packages/web/src/hooks/useAppointments.ts (addition)
export function useAppointmentsCalendar(
  dateFrom: string,
  dateTo: string,
  filters: Omit<AppointmentFilters, 'dateFrom' | 'dateTo'> = {}
) {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<Appointment[]>({
    queryKey: ['appointments-calendar', slug, dateFrom, dateTo, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ dateFrom, dateTo, limit: '500' })
      if (filters.serviceId)      params.set('serviceId',      filters.serviceId)
      if (filters.status)         params.set('status',         filters.status)
      if (filters.clientId)       params.set('clientId',       filters.clientId)
      if (filters.professionalId) params.set('professionalId', filters.professionalId)
      const res = await api(`/appointments?${params}`)
      const page = await res.json()
      return page.data as Appointment[]
    },
    enabled: !!dateFrom && !!dateTo,
  })
}
```

Query key includes `slug` to prevent cross-tenant cache pollution (per project convention).

---

## Page Layout

```
┌─────────────────────────────────────────────────────┐
│ [📅 Calendário | ☰ Listagem]          [+ Novo agendamento] │
├─────────────────────────────────────────────────────┤
│ Filtros: [Serviço ▾] [Status ▾] [🔍 Profissional] [🔍 Cliente] │
├─────────────────────────────────────────────────────┤
│ [Hoje] [‹] [›]  Abr. – mai. 2026      [Dia][Semana][Mês] │
├─────────────────────────────────────────────────────┤
│                   CALENDAR GRID                     │
└─────────────────────────────────────────────────────┘
```

- **Toggle** (top-left): segmented button — selected mode has indigo background; unselected is white/gray. Calendar is the default on first load (persisted in `useState`, not URL).
- **Filter panel**: always visible; date filters from the list view are hidden in calendar mode (navigation controls the range).
- **Calendar header**: "Hoje" button (jumps to current period) + back/forward arrows + period title + Dia/Semana/Mês pill selector.

---

## Calendar Views

### Shared time-grid constants (Dia & Semana)

| Constant | Value |
|---|---|
| Pixels per hour | 64px |
| Pixels per 15 min | 16px |
| Default visible range | 07:00 – 22:00 (scroll to rest) |
| Total scrollable height | 24 × 64 = 1536px |

Block position formula:
```ts
const top    = (startMinutes / 60) * 64          // px from top of grid
const height = Math.max(16, (durationMinutes / 60) * 64)  // min 16px (15 min)
```

### Semana (default)

- 7 columns (Seg–Dom), date headers with abbreviated weekday + day number.
- Today's date number shown in an indigo circle.
- Left column: hour labels (00:00 … 23:00). Full-hour lines are solid gray; half-hour lines are dashed and lighter.
- Appointment blocks are `position: absolute` within each column's scrollable container.
- Overlapping appointments: detect clashes by comparing time intervals; group clashing appointments and split the column width equally among them (e.g., 2 clashing = each gets 50% width; 3 = 33%). Each block in a group is offset by `groupIndex × (columnWidth / groupSize)`.

### Dia

- Single column spanning full width; otherwise identical to Semana grid.
- Header shows day of week + full date (e.g., "Segunda-feira, 27 de abril de 2026").

### Mês

- 7-column grid; rows = number of weeks in the month (5 or 6).
- Each cell: date number in top-left (today = indigo circle) + up to 3 event strips.
- Event strip: colored background, `clientName` + start time in white text, truncated.
- Overflow: "+ N mais" link in indigo; clicking navigates to the Dia view for that date.

---

## Color System

Palette of 20 colors chosen for maximum mutual contrast:

```ts
export const CALENDAR_COLORS = [
  '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6',
  '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4',
  '#84cc16', '#a855f7', '#22c55e', '#eab308', '#0ea5e9',
  '#f43f5e', '#64748b', '#d946ef', '#2dd4bf', '#fb923c',
]

export function clientColor(clientId: string): string {
  let hash = 0
  for (const ch of clientId) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  return CALENDAR_COLORS[Math.abs(hash) % CALENDAR_COLORS.length]
}
```

- Color is deterministic per `clientId` — same client always gets the same color regardless of load order.
- Applied as solid colored background with white text on appointment blocks.
- Applied as colored circle + strip background in the month view.

---

## Appointment Block (`CalendarEventBlock`)

Rendered inside day/week grid. Content:

```
┌──────────────────────────┐
│ Nome do Cliente          │  ← font-weight: 600, truncated
│ Nome do Serviço          │  ← opacity 0.85, smaller
│ 09:00 – 09:45            │  ← opacity 0.75, smaller
└──────────────────────────┘
```

- If height < 32px (< 30 min): show only client name, no wrap.
- If height < 20px (< ~19 min): show only client name, single line, font-size smaller.
- Clicking the block opens `AppointmentPopover`.

---

## Popover (`AppointmentPopover`)

Appears anchored to the clicked block. Positioning:
1. Read block's `getBoundingClientRect()`.
2. Default: appear to the right of the block.
3. Flip left if right edge would exceed `window.innerWidth - 16`.
4. Flip above if bottom edge would exceed `window.innerHeight - 16`.
5. Rendered via `position: fixed` with calculated `top`/`left`.
6. Backdrop-less — clicking outside (document `mousedown`) closes it.

### Structure

```
┌─────────────────────────────────┐
│ [✏️] [🗑️] [⋮] ─────────── [✕]  │  ← action bar (gray bg)
├─────────────────────────────────┤
│ ● Nome do Cliente               │  ← colored dot + bold name
│   📅 Seg, 27 de abril · 09:00–09:45 │
│   🏷️ Serviço                    │
│   👤 Profissional               │
│   [badge: status]               │
└─────────────────────────────────┘
```

### Action buttons

| Button | Behavior |
|---|---|
| ✏️ Editar | Disabled in this iteration (no edit route exists yet). Rendered at 50% opacity with `cursor-not-allowed` and tooltip "Em breve". |
| 🗑️ Excluir | Show inline confirm inside the popover ("Tem certeza? Esta ação não pode ser desfeita."); on confirm, call `useDeleteAppointment` (`DELETE /appointments/:id`). Only visible to `tenant_admin`. |
| ⋮ | Dropdown with: **Confirmar** (→ `confirmed`), **Marcar como Pago** (→ `completed`), **Cancelar** (→ `cancelled`). Options shown/hidden based on current status. |
| ✕ | Close popover |

Status dropdown respects current status — e.g., already `confirmed` shows only Pago and Cancelar.

---

## Navigation State

| State | Managed in | Notes |
|---|---|---|
| `viewMode` (`calendar` \| `list`) | `page.tsx` useState | Default: `'calendar'` |
| `calendarMode` (`day` \| `week` \| `month`) | `CalendarView.tsx` useState | Default: `'week'` |
| `currentDate` (anchor date) | `CalendarView.tsx` useState | Default: `new Date()` |
| Filters (serviceId, status, etc.) | `page.tsx` useState | Shared between list and calendar modes |

Derived from `currentDate` + `calendarMode`:
- `dateFrom` / `dateTo` computed with `date-fns` (`startOfWeek`, `endOfWeek`, `startOfMonth`, `endOfMonth`, etc.)

---

## Error & Loading States

- **Loading**: skeleton shimmer overlay on the grid (gray animated blocks in place of events).
- **Empty**: no events shown; grid renders normally (empty columns/cells).
- **Error**: toast notification; grid shows empty state.

---

## Out of Scope

- Drag-and-drop rescheduling.
- Creating appointments by clicking on the grid.
- Recurring appointment display (no recurrence in the data model).
- Appointment edit route/page (edit button is disabled in the popover; will be built in a separate iteration).
- Role-based visibility beyond hiding Delete for non-admins (all roles see the calendar).
