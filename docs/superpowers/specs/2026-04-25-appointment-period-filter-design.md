# Appointment Period Filter — Design Spec

## Goal

Add a "Período" select filter to the appointments listing that lets the user quickly show only future or past appointments, replacing the manual date pickers when active.

## Scope

Single file change: `packages/web/src/app/(tenant)/(app)/appointments/page.tsx`.  
No API, hook, or type changes required.

## Behavior

### New filter control

A select labeled "Período" with three options:

| Value | Label |
|---|---|
| `''` | Todos |
| `'future'` | Futuros |
| `'past'` | Passados |

Placed in the filter bar before the "Serviço" select (leftmost date-related position).

### Date injection logic

The component computes `effectiveDateFrom` and `effectiveDateTo` from the period selection before passing filters to `useAppointments`:

- `timeRange = 'future'` → `effectiveDateFrom = today (YYYY-MM-DD)`, `effectiveDateTo = ''`
- `timeRange = 'past'` → `effectiveDateFrom = ''`, `effectiveDateTo = yesterday (YYYY-MM-DD)`
- `timeRange = ''` → `effectiveDateFrom = dateFrom`, `effectiveDateTo = dateTo`

`today` and `yesterday` are computed as local dates using `new Date()` formatted to `YYYY-MM-DD`.

### Date pickers visibility

The "De" and "Até" date picker fields are hidden (not rendered) when `timeRange !== ''`. They remain in state but their values are irrelevant while a period is active.

### `clearFilters()`

Resets `timeRange` to `''` in addition to all existing resets. Date pickers become visible again.

### `hasFilters`

Includes `timeRange !== ''` in the condition so "Limpar filtros" appears when a period is selected.

### Page reset

`timeRange` is added to the `useEffect` dependency array so changing the period resets to page 1.

## What does NOT change

- `useAppointments` hook signature and query keys
- API endpoints and params (`dateFrom`/`dateTo` strings continue to be used)
- All other filters (service, status, client, professional)
- Cancel flow, table, pagination
