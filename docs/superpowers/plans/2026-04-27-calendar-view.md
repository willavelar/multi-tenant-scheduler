# Calendar View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Google Calendar–style view (Dia/Semana/Mês) to the appointments page, with per-client color coding, a popover with actions, and a toggle between calendar and list mode.

**Architecture:** Build from scratch using date-fns (already installed) and CSS/Tailwind. The week/day grid uses absolute positioning with 64px-per-hour layout. The page gains a `viewMode` toggle; all filter state stays in `page.tsx` and is shared between both views.

**Tech Stack:** Next.js 16, React 19, TanStack Query v5, date-fns v4, Tailwind v4, shadcn/ui, lucide-react

**Spec:** `docs/superpowers/specs/2026-04-27-calendar-view-design.md`

---

## File Map

| Action | Path |
|---|---|
| Modify | `packages/api/src/appointments/appointments.controller.ts` |
| Modify | `packages/api/src/appointments/appointments.service.ts` |
| Modify | `packages/api/test/appointments.e2e-spec.ts` |
| Create | `packages/web/src/lib/calendarColors.ts` |
| Create | `packages/web/src/lib/calendarUtils.ts` |
| Modify | `packages/web/src/hooks/useAppointments.ts` |
| Create | `packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentFilters.tsx` |
| Create | `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarEventBlock.tsx` |
| Create | `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarMonthEvent.tsx` |
| Create | `packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentPopover.tsx` |
| Create | `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarWeekGrid.tsx` |
| Create | `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarDayGrid.tsx` |
| Create | `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarMonthGrid.tsx` |
| Create | `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarView.tsx` |
| Modify | `packages/web/src/app/(tenant)/(app)/appointments/page.tsx` |

---

## Task 1: API — raise limit cap & add DELETE endpoint

**Files:**
- Modify: `packages/api/src/appointments/appointments.controller.ts`
- Modify: `packages/api/src/appointments/appointments.service.ts`
- Modify: `packages/api/test/appointments.e2e-spec.ts`

- [ ] **Step 1: Write failing e2e test for DELETE**

Append to `packages/api/test/appointments.e2e-spec.ts`:

```ts
it('DELETE /appointments/:id — admin can hard-delete an appointment', async () => {
  // First create an appointment to delete
  const profsRes = await request(app.getHttpServer())
    .get('/professionals')
    .set('x-tenant-slug', 'clinica-demo')
    .set('Authorization', `Bearer ${adminToken}`);
  const profId = profsRes.body[0].id;

  const svcsRes = await request(app.getHttpServer())
    .get('/services')
    .set('x-tenant-slug', 'clinica-demo')
    .set('Authorization', `Bearer ${adminToken}`);
  const svcId = svcsRes.body[0].id;

  let date: string | undefined;
  let startTime: string | undefined;
  for (let offset = 1; offset <= 14; offset++) {
    const candidate = new Date();
    candidate.setDate(candidate.getDate() + offset);
    const candidateDate = candidate.toISOString().split('T')[0];
    const slotsRes = await request(app.getHttpServer())
      .get(`/availability/slots?professionalId=${profId}&date=${candidateDate}`)
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${adminToken}`);
    if (Array.isArray(slotsRes.body) && slotsRes.body.length > 0) {
      date = candidateDate;
      startTime = slotsRes.body[0];
      break;
    }
  }

  const createRes = await request(app.getHttpServer())
    .post('/appointments')
    .set('x-tenant-slug', 'clinica-demo')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ professionalId: profId, serviceId: svcId, date, startTime });
  const apptId = createRes.body.id;

  // Delete it
  await request(app.getHttpServer())
    .delete(`/appointments/${apptId}`)
    .set('x-tenant-slug', 'clinica-demo')
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200);

  // Verify it's gone
  const listRes = await request(app.getHttpServer())
    .get('/appointments')
    .set('x-tenant-slug', 'clinica-demo')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(listRes.body.data.find((a: any) => a.id === apptId)).toBeUndefined();
});

it('DELETE /appointments/:id — client cannot delete (403)', async () => {
  const profsRes = await request(app.getHttpServer())
    .get('/professionals')
    .set('x-tenant-slug', 'clinica-demo')
    .set('Authorization', `Bearer ${adminToken}`);
  const profId = profsRes.body[0].id;

  const svcsRes = await request(app.getHttpServer())
    .get('/services')
    .set('x-tenant-slug', 'clinica-demo')
    .set('Authorization', `Bearer ${adminToken}`);
  const svcId = svcsRes.body[0].id;

  let date: string | undefined;
  let startTime: string | undefined;
  for (let offset = 1; offset <= 14; offset++) {
    const candidate = new Date();
    candidate.setDate(candidate.getDate() + offset);
    const candidateDate = candidate.toISOString().split('T')[0];
    const slotsRes = await request(app.getHttpServer())
      .get(`/availability/slots?professionalId=${profId}&date=${candidateDate}`)
      .set('x-tenant-slug', 'clinica-demo')
      .set('Authorization', `Bearer ${clientToken}`);
    if (Array.isArray(slotsRes.body) && slotsRes.body.length > 0) {
      date = candidateDate;
      startTime = slotsRes.body[0];
      break;
    }
  }

  const createRes = await request(app.getHttpServer())
    .post('/appointments')
    .set('x-tenant-slug', 'clinica-demo')
    .set('Authorization', `Bearer ${clientToken}`)
    .send({ professionalId: profId, serviceId: svcId, date, startTime });
  const apptId = createRes.body.id;

  await request(app.getHttpServer())
    .delete(`/appointments/${apptId}`)
    .set('x-tenant-slug', 'clinica-demo')
    .set('Authorization', `Bearer ${clientToken}`)
    .expect(403);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/willavelar/Projects/MyOwn/NODEJS/scheduler
pnpm test:api:e2e
```

Expected: new DELETE tests fail with 404 (route not found).

- [ ] **Step 3: Add `remove()` to appointments service**

In `packages/api/src/appointments/appointments.service.ts`, add import for `Delete` and add method after `updateStatus`:

```ts
// Add to imports at top:
import { and, eq, count, desc, gte, lte, sql } from 'drizzle-orm';
```

Add method at end of class (before closing `}`):

```ts
async remove(id: string, tenantId: string) {
  return withTenant(this.db, tenantId, async (tx) => {
    const [appt] = await tx
      .select({ id: appointments.id })
      .from(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)));
    if (!appt) throw new NotFoundException('Appointment not found');
    await tx.delete(appointments).where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)));
  });
}
```

- [ ] **Step 4: Add DELETE endpoint to controller and raise limit cap**

Replace the entire `packages/api/src/appointments/appointments.controller.ts`:

```ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('appointments')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Post()
  create(
    @Body() dto: CreateAppointmentDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.service.create(dto, user.id, user.role, tenantId);
  }

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string; role: string },
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('serviceId') serviceId?: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
    @Query('professionalId') professionalId?: string,
  ) {
    return this.service.findAll(
      tenantId, user.id, user.role,
      Math.max(1, parseInt(page)),
      Math.min(500, Math.max(1, parseInt(limit))),
      { dateFrom, dateTo, serviceId, status, clientId, professionalId },
    );
  }

  @Patch(':id/confirm')
  confirm(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.updateStatus(id, 'confirmed', tenantId);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.updateStatus(id, 'cancelled', tenantId);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.updateStatus(id, 'completed', tenantId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('tenant_admin')
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.remove(id, tenantId);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test:api:e2e
```

Expected: all tests pass including the two new DELETE tests.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/appointments/appointments.controller.ts \
        packages/api/src/appointments/appointments.service.ts \
        packages/api/test/appointments.e2e-spec.ts
git commit -m "feat(api): add DELETE /appointments/:id and raise list limit to 500"
```

---

## Task 2: Color utilities and calendar date helpers

**Files:**
- Create: `packages/web/src/lib/calendarColors.ts`
- Create: `packages/web/src/lib/calendarUtils.ts`

- [ ] **Step 1: Create `calendarColors.ts`**

```ts
// packages/web/src/lib/calendarColors.ts
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

- [ ] **Step 2: Create `calendarUtils.ts`**

```ts
// packages/web/src/lib/calendarUtils.ts
import { startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns'
import type { Appointment } from '@/types'

export const HOUR_HEIGHT = 64   // px per hour
export const SLOT_HEIGHT = 16   // px per 15 min — minimum block height
export const TOTAL_HOURS = 24

export type LayoutItem = {
  appointment: Appointment
  columnIndex: number
  columnCount: number
}

export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 1 })
  const end = endOfWeek(anchor, { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

export function getMonthCells(anchor: Date): Date[] {
  const monthStart = startOfMonth(anchor)
  const monthEnd = endOfMonth(anchor)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  return eachDayOfInterval({ start: gridStart, end: gridEnd })
}

export function blockPosition(startsAt: string, endsAt: string): { top: number; height: number } {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  const startMins = start.getHours() * 60 + start.getMinutes()
  const durMins = Math.round((end.getTime() - start.getTime()) / 60000)
  return {
    top: (startMins / 60) * HOUR_HEIGHT,
    height: Math.max(SLOT_HEIGHT, (durMins / 60) * HOUR_HEIGHT),
  }
}

export function layoutAppointments(appts: Appointment[]): LayoutItem[] {
  if (!appts.length) return []
  const sorted = [...appts].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  )
  const colEnds: string[] = []
  const assigned: { appointment: Appointment; colIdx: number }[] = []

  for (const appt of sorted) {
    const start = new Date(appt.startsAt).getTime()
    let placed = false
    for (let c = 0; c < colEnds.length; c++) {
      if (start >= new Date(colEnds[c]).getTime()) {
        colEnds[c] = appt.endsAt
        assigned.push({ appointment: appt, colIdx: c })
        placed = true
        break
      }
    }
    if (!placed) {
      colEnds.push(appt.endsAt)
      assigned.push({ appointment: appt, colIdx: colEnds.length - 1 })
    }
  }

  return assigned.map(({ appointment, colIdx }) => {
    const aStart = new Date(appointment.startsAt).getTime()
    const aEnd = new Date(appointment.endsAt).getTime()
    const maxCol = assigned
      .filter(({ appointment: other }) => {
        const oStart = new Date(other.startsAt).getTime()
        const oEnd = new Date(other.endsAt).getTime()
        return aStart < oEnd && aEnd > oStart
      })
      .reduce((m, { colIdx: c }) => Math.max(m, c), colIdx)
    return { appointment, columnIndex: colIdx, columnCount: maxCol + 1 }
  })
}

export function formatISOTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

const WEEKDAY_SHORT = ['DOM.', 'SEG.', 'TER.', 'QUA.', 'QUI.', 'SEX.', 'SÁB.']
export function weekdayShort(date: Date): string {
  return WEEKDAY_SHORT[date.getDay()]
}

export function formatWeekTitle(start: Date, end: Date): string {
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    const s = start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  const s = start.toLocaleDateString('pt-BR', { month: 'short' })
  const e = end.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
  return `${s} – ${e}`
}

export function formatDayTitle(date: Date): string {
  const s = date.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatMonthTitle(date: Date): string {
  const s = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export { addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth }
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/lib/calendarColors.ts packages/web/src/lib/calendarUtils.ts
git commit -m "feat(web): add calendar color and date utility helpers"
```

---

## Task 3: Frontend hooks

**Files:**
- Modify: `packages/web/src/hooks/useAppointments.ts`

- [ ] **Step 1: Add `useAppointmentsCalendar` and `useDeleteAppointment`**

Append to the end of `packages/web/src/hooks/useAppointments.ts`:

```ts
type CalendarFilters = {
  serviceId?: string
  status?: string
  clientId?: string
  professionalId?: string
}

export function useAppointmentsCalendar(
  dateFrom: string,
  dateTo: string,
  filters: CalendarFilters = {},
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

export function useDeleteAppointment() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (id: string) =>
      api(`/appointments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', slug] })
      queryClient.invalidateQueries({ queryKey: ['appointments-calendar', slug] })
    },
  })
}
```

Also add `Appointment` to the import from `@/types` at the top of the file (it's already imported via `AppointmentPage`, but add `Appointment` directly):

```ts
import type { AppointmentPage, Appointment } from '@/types'
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/hooks/useAppointments.ts
git commit -m "feat(web): add useAppointmentsCalendar and useDeleteAppointment hooks"
```

---

## Task 4: Extract AppointmentFilters component

**Files:**
- Create: `packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentFilters.tsx`

- [ ] **Step 1: Create the component**

```tsx
// packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentFilters.tsx
'use client'

import { DatePickerField } from '@/components/ui/DatePickerField'
import { ClientSearchField } from '@/components/ui/ClientSearchField'
import { ProfessionalSearchField } from '@/components/ui/ProfessionalSearchField'
import type { Service } from '@/types'

type Props = {
  viewMode: 'calendar' | 'list'
  timeRange: '' | 'future' | 'past'
  dateFrom: string
  dateTo: string
  serviceId: string
  status: string
  clientId: string
  professionalId: string
  clientDisplayValue: string
  professionalDisplayValue: string
  servicesList: Service[]
  hasFilters: boolean
  onTimeRangeChange: (v: '' | 'future' | 'past') => void
  onDateFromChange: (v: string) => void
  onDateToChange: (v: string) => void
  onServiceIdChange: (v: string) => void
  onStatusChange: (v: string) => void
  onClientInput: (v: string) => void
  onClientSelect: (id: string, name: string) => void
  onClientClear: () => void
  onProfessionalInput: (v: string) => void
  onProfessionalSelect: (id: string, name: string) => void
  onProfessionalClear: () => void
  onClearFilters: () => void
}

const selectClass =
  'h-9 w-full pl-3 pr-8 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-lg appearance-none cursor-pointer outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors'
const labelClass = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.05em] mb-1'
const ChevronDown = () => (
  <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

export function AppointmentFilters({
  viewMode, timeRange, dateFrom, dateTo, serviceId, status,
  clientId, professionalId, clientDisplayValue, professionalDisplayValue,
  servicesList, hasFilters,
  onTimeRangeChange, onDateFromChange, onDateToChange, onServiceIdChange, onStatusChange,
  onClientInput, onClientSelect, onClientClear,
  onProfessionalInput, onProfessionalSelect, onProfessionalClear,
  onClearFilters,
}: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 mb-4 shadow-sm">
      <div className="flex flex-wrap gap-3 items-end">

        {/* Period — list mode only */}
        {viewMode === 'list' && (
          <div className="min-w-[140px] flex-[1_1_140px]">
            <label className={labelClass}>Período</label>
            <div className="relative">
              <select className={selectClass} value={timeRange} onChange={e => onTimeRangeChange(e.target.value as '' | 'future' | 'past')}>
                <option value="">Todos</option>
                <option value="future">Futuros</option>
                <option value="past">Passados</option>
              </select>
              <ChevronDown />
            </div>
          </div>
        )}

        {/* Date pickers — list mode + no period selected */}
        {viewMode === 'list' && timeRange === '' && (
          <>
            <div className="min-w-[140px] flex-[1_1_140px]">
              <label className={labelClass}>De</label>
              <DatePickerField value={dateFrom} onChange={onDateFromChange} inputClassName="h-9 text-[13px]" />
            </div>
            <div className="min-w-[140px] flex-[1_1_140px]">
              <label className={labelClass}>Até</label>
              <DatePickerField value={dateTo} onChange={onDateToChange} inputClassName="h-9 text-[13px]" />
            </div>
          </>
        )}

        {/* Service */}
        <div className="min-w-[160px] flex-[1_1_160px]">
          <label className={labelClass}>Serviço</label>
          <div className="relative">
            <select className={selectClass} value={serviceId} onChange={e => onServiceIdChange(e.target.value)}>
              <option value="">Todos</option>
              {servicesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <ChevronDown />
          </div>
        </div>

        {/* Status */}
        <div className="min-w-[140px] flex-[1_1_140px]">
          <label className={labelClass}>Status</label>
          <div className="relative">
            <select className={selectClass} value={status} onChange={e => onStatusChange(e.target.value)}>
              <option value="">Todos</option>
              <option value="pending">Agendado</option>
              <option value="confirmed">Confirmado</option>
              <option value="cancelled">Cancelado</option>
              <option value="completed">Pago</option>
            </select>
            <ChevronDown />
          </div>
        </div>

        {/* Professional */}
        <div className="min-w-[180px] flex-[2_1_180px]">
          <label className={labelClass}>Profissional</label>
          <ProfessionalSearchField
            value={professionalDisplayValue}
            onChange={onProfessionalInput}
            onSelect={onProfessionalSelect}
            selectedId={professionalId}
            onClear={onProfessionalClear}
            showSearchIcon
            inputClassName="h-9 text-[13px] focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>

        {/* Client */}
        <div className="min-w-[200px] flex-[2_1_200px]">
          <label className={labelClass}>Cliente</label>
          <ClientSearchField
            value={clientDisplayValue}
            onChange={onClientInput}
            onSelect={onClientSelect}
            selectedId={clientId}
            onClear={onClientClear}
            showSearchIcon
            inputClassName="h-9 text-[13px] focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>

        {/* Clear */}
        {hasFilters && (
          <div className="flex items-end">
            <button
              className="h-9 px-3.5 border border-gray-200 bg-white text-gray-500 rounded-lg text-[13px] font-medium cursor-pointer hover:bg-gray-100 hover:text-gray-700 transition-colors whitespace-nowrap"
              onClick={onClearFilters}
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentFilters.tsx
git commit -m "feat(web): extract AppointmentFilters component"
```

---

## Task 5: CalendarEventBlock and CalendarMonthEvent

**Files:**
- Create: `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarEventBlock.tsx`
- Create: `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarMonthEvent.tsx`

- [ ] **Step 1: Create `CalendarEventBlock.tsx`**

```tsx
// packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarEventBlock.tsx
'use client'

import type { Appointment } from '@/types'
import { formatISOTime } from '@/lib/calendarUtils'

type Props = {
  appointment: Appointment
  color: string
  top: number
  height: number
  columnIndex: number
  columnCount: number
  onClick: (rect: DOMRect) => void
}

export function CalendarEventBlock({ appointment, color, top, height, columnIndex, columnCount, onClick }: Props) {
  const widthPct = 100 / columnCount
  const leftPct = (columnIndex * 100) / columnCount

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
    onClick((e.currentTarget as HTMLElement).getBoundingClientRect())
  }

  return (
    <div
      className="absolute rounded-md cursor-pointer overflow-hidden select-none px-1.5 py-0.5 hover:brightness-90 transition-all z-10"
      style={{
        top: top + 1,
        height: height - 2,
        left: `calc(${leftPct}% + 1px)`,
        width: `calc(${widthPct}% - 2px)`,
        background: color,
      }}
      onClick={handleClick}
    >
      <p className="text-white text-[11px] font-semibold truncate leading-tight m-0">
        {appointment.clientName}
      </p>
      {height >= 32 && (
        <p className="text-white/85 text-[10px] truncate leading-tight m-0">
          {appointment.serviceName}
        </p>
      )}
      {height >= 32 && (
        <p className="text-white/75 text-[10px] leading-tight m-0">
          {formatISOTime(appointment.startsAt)} – {formatISOTime(appointment.endsAt)}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `CalendarMonthEvent.tsx`**

```tsx
// packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarMonthEvent.tsx
'use client'

import type { Appointment } from '@/types'
import { formatISOTime } from '@/lib/calendarUtils'

type Props = {
  appointment: Appointment
  color: string
  onClick: (rect: DOMRect) => void
}

export function CalendarMonthEvent({ appointment, color, onClick }: Props) {
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()
    onClick((e.currentTarget as HTMLElement).getBoundingClientRect())
  }

  return (
    <button
      className="w-full flex items-center gap-1 rounded px-1 py-0.5 mb-0.5 text-left overflow-hidden cursor-pointer hover:brightness-90 transition-all border-none"
      style={{ background: color }}
      onClick={handleClick}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
      <span className="text-white text-[10px] font-medium truncate">
        {formatISOTime(appointment.startsAt)} {appointment.clientName}
      </span>
    </button>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarEventBlock.tsx \
        packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarMonthEvent.tsx
git commit -m "feat(web): add CalendarEventBlock and CalendarMonthEvent components"
```

---

## Task 6: AppointmentPopover

**Files:**
- Create: `packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentPopover.tsx`

- [ ] **Step 1: Create the component**

```tsx
// packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentPopover.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Appointment } from '@/types'
import { formatISOTime } from '@/lib/calendarUtils'
import { clientColor } from '@/lib/calendarColors'
import { useCancelAppointment, useCompleteAppointment, useConfirmAppointment, useDeleteAppointment } from '@/hooks/useAppointments'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { StatusVariant } from '@/components/ui/StatusBadge'

const POPOVER_WIDTH = 300
const POPOVER_HEIGHT = 270

const STATUS_LABELS: Record<Appointment['status'], string> = {
  pending: 'Agendado', confirmed: 'Confirmado', cancelled: 'Cancelado', completed: 'Pago',
}
const STATUS_VARIANTS: Record<Appointment['status'], StatusVariant> = {
  pending: 'warning', confirmed: 'success', cancelled: 'error', completed: 'purple',
}

type Props = {
  appointment: Appointment
  blockRect: DOMRect
  onClose: () => void
}

export function AppointmentPopover({ appointment, blockRect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const confirmMut  = useConfirmAppointment()
  const cancelMut   = useCancelAppointment()
  const completeMut = useCompleteAppointment()
  const deleteMut   = useDeleteAppointment()

  let left = blockRect.right + 8
  if (left + POPOVER_WIDTH > window.innerWidth - 16) left = blockRect.left - POPOVER_WIDTH - 8
  let top = blockRect.top
  if (top + POPOVER_HEIGHT > window.innerHeight - 16) top = window.innerHeight - POPOVER_HEIGHT - 16
  top = Math.max(8, top)
  left = Math.max(8, left)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const color = clientColor(appointment.clientId)
  const startStr = formatISOTime(appointment.startsAt)
  const endStr = formatISOTime(appointment.endsAt)
  const dateStr = (() => {
    const s = new Date(appointment.startsAt).toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
    return s.charAt(0).toUpperCase() + s.slice(1)
  })()

  function handleStatusChange(action: 'confirm' | 'cancel' | 'complete') {
    setStatusOpen(false)
    if (action === 'confirm')  confirmMut.mutate(appointment.id,  { onSuccess: onClose })
    if (action === 'cancel')   cancelMut.mutate(appointment.id,   { onSuccess: onClose })
    if (action === 'complete') completeMut.mutate(appointment.id, { onSuccess: onClose })
  }

  const isMutating = confirmMut.isPending || cancelMut.isPending || completeMut.isPending || deleteMut.isPending
  const { status } = appointment

  const popover = (
    <div
      ref={ref}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-visible w-[300px]"
      style={{ top, left }}
    >
      {/* Action bar */}
      <div className="flex items-center justify-end gap-1 px-3 py-2.5 bg-gray-50 border-b border-gray-200 rounded-t-xl">
        {/* Edit — disabled */}
        <button
          disabled title="Em breve"
          className="w-8 h-8 rounded-full border-none bg-gray-100 flex items-center justify-center text-gray-300 cursor-not-allowed"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>

        {/* Delete / Confirm delete */}
        {!confirmDelete ? (
          <button
            title="Excluir"
            className="w-8 h-8 rounded-full border-none bg-gray-100 flex items-center justify-center text-red-500 cursor-pointer hover:bg-red-50 transition-colors"
            onClick={() => setConfirmDelete(true)}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              className="text-[11px] px-2 py-1 rounded border border-gray-200 bg-white cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setConfirmDelete(false)}
            >Não</button>
            <button
              disabled={isMutating}
              className="text-[11px] px-2 py-1 rounded bg-red-600 text-white border-none cursor-pointer hover:bg-red-700 disabled:opacity-50 transition-colors"
              onClick={() => deleteMut.mutate(appointment.id, { onSuccess: onClose })}
            >Confirmar</button>
          </div>
        )}

        {/* Status ⋮ */}
        <div className="relative">
          <button
            title="Alterar status"
            className="w-8 h-8 rounded-full border-none bg-gray-100 flex flex-col items-center justify-center gap-[3px] cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={() => setStatusOpen(o => !o)}
          >
            <span className="w-[3px] h-[3px] bg-gray-600 rounded-full" />
            <span className="w-[3px] h-[3px] bg-gray-600 rounded-full" />
            <span className="w-[3px] h-[3px] bg-gray-600 rounded-full" />
          </button>
          {statusOpen && (
            <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-lg shadow-lg w-44 z-10 overflow-hidden">
              {status !== 'confirmed' && status !== 'completed' && (
                <button className="w-full text-left px-3 py-2 text-[12.5px] text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer border-none bg-transparent border-b border-gray-100" onClick={() => handleStatusChange('confirm')}>
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />Confirmar
                </button>
              )}
              {status !== 'completed' && status !== 'cancelled' && (
                <button className="w-full text-left px-3 py-2 text-[12.5px] text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer border-none bg-transparent border-b border-gray-100" onClick={() => handleStatusChange('complete')}>
                  <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />Marcar como Pago
                </button>
              )}
              {status !== 'cancelled' && (
                <button className="w-full text-left px-3 py-2 text-[12.5px] text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer border-none bg-transparent" onClick={() => handleStatusChange('cancel')}>
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />Cancelar
                </button>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Close */}
        <button
          title="Fechar"
          className="w-8 h-8 rounded-full border-none bg-indigo-500 flex items-center justify-center text-white cursor-pointer hover:bg-indigo-600 transition-colors"
          onClick={onClose}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="text-[15px] font-bold text-gray-900 leading-tight">{appointment.clientName}</span>
        </div>
        <div className="pl-[22px] space-y-1.5">
          <div className="flex items-start gap-2 text-gray-500 text-[12.5px]">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0 mt-0.5">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>{dateStr} · {startStr} – {endStr}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-[12.5px]">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <span>{appointment.serviceName}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-[12.5px]">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span>{appointment.professionalName}</span>
          </div>
          <div className="pt-0.5">
            <StatusBadge label={STATUS_LABELS[status]} variant={STATUS_VARIANTS[status]} />
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(popover, document.body)
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentPopover.tsx
git commit -m "feat(web): add AppointmentPopover component"
```

---

## Task 7: CalendarWeekGrid and CalendarDayGrid

**Files:**
- Create: `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarWeekGrid.tsx`
- Create: `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarDayGrid.tsx`

- [ ] **Step 1: Create `CalendarWeekGrid.tsx`**

```tsx
// packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarWeekGrid.tsx
'use client'

import { useRef, useEffect } from 'react'
import type { Appointment } from '@/types'
import { HOUR_HEIGHT, TOTAL_HOURS, isSameDay, layoutAppointments, blockPosition, weekdayShort } from '@/lib/calendarUtils'
import { clientColor } from '@/lib/calendarColors'
import { CalendarEventBlock } from './CalendarEventBlock'
import { cn } from '@/lib/utils'

type Props = {
  days: Date[]
  appointments: Appointment[]
  today: Date
  onAppointmentClick: (appointment: Appointment, rect: DOMRect) => void
}

const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => i)
const LABEL_WIDTH = 52

export function CalendarWeekGrid({ days, appointments, today, onAppointmentClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day header row */}
      <div className="flex flex-shrink-0 border-b border-gray-200" style={{ paddingLeft: LABEL_WIDTH }}>
        {days.map(day => {
          const isToday = isSameDay(day, today)
          return (
            <div key={day.toISOString()} className="flex-1 text-center py-2 px-1 border-l border-gray-200 first:border-l-0">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{weekdayShort(day)}</div>
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center mx-auto mt-0.5 text-sm font-semibold',
                isToday ? 'bg-indigo-500 text-white' : 'text-gray-700'
              )}>{day.getDate()}</div>
            </div>
          )
        })}
      </div>

      {/* Scrollable area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
          {/* Time labels */}
          <div className="relative flex-shrink-0 border-r border-gray-200" style={{ width: LABEL_WIDTH }}>
            {HOURS.map(h => (
              <div key={h} className="absolute right-2 text-[10px] text-gray-400 select-none" style={{ top: h * HOUR_HEIGHT - 7 }}>
                {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(day => {
            const dayAppts = appointments.filter(a => isSameDay(new Date(a.startsAt), day))
            const layout = layoutAppointments(dayAppts)
            return (
              <div key={day.toISOString()} className="flex-1 border-l border-gray-200 relative first:border-l-0">
                {HOURS.map(h => (
                  <div key={h} className="absolute w-full" style={{ top: h * HOUR_HEIGHT }}>
                    <div className="border-t border-gray-200 w-full" />
                    <div className="border-t border-dashed border-gray-100 w-full" style={{ marginTop: HOUR_HEIGHT / 2 }} />
                  </div>
                ))}
                {layout.map(({ appointment, columnIndex, columnCount }) => {
                  const { top, height } = blockPosition(appointment.startsAt, appointment.endsAt)
                  return (
                    <CalendarEventBlock
                      key={appointment.id}
                      appointment={appointment}
                      color={clientColor(appointment.clientId)}
                      top={top} height={height}
                      columnIndex={columnIndex} columnCount={columnCount}
                      onClick={rect => onAppointmentClick(appointment, rect)}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `CalendarDayGrid.tsx`**

```tsx
// packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarDayGrid.tsx
'use client'

import { useRef, useEffect } from 'react'
import type { Appointment } from '@/types'
import { HOUR_HEIGHT, TOTAL_HOURS, layoutAppointments, blockPosition } from '@/lib/calendarUtils'
import { clientColor } from '@/lib/calendarColors'
import { CalendarEventBlock } from './CalendarEventBlock'

type Props = {
  appointments: Appointment[]
  onAppointmentClick: (appointment: Appointment, rect: DOMRect) => void
}

const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => i)
const LABEL_WIDTH = 52

export function CalendarDayGrid({ appointments, onAppointmentClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT }, [])

  const layout = layoutAppointments(appointments)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
          {/* Time labels */}
          <div className="relative flex-shrink-0 border-r border-gray-200" style={{ width: LABEL_WIDTH }}>
            {HOURS.map(h => (
              <div key={h} className="absolute right-2 text-[10px] text-gray-400 select-none" style={{ top: h * HOUR_HEIGHT - 7 }}>
                {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
              </div>
            ))}
          </div>
          {/* Single column */}
          <div className="flex-1 border-l border-gray-200 relative">
            {HOURS.map(h => (
              <div key={h} className="absolute w-full" style={{ top: h * HOUR_HEIGHT }}>
                <div className="border-t border-gray-200 w-full" />
                <div className="border-t border-dashed border-gray-100 w-full" style={{ marginTop: HOUR_HEIGHT / 2 }} />
              </div>
            ))}
            {layout.map(({ appointment, columnIndex, columnCount }) => {
              const { top, height } = blockPosition(appointment.startsAt, appointment.endsAt)
              return (
                <CalendarEventBlock
                  key={appointment.id}
                  appointment={appointment}
                  color={clientColor(appointment.clientId)}
                  top={top} height={height}
                  columnIndex={columnIndex} columnCount={columnCount}
                  onClick={rect => onAppointmentClick(appointment, rect)}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarWeekGrid.tsx \
        packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarDayGrid.tsx
git commit -m "feat(web): add CalendarWeekGrid and CalendarDayGrid components"
```

---

## Task 8: CalendarMonthGrid

**Files:**
- Create: `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarMonthGrid.tsx`

- [ ] **Step 1: Create the component**

```tsx
// packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarMonthGrid.tsx
'use client'

import type { Appointment } from '@/types'
import { isSameDay } from '@/lib/calendarUtils'
import { clientColor } from '@/lib/calendarColors'
import { CalendarMonthEvent } from './CalendarMonthEvent'
import { cn } from '@/lib/utils'

type Props = {
  cells: Date[]
  currentMonth: Date
  appointments: Appointment[]
  today: Date
  onAppointmentClick: (appointment: Appointment, rect: DOMRect) => void
  onDayClick: (date: Date) => void
}

const WEEKDAY_HEADERS = ['SEG.', 'TER.', 'QUA.', 'QUI.', 'SEX.', 'SÁB.', 'DOM.']
const MAX_VISIBLE = 3

export function CalendarMonthGrid({ cells, currentMonth, appointments, today, onAppointmentClick, onDayClick }: Props) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 flex-shrink-0">
        {WEEKDAY_HEADERS.map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7">
          {cells.map(cell => {
            const isToday = isSameDay(cell, today)
            const isCurrentMonth = cell.getMonth() === currentMonth.getMonth() &&
              cell.getFullYear() === currentMonth.getFullYear()
            const dayAppts = appointments
              .filter(a => isSameDay(new Date(a.startsAt), cell))
              .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
            const visible = dayAppts.slice(0, MAX_VISIBLE)
            const overflow = dayAppts.length - MAX_VISIBLE

            return (
              <div
                key={cell.toISOString()}
                className={cn(
                  'border-r border-b border-gray-200 last:border-r-0 min-h-[110px] p-1.5',
                  !isCurrentMonth && 'bg-gray-50/60'
                )}
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold mb-1 cursor-pointer',
                    isToday
                      ? 'bg-indigo-500 text-white'
                      : isCurrentMonth ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400'
                  )}
                  onClick={() => onDayClick(cell)}
                >
                  {cell.getDate()}
                </div>
                {visible.map(appt => (
                  <CalendarMonthEvent
                    key={appt.id}
                    appointment={appt}
                    color={clientColor(appt.clientId)}
                    onClick={rect => onAppointmentClick(appt, rect)}
                  />
                ))}
                {overflow > 0 && (
                  <button
                    className="text-[10px] text-indigo-600 font-semibold pl-1 hover:underline cursor-pointer border-none bg-transparent p-0"
                    onClick={() => onDayClick(cell)}
                  >
                    + {overflow} mais
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarMonthGrid.tsx
git commit -m "feat(web): add CalendarMonthGrid component"
```

---

## Task 9: CalendarView shell

**Files:**
- Create: `packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarView.tsx`

- [ ] **Step 1: Create the component**

```tsx
// packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarView.tsx
'use client'

import { useState, useCallback } from 'react'
import type { Appointment } from '@/types'
import { useAppointmentsCalendar } from '@/hooks/useAppointments'
import {
  getWeekDays, getMonthCells,
  formatWeekTitle, formatDayTitle, formatMonthTitle,
  toISODate, isSameDay,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, subDays, addWeeks, subWeeks, addMonths, subMonths,
} from '@/lib/calendarUtils'
import { CalendarWeekGrid } from './CalendarWeekGrid'
import { CalendarDayGrid } from './CalendarDayGrid'
import { CalendarMonthGrid } from './CalendarMonthGrid'
import { AppointmentPopover } from './AppointmentPopover'
import { cn } from '@/lib/utils'

type CalendarMode = 'day' | 'week' | 'month'

type CalendarFilters = {
  serviceId: string
  status: string
  clientId: string
  professionalId: string
}

type Props = { filters: CalendarFilters }

export function CalendarView({ filters }: Props) {
  const [mode, setMode] = useState<CalendarMode>('week')
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [popover, setPopover] = useState<{ appointment: Appointment; rect: DOMRect } | null>(null)

  const today = new Date()

  const { dateFrom, dateTo } = (() => {
    if (mode === 'day') {
      const s = toISODate(currentDate)
      return { dateFrom: s, dateTo: s }
    }
    if (mode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return { dateFrom: toISODate(start), dateTo: toISODate(end) }
    }
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return { dateFrom: toISODate(gridStart), dateTo: toISODate(gridEnd) }
  })()

  const { data: appointments = [], isLoading } = useAppointmentsCalendar(dateFrom, dateTo, {
    serviceId: filters.serviceId || undefined,
    status: filters.status || undefined,
    clientId: filters.clientId || undefined,
    professionalId: filters.professionalId || undefined,
  })

  function navigate(dir: 'prev' | 'next' | 'today') {
    if (dir === 'today') { setCurrentDate(new Date()); return }
    setCurrentDate(prev => {
      if (mode === 'day') return dir === 'prev' ? subDays(prev, 1) : addDays(prev, 1)
      if (mode === 'week') return dir === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
      return dir === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    })
  }

  const handleAppointmentClick = useCallback((appointment: Appointment, rect: DOMRect) => {
    setPopover({ appointment, rect })
  }, [])

  function handleDayClick(date: Date) {
    setCurrentDate(date)
    setMode('day')
  }

  const title = (() => {
    if (mode === 'day') return formatDayTitle(currentDate)
    if (mode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return formatWeekTitle(start, end)
    }
    return formatMonthTitle(currentDate)
  })()

  const weekDays = mode === 'week' ? getWeekDays(currentDate) : []
  const monthCells = mode === 'month' ? getMonthCells(currentDate) : []
  const dayAppts = mode === 'day'
    ? appointments.filter(a => isSameDay(new Date(a.startsAt), currentDate))
    : []

  return (
    <div className="flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm h-[calc(100vh-240px)] min-h-[500px]">
      {/* Calendar nav header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            className="px-3 py-1.5 bg-indigo-500 text-white text-[12.5px] font-semibold rounded-lg border-none cursor-pointer hover:bg-indigo-600 transition-colors"
            onClick={() => navigate('today')}
          >
            Hoje
          </button>
          <div className="flex gap-0.5">
            <button
              className="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-gray-600"
              onClick={() => navigate('prev')}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button
              className="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-gray-600"
              onClick={() => navigate('next')}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <span className="text-[15px] font-bold text-gray-900">{title}</span>
        </div>

        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
          {(['day', 'week', 'month'] as const).map(m => (
            <button
              key={m}
              className={cn(
                'px-3 py-1.5 text-[12.5px] font-semibold rounded-md border-none cursor-pointer transition-colors',
                mode === m ? 'bg-indigo-500 text-white shadow-sm' : 'bg-transparent text-gray-600 hover:bg-white'
              )}
              onClick={() => setMode(m)}
            >
              {m === 'day' ? 'Dia' : m === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid area */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20">
            <span className="text-sm text-gray-400">Carregando...</span>
          </div>
        )}
        {mode === 'week' && (
          <CalendarWeekGrid
            days={weekDays}
            appointments={appointments}
            today={today}
            onAppointmentClick={handleAppointmentClick}
          />
        )}
        {mode === 'day' && (
          <CalendarDayGrid
            appointments={dayAppts}
            onAppointmentClick={handleAppointmentClick}
          />
        )}
        {mode === 'month' && (
          <CalendarMonthGrid
            cells={monthCells}
            currentMonth={currentDate}
            appointments={appointments}
            today={today}
            onAppointmentClick={handleAppointmentClick}
            onDayClick={handleDayClick}
          />
        )}
      </div>

      {popover && (
        <AppointmentPopover
          appointment={popover.appointment}
          blockRect={popover.rect}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/appointments/_components/CalendarView.tsx
git commit -m "feat(web): add CalendarView shell component"
```

---

## Task 10: Wire everything into page.tsx

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/page.tsx`

- [ ] **Step 1: Replace `page.tsx` with the wired version**

Replace the entire contents of `packages/web/src/app/(tenant)/(app)/appointments/page.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppointments, useCancelAppointment } from '@/hooks/useAppointments'
import { useServices } from '@/hooks/useServices'
import { AvatarName } from '@/components/ui/AvatarName'
import { DateTimeCell } from '@/components/ui/DateTimeCell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { AppointmentFilters } from './_components/AppointmentFilters'
import { CalendarView } from './_components/CalendarView'
import { cn } from '@/lib/utils'
import type { Appointment } from '@/types'

type ViewMode = 'calendar' | 'list'

const STATUS_LABELS: Record<Appointment['status'], string> = {
  pending: 'Agendado', confirmed: 'Confirmado', cancelled: 'Cancelado', completed: 'Pago',
}
const STATUS_VARIANTS: Record<Appointment['status'], import('@/components/ui/StatusBadge').StatusVariant> = {
  pending: 'warning', confirmed: 'success', cancelled: 'error', completed: 'purple',
}

export default function AppointmentsPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [page, setPage] = useState(1)
  const [cancelId, setCancelId] = useState<string | null>(null)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [status, setStatus] = useState('')
  const [clientId, setClientId] = useState('')
  const [professionalId, setProfessionalId] = useState('')
  const [clientDisplayValue, setClientDisplayValue] = useState('')
  const [professionalDisplayValue, setProfessionalDisplayValue] = useState('')
  const [timeRange, setTimeRange] = useState<'' | 'future' | 'past'>('')

  const { data: servicesList = [] } = useServices()

  function localDateStr(d: Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  let effectiveDateFrom = dateFrom
  let effectiveDateTo = dateTo
  if (timeRange === 'future') { effectiveDateFrom = localDateStr(new Date()); effectiveDateTo = '' }
  else if (timeRange === 'past') {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    effectiveDateFrom = ''; effectiveDateTo = localDateStr(yesterday)
  }

  const listFilters = { dateFrom: effectiveDateFrom, dateTo: effectiveDateTo, serviceId, status, clientId, professionalId }
  const { data, isLoading } = useAppointments(page, listFilters)
  const cancel = useCancelAppointment()

  useEffect(() => { setPage(1) }, [timeRange, dateFrom, dateTo, serviceId, status, clientId, professionalId])

  const appointments = data?.data ?? []
  const total = data?.total ?? 0
  const limit = data?.limit ?? 10
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const hasFilters = !!(timeRange || dateFrom || dateTo || serviceId || status || clientId || professionalId)

  function clearFilters() {
    setTimeRange(''); setDateFrom(''); setDateTo('')
    setServiceId(''); setStatus(''); setClientId(''); setProfessionalId('')
    setClientDisplayValue(''); setProfessionalDisplayValue('')
  }

  const calendarFilters = { serviceId, status, clientId, professionalId }

  return (
    <>
      <div>
        {/* Page header */}
        <div className="flex items-center justify-between mb-4">
          {/* View toggle */}
          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <button
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold transition-colors',
                viewMode === 'calendar' ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:bg-gray-50'
              )}
              onClick={() => setViewMode('calendar')}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Calendário
            </button>
            <button
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold border-l border-gray-200 transition-colors',
                viewMode === 'list' ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:bg-gray-50'
              )}
              onClick={() => setViewMode('list')}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <circle cx="3" cy="6" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="3" cy="18" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
              Listagem
            </button>
          </div>

          <button
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-[13.5px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 transition-colors"
            onClick={() => router.push('/appointments/create')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo agendamento
          </button>
        </div>

        {/* Filters */}
        <AppointmentFilters
          viewMode={viewMode}
          timeRange={timeRange} dateFrom={dateFrom} dateTo={dateTo}
          serviceId={serviceId} status={status} clientId={clientId} professionalId={professionalId}
          clientDisplayValue={clientDisplayValue} professionalDisplayValue={professionalDisplayValue}
          servicesList={servicesList} hasFilters={hasFilters}
          onTimeRangeChange={setTimeRange}
          onDateFromChange={setDateFrom} onDateToChange={setDateTo}
          onServiceIdChange={setServiceId} onStatusChange={setStatus}
          onClientInput={v => { setClientDisplayValue(v); if (clientId) setClientId('') }}
          onClientSelect={(id, name) => { setClientId(id); setClientDisplayValue(name) }}
          onClientClear={() => { setClientId(''); setClientDisplayValue('') }}
          onProfessionalInput={v => { setProfessionalDisplayValue(v); if (professionalId) setProfessionalId('') }}
          onProfessionalSelect={(id, name) => { setProfessionalId(id); setProfessionalDisplayValue(name) }}
          onProfessionalClear={() => { setProfessionalId(''); setProfessionalDisplayValue('') }}
          onClearFilters={clearFilters}
        />

        {/* Content */}
        {viewMode === 'calendar' ? (
          <CalendarView filters={calendarFilters} />
        ) : (
          <>
            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {isLoading ? (
                <div className="p-12 text-center text-gray-400 text-sm">Carregando...</div>
              ) : !appointments.length ? (
                <EmptyState
                  title="Nenhum agendamento"
                  description={hasFilters ? 'Nenhum agendamento encontrado para os filtros aplicados.' : 'Nenhum agendamento cadastrado.'}
                />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {['Agendado em', 'Cliente', 'Profissional', 'Serviço', 'Status', 'Cadastrado em', 'Ação'].map(col => (
                            <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em] whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((appt: Appointment) => (
                          <tr key={appt.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                            <td className="px-4 py-3.5"><DateTimeCell iso={appt.startsAt} /></td>
                            <td className="px-4 py-3.5">
                              <Link href={`/clients/${appt.clientId}`} className="hover:opacity-75 transition-opacity">
                                <AvatarName name={appt.clientName} avatarUrl={appt.clientAvatarUrl} />
                              </Link>
                            </td>
                            <td className="px-4 py-3.5">
                              <Link href={`/professionals/${appt.professionalId}`} className="hover:opacity-75 transition-opacity">
                                <AvatarName name={appt.professionalName} avatarUrl={appt.professionalAvatarUrl} />
                              </Link>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap text-gray-500">{appt.serviceName}</td>
                            <td className="px-4 py-3.5">
                              <StatusBadge label={STATUS_LABELS[appt.status]} variant={STATUS_VARIANTS[appt.status]} />
                            </td>
                            <td className="px-4 py-3.5"><DateTimeCell iso={appt.createdAt} /></td>
                            <td className="px-4 py-3.5">
                              {(appt.status === 'pending' || appt.status === 'confirmed') && (
                                <button
                                  className="px-3 py-[5px] border border-red-200 bg-white text-red-600 rounded-md text-[12px] font-medium cursor-pointer hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  onClick={() => setCancelId(appt.id)}
                                >
                                  Cancelar
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                    <p className="text-[13px] text-gray-500 m-0">Página {page} de {totalPages}</p>
                    <div className="flex gap-2">
                      <button
                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-md text-[13px] font-medium cursor-pointer hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        onClick={() => setPage(p => p - 1)} disabled={page <= 1}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                        Anterior
                      </button>
                      <button
                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-md text-[13px] font-medium cursor-pointer hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
                      >
                        Próxima
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Cancel modal */}
      {cancelId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => !cancel.isPending && setCancelId(null)}>
          <div className="bg-white rounded-xl p-7 w-full max-w-[400px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900 m-0 mb-2">Cancelar agendamento</h2>
            <p className="text-[13.5px] text-gray-500 m-0 mb-6 leading-relaxed">Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2.5 justify-end">
              <button onClick={() => setCancelId(null)} disabled={cancel.isPending} className="px-4 py-[9px] border border-gray-200 bg-white text-gray-700 text-[13.5px] font-semibold rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">Voltar</button>
              <button onClick={() => cancel.mutate(cancelId!, { onSuccess: () => setCancelId(null) })} disabled={cancel.isPending} className="px-5 py-[9px] bg-red-600 text-white text-[13.5px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 disabled:opacity-65 transition-colors">
                {cancel.isPending ? 'Cancelando...' : 'Sim, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
cd /home/willavelar/Projects/MyOwn/NODEJS/scheduler/packages/web
pnpm build 2>&1 | tail -30
```

Expected: no TypeScript errors. If errors appear, fix them before proceeding.

- [ ] **Step 3: Start dev server and smoke test**

```bash
cd /home/willavelar/Projects/MyOwn/NODEJS/scheduler
pnpm dev:api &
pnpm dev:web
```

Open `http://localhost:3000` and verify:
- [ ] Page loads in calendar mode by default showing week view
- [ ] Toggle switches to list mode — existing table still works
- [ ] Back to calendar — filters (service, status, client, professional) apply correctly
- [ ] Navigate between weeks with arrows
- [ ] "Hoje" button returns to current week
- [ ] Switch to Dia view — single column with appointments
- [ ] Switch to Mês view — monthly grid with event strips
- [ ] Click on an appointment block — popover appears with client name, service, professional, status
- [ ] Popover ⋮ dropdown shows correct status options
- [ ] Popover ✕ closes it
- [ ] "+ N mais" in month view navigates to day view
- [ ] Appointment blocks in week view sized proportionally to duration

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/appointments/page.tsx
git commit -m "feat(web): wire calendar view into appointments page with toggle"
```

---

## Self-Review Checklist

- [x] **API limit cap** → Task 1, Step 4: `Math.min(500, ...)`
- [x] **DELETE endpoint** → Task 1, Step 4: `@Delete(':id')` + `@Roles('tenant_admin')`
- [x] **Color system** → Task 2: `clientColor()` hash in `calendarColors.ts`
- [x] **Week view (7 cols, time grid, 15min min)** → Task 7: `CalendarWeekGrid`
- [x] **Day view** → Task 7: `CalendarDayGrid`
- [x] **Month view with "+N mais"** → Task 8: `CalendarMonthGrid`
- [x] **Block content: client, service, start–end** → Task 5: `CalendarEventBlock`
- [x] **Overlap detection** → Task 2: `layoutAppointments()` in `calendarUtils.ts`
- [x] **Popover: edit (disabled), delete, ⋮ status, close** → Task 6: `AppointmentPopover`
- [x] **Popover positioning + flip logic** → Task 6: `left`/`top` calc with boundary checks
- [x] **Toggle default = calendar** → Task 10: `useState<ViewMode>('calendar')`
- [x] **Filters shared between modes** → Task 10: all filter state in `page.tsx`
- [x] **Date filters hidden in calendar mode** → Task 4: `viewMode === 'list'` guard
- [x] **Scroll to 07:00 on mount** → Tasks 7: `useEffect scrollTop = 7 * HOUR_HEIGHT`
- [x] **"Hoje" + arrow navigation** → Task 9: `navigate()` in `CalendarView`
- [x] **"+N mais" → day view** → Task 9: `onDayClick` + `setMode('day')`
