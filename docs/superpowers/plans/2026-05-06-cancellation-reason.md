# Cancellation Reason Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-tenant setting for cancellation reason collection (off / optional / required) that shows a modal with a textarea when cancelling appointments in both list and calendar views.

**Architecture:** Schema change adds one enum column to `tenants` and one nullable text column to `appointments`. The API cancel endpoint gains an optional `reason` body field. A shared `CancelAppointmentModal` component handles all cancellation flows on the frontend, reading the tenant setting from context.

**Tech Stack:** NestJS + Drizzle ORM (API), Next.js 16 App Router + TanStack Query + Tailwind (web), Jest (API tests), PostgreSQL RLS.

---

## File Map

| Action | File |
|--------|------|
| Modify | `packages/shared/src/schema/tenants.schema.ts` |
| Modify | `packages/shared/src/schema/appointments.schema.ts` |
| Generate | `packages/api/migrations/0009_cancellation_reason.sql` (via drizzle-kit) |
| Modify | `packages/api/src/tenants/dto/update-tenant.dto.ts` |
| Modify | `packages/api/src/tenants/tenants.service.ts` |
| Create | `packages/api/src/appointments/dto/cancel-appointment.dto.ts` |
| Modify | `packages/api/src/appointments/appointments.controller.ts` |
| Modify | `packages/api/src/appointments/appointments.service.ts` |
| Create | `packages/api/src/appointments/appointments.service.spec.ts` |
| Modify | `packages/web/src/hooks/useTenantSettings.ts` |
| Modify | `packages/web/src/providers/TenantSettingsProvider.tsx` |
| Modify | `packages/web/src/app/(tenant)/(app)/settings/_components/TenantGeneralForm.tsx` |
| Modify | `packages/web/src/hooks/useAppointments.ts` |
| Create | `packages/web/src/app/(tenant)/(app)/appointments/_components/CancelAppointmentModal.tsx` |
| Modify | `packages/web/src/app/(tenant)/(app)/appointments/page.tsx` |
| Modify | `packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentPopover.tsx` |

---

## Task 1: Update shared schemas

**Files:**
- Modify: `packages/shared/src/schema/tenants.schema.ts`
- Modify: `packages/shared/src/schema/appointments.schema.ts`

- [ ] **Step 1: Add cancellationReasonMode to tenants schema**

Replace the entire file `packages/shared/src/schema/tenants.schema.ts` with:

```ts
import { boolean, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const confirmationModeEnum = pgEnum('confirmation_mode', ['auto', 'manual']);
export const cancellationReasonModeEnum = pgEnum('cancellation_reason_mode', ['no', 'optional', 'required']);

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  confirmationMode: confirmationModeEnum('confirmation_mode').notNull().default('auto'),
  allowPaidStatus: boolean('allow_paid_status').notNull().default(true),
  cancellationReasonMode: cancellationReasonModeEnum('cancellation_reason_mode').notNull().default('no'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
```

- [ ] **Step 2: Add cancellationReason to appointments schema**

Replace the entire file `packages/shared/src/schema/appointments.schema.ts` with:

```ts
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';
import { professionals } from './professionals.schema';
import { services } from './services.schema';
import { users } from './users.schema';

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'pending', 'confirmed', 'cancelled', 'completed',
]);

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  status: appointmentStatusEnum('status').notNull().default('pending'),
  notes: text('notes'),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
```

---

## Task 2: Generate and apply migration

**Files:**
- Generate: `packages/api/migrations/0009_cancellation_reason.sql`

- [ ] **Step 1: Generate the migration SQL**

Run from the repo root (requires Docker with DB running):

```bash
pnpm db:generate
```

Expected: A new file appears in `packages/api/migrations/` named something like `0009_<name>.sql`. It should contain:
```sql
CREATE TYPE "cancellation_reason_mode" AS ENUM('no', 'optional', 'required');
ALTER TABLE "tenants" ADD COLUMN "cancellation_reason_mode" "cancellation_reason_mode" NOT NULL DEFAULT 'no';
ALTER TABLE "appointments" ADD COLUMN "cancellation_reason" text;
```

- [ ] **Step 2: Apply the migration**

```bash
docker compose exec api pnpm --filter api db:migrate
```

Expected output: Migration applied successfully, no errors.

- [ ] **Step 3: Commit schema + migration**

```bash
git add packages/shared/src/schema/tenants.schema.ts \
        packages/shared/src/schema/appointments.schema.ts \
        packages/api/migrations/
git commit -m "feat(schema): add cancellation_reason_mode to tenants and cancellation_reason to appointments"
```

---

## Task 3: Backend — Tenant DTO and service

**Files:**
- Modify: `packages/api/src/tenants/dto/update-tenant.dto.ts`
- Modify: `packages/api/src/tenants/tenants.service.ts`

- [ ] **Step 1: Add cancellationReasonMode to the update DTO**

Replace the entire file `packages/api/src/tenants/dto/update-tenant.dto.ts` with:

```ts
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @ValidateIf((o) => o.logoUrl !== null)
  @IsString()
  @MaxLength(200_000)
  logoUrl?: string | null;

  @IsOptional()
  @IsIn(['auto', 'manual'])
  confirmationMode?: 'auto' | 'manual';

  @IsOptional()
  @IsBoolean()
  allowPaidStatus?: boolean;

  @IsOptional()
  @IsIn(['no', 'optional', 'required'])
  cancellationReasonMode?: 'no' | 'optional' | 'required';
}
```

- [ ] **Step 2: Update TenantsService to include cancellationReasonMode**

Replace the entire file `packages/api/src/tenants/tenants.service.ts` with:

```ts
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { tenants } from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { REDIS } from '../redis/redis.module';
import type Redis from 'ioredis';
import { UpdateTenantDto } from './dto/update-tenant.dto';

const TENANT_CACHE_TTL = 3600;

@Injectable()
export class TenantsService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async resolveTenantId(slug: string): Promise<string | null> {
    const cacheKey = `tenant:slug:${slug}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const [tenant] = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug));

    if (!tenant) return null;

    await this.redis.set(cacheKey, tenant.id, 'EX', TENANT_CACHE_TTL);
    return tenant.id;
  }

  async findCurrent(tenantId: string) {
    const [tenant] = await this.db
      .select({
        id:                     tenants.id,
        name:                   tenants.name,
        slug:                   tenants.slug,
        logoUrl:                tenants.logoUrl,
        confirmationMode:       tenants.confirmationMode,
        allowPaidStatus:        tenants.allowPaidStatus,
        cancellationReasonMode: tenants.cancellationReasonMode,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId));

    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(tenantId: string, dto: UpdateTenantDto) {
    const patch: Partial<typeof tenants.$inferInsert> = {};
    if (dto.name                   !== undefined) patch.name                   = dto.name;
    if (dto.logoUrl                !== undefined) patch.logoUrl                = dto.logoUrl;
    if (dto.confirmationMode       !== undefined) patch.confirmationMode       = dto.confirmationMode;
    if (dto.allowPaidStatus        !== undefined) patch.allowPaidStatus        = dto.allowPaidStatus;
    if (dto.cancellationReasonMode !== undefined) patch.cancellationReasonMode = dto.cancellationReasonMode;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('No updatable fields provided');
    }

    const [updated] = await this.db
      .update(tenants)
      .set(patch)
      .where(eq(tenants.id, tenantId))
      .returning({
        id:                     tenants.id,
        name:                   tenants.name,
        slug:                   tenants.slug,
        logoUrl:                tenants.logoUrl,
        confirmationMode:       tenants.confirmationMode,
        allowPaidStatus:        tenants.allowPaidStatus,
        cancellationReasonMode: tenants.cancellationReasonMode,
      });

    if (!updated) throw new NotFoundException('Tenant not found');
    return updated;
  }
}
```

- [ ] **Step 3: Run existing tenant tests to confirm nothing broke**

```bash
cd packages/api && pnpm test -- --testPathPattern="tenants.service" --no-coverage
```

Expected: All tests pass (2 tests).

---

## Task 4: Backend — Cancel appointment endpoint

**Files:**
- Create: `packages/api/src/appointments/dto/cancel-appointment.dto.ts`
- Modify: `packages/api/src/appointments/appointments.controller.ts`
- Modify: `packages/api/src/appointments/appointments.service.ts`

- [ ] **Step 1: Write the failing test for updateStatus with reason**

Create `packages/api/src/appointments/appointments.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { DB } from '../database/database.module';
import { AvailabilityService } from '../availability/availability.service';

jest.mock('../database/with-tenant', () => ({
  withTenant: (_db: any, _tenantId: string, fn: (tx: any) => any) => fn(_db),
}));

describe('AppointmentsService.updateStatus', () => {
  let service: AppointmentsService;

  const mockReturning = jest.fn();
  const mockWhere     = jest.fn().mockReturnValue({ returning: mockReturning });
  const mockSet       = jest.fn().mockReturnValue({ where: mockWhere });
  const mockUpdate    = jest.fn().mockReturnValue({ set: mockSet });
  const mockFetchWhere = jest.fn();
  const mockFrom       = jest.fn().mockReturnValue({ where: mockFetchWhere });
  const mockSelect     = jest.fn().mockReturnValue({ from: mockFrom });

  const mockDb = { select: mockSelect, update: mockUpdate };
  const mockAvailabilityService = { getAvailableSlots: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockFetchWhere });
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ returning: mockReturning });

    const module = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: DB, useValue: mockDb },
        { provide: AvailabilityService, useValue: mockAvailabilityService },
      ],
    }).compile();
    service = module.get(AppointmentsService);
  });

  it('cancels appointment without reason when none is provided', async () => {
    mockFetchWhere.mockResolvedValue([{ id: 'appt-1', status: 'confirmed', tenantId: 'tenant-1' }]);
    mockReturning.mockResolvedValue([{ id: 'appt-1', status: 'cancelled', cancellationReason: null }]);

    await service.updateStatus('appt-1', 'cancelled', 'tenant-1');

    expect(mockSet).toHaveBeenCalledWith({ status: 'cancelled' });
  });

  it('persists cancellation reason when provided', async () => {
    mockFetchWhere.mockResolvedValue([{ id: 'appt-1', status: 'confirmed', tenantId: 'tenant-1' }]);
    mockReturning.mockResolvedValue([{ id: 'appt-1', status: 'cancelled', cancellationReason: 'Client requested' }]);

    await service.updateStatus('appt-1', 'cancelled', 'tenant-1', 'Client requested');

    expect(mockSet).toHaveBeenCalledWith({ status: 'cancelled', cancellationReason: 'Client requested' });
  });

  it('throws NotFoundException when appointment does not exist', async () => {
    mockFetchWhere.mockResolvedValue([]);

    await expect(
      service.updateStatus('nonexistent', 'cancelled', 'tenant-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd packages/api && pnpm test -- --testPathPattern="appointments.service" --no-coverage
```

Expected: FAIL — `service.updateStatus` doesn't accept a 4th argument yet, so the reason test should fail or error.

- [ ] **Step 3: Create the CancelAppointmentDto**

Create `packages/api/src/appointments/dto/cancel-appointment.dto.ts`:

```ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelAppointmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
```

- [ ] **Step 4: Update AppointmentsService.updateStatus to accept reason**

In `packages/api/src/appointments/appointments.service.ts`, replace the `updateStatus` method (lines 292–317) with:

```ts
async updateStatus(
  id: string,
  status: 'confirmed' | 'cancelled' | 'completed',
  tenantId: string,
  reason?: string,
) {
  return withTenant(this.db, tenantId, async (tx) => {
    if (status === 'completed') {
      const [tenant] = await tx
        .select({ allowPaidStatus: tenants.allowPaidStatus })
        .from(tenants)
        .where(eq(tenants.id, tenantId));
      if (!tenant?.allowPaidStatus) {
        throw new BadRequestException('Paid status is not enabled for this tenant');
      }
    }

    const [appt] = await tx
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)));
    if (!appt) throw new NotFoundException('Appointment not found');

    const setPayload: { status: typeof status; cancellationReason?: string } = { status };
    if (status === 'cancelled' && reason) {
      setPayload.cancellationReason = reason;
    }

    const [updated] = await tx
      .update(appointments)
      .set(setPayload)
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
      .returning();
    return updated;
  });
}
```

- [ ] **Step 5: Update the controller cancel endpoint to accept body**

Replace the entire file `packages/api/src/appointments/appointments.controller.ts` with:

```ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('appointments')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
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

  @Get('limit-check')
  checkLimit(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string; role: string },
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
    @Query('clientId') clientId?: string,
  ) {
    const resolvedClientId =
      clientId && (user.role === 'tenant_admin' || user.role === 'professional')
        ? clientId
        : user.id;
    return this.service.checkLimit(resolvedClientId, serviceId, date, tenantId);
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
  cancel(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.service.updateStatus(id, 'cancelled', tenantId, dto.reason);
  }

  @Patch(':id/complete')
  @Roles('tenant_admin', 'professional')
  complete(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.updateStatus(id, 'completed', tenantId);
  }

  @Delete(':id')
  @Roles('tenant_admin')
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.remove(id, tenantId);
  }
}
```

- [ ] **Step 6: Run the tests to confirm they pass**

```bash
cd packages/api && pnpm test -- --testPathPattern="appointments.service" --no-coverage
```

Expected: 3 tests pass.

- [ ] **Step 7: Run the full API test suite**

```bash
cd packages/api && pnpm test -- --no-coverage
```

Expected: All tests pass.

- [ ] **Step 8: Commit backend changes**

```bash
git add packages/api/src/tenants/dto/update-tenant.dto.ts \
        packages/api/src/tenants/tenants.service.ts \
        packages/api/src/appointments/dto/cancel-appointment.dto.ts \
        packages/api/src/appointments/appointments.controller.ts \
        packages/api/src/appointments/appointments.service.ts \
        packages/api/src/appointments/appointments.service.spec.ts
git commit -m "feat(api): add cancellationReasonMode to tenant settings and reason to cancel endpoint"
```

---

## Task 5: Frontend — Hook types and settings provider

**Files:**
- Modify: `packages/web/src/hooks/useTenantSettings.ts`
- Modify: `packages/web/src/providers/TenantSettingsProvider.tsx`

- [ ] **Step 1: Add cancellationReasonMode to the TenantSettings type and mutation**

Replace the entire file `packages/web/src/hooks/useTenantSettings.ts` with:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'
import { useAuth } from '@/providers/AuthProvider'

export type TenantSettings = {
  id:                     string
  name:                   string
  slug:                   string
  logoUrl:                string | null
  confirmationMode:       'auto' | 'manual'
  allowPaidStatus:        boolean
  cancellationReasonMode: 'no' | 'optional' | 'required'
}

export function useTenantSettings() {
  const api = useApi()
  const { slug } = useTenant()
  const { accessToken } = useAuth()
  return useQuery<TenantSettings>({
    queryKey: ['tenant-settings', slug],
    queryFn:  async () => (await api('/tenants/me')).json(),
    enabled:  !!accessToken,
  })
}

export function useUpdateTenantSettings() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (body: {
      name?:                   string
      logoUrl?:                string | null
      confirmationMode?:       'auto' | 'manual'
      allowPaidStatus?:        boolean
      cancellationReasonMode?: 'no' | 'optional' | 'required'
    }) =>
      api('/tenants/me', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['tenant-settings', slug] }),
  })
}
```

- [ ] **Step 2: Expose cancellationReasonMode from the settings provider**

Replace the entire file `packages/web/src/providers/TenantSettingsProvider.tsx` with:

```tsx
'use client'

import { createContext, useContext, useEffect } from 'react'
import { useTenantSettings } from '@/hooks/useTenantSettings'

type TenantSettingsContextValue = {
  tenantName:             string
  tenantLogoUrl:          string | null
  confirmationMode:       'auto' | 'manual'
  allowPaidStatus:        boolean
  cancellationReasonMode: 'no' | 'optional' | 'required'
}

const TenantSettingsContext = createContext<TenantSettingsContextValue>({
  tenantName:             '',
  tenantLogoUrl:          null,
  confirmationMode:       'auto',
  allowPaidStatus:        true,
  cancellationReasonMode: 'no',
})

export function TenantSettingsProvider({ children }: { children: React.ReactNode }) {
  const { data } = useTenantSettings()

  const tenantName             = data?.name                   ?? ''
  const tenantLogoUrl          = data?.logoUrl                ?? null
  const confirmationMode       = data?.confirmationMode       ?? 'auto'
  const allowPaidStatus        = data?.allowPaidStatus        ?? true
  const cancellationReasonMode = data?.cancellationReasonMode ?? 'no'

  useEffect(() => {
    if (!tenantName) return
    const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Scheduler'
    document.title = `${tenantName} | ${appName}`
  }, [tenantName])

  return (
    <TenantSettingsContext.Provider value={{
      tenantName,
      tenantLogoUrl,
      confirmationMode,
      allowPaidStatus,
      cancellationReasonMode,
    }}>
      {children}
    </TenantSettingsContext.Provider>
  )
}

export function useTenantSettingsContext() {
  return useContext(TenantSettingsContext)
}
```

---

## Task 6: Frontend — Settings form segmented control

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/settings/_components/TenantGeneralForm.tsx`

- [ ] **Step 1: Add the cancellation reason selector to the Comportamento section**

Replace the entire file `packages/web/src/app/(tenant)/(app)/settings/_components/TenantGeneralForm.tsx` with:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { LogoCropField } from '@/components/ui/LogoCropField'
import { useTenantSettings, useUpdateTenantSettings } from '@/hooks/useTenantSettings'
import { cn } from '@/lib/utils'

type CancelReasonMode = 'no' | 'optional' | 'required'

const CANCEL_REASON_OPTIONS: { value: CancelReasonMode; label: string }[] = [
  { value: 'no',       label: 'Não' },
  { value: 'optional', label: 'Sim' },
  { value: 'required', label: 'Obrigatório' },
]

const inputCls = (disabled = false) => cn(
  'w-full h-[42px] px-3 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none transition-colors',
  disabled
    ? 'opacity-60 cursor-not-allowed bg-gray-50'
    : 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
)

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
        checked ? 'bg-indigo-500' : 'bg-gray-200',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

export function TenantGeneralForm() {
  const { data, isLoading } = useTenantSettings()
  const { mutateAsync, isPending } = useUpdateTenantSettings()

  const [name,     setName]     = useState('')
  const [logoUrl,  setLogoUrl]  = useState<string | null>(null)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  const [allowPaidStatus,    setAllowPaidStatus]    = useState(true)
  const [requiresConfirm,    setRequiresConfirm]    = useState(false)
  const [cancelReasonMode,   setCancelReasonMode]   = useState<CancelReasonMode>('no')
  const [toggleSaving,       setToggleSaving]       = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    setName(data.name)
    setLogoUrl(data.logoUrl)
    setAllowPaidStatus(data.allowPaidStatus)
    setRequiresConfirm(data.confirmationMode === 'manual')
    setCancelReasonMode(data.cancellationReasonMode)
  }, [data])

  if (isLoading) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || name.trim().length < 2) {
      setError('Nome deve ter pelo menos 2 caracteres.')
      return
    }
    setError('')
    setSuccess(false)
    try {
      await mutateAsync({ name: name.trim(), logoUrl })
      setSuccess(true)
    } catch {
      setError('Não foi possível salvar as alterações. Tente novamente.')
    }
  }

  async function handleTogglePaidStatus(value: boolean) {
    setAllowPaidStatus(value)
    setToggleSaving('paid')
    try {
      await mutateAsync({ allowPaidStatus: value })
    } catch {
      setAllowPaidStatus(!value)
    } finally {
      setToggleSaving(null)
    }
  }

  async function handleToggleConfirmation(value: boolean) {
    setRequiresConfirm(value)
    setToggleSaving('confirm')
    try {
      await mutateAsync({ confirmationMode: value ? 'manual' : 'auto' })
    } catch {
      setRequiresConfirm(!value)
    } finally {
      setToggleSaving(null)
    }
  }

  async function handleCancelReasonModeChange(value: CancelReasonMode) {
    const prev = cancelReasonMode
    setCancelReasonMode(value)
    setToggleSaving('cancelReason')
    try {
      await mutateAsync({ cancellationReasonMode: value })
    } catch {
      setCancelReasonMode(prev)
    } finally {
      setToggleSaving(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* ── Logo ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 m-0 mb-5">Logo</p>
        <p className="text-[13px] text-gray-500 m-0 mb-4">
          Aparece no topo do menu lateral. Proporção 3:1 (horizontal).
        </p>
        <LogoCropField value={logoUrl} onChange={(v) => { setLogoUrl(v); setSuccess(false) }} />
        {logoUrl && (
          <button
            type="button"
            onClick={() => setLogoUrl(null)}
            className="mt-3 text-xs text-red-500 hover:text-red-700 bg-transparent border-0 cursor-pointer p-0 transition-colors"
          >
            Remover logo
          </button>
        )}
      </div>

      {/* ── Dados ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 m-0 mb-5">Informações</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tenant-name" className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Nome <span className="text-red-400">*</span>
            </label>
            <input
              id="tenant-name"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); setSuccess(false) }}
              className={inputCls()}
            />
          </div>
          <div>
            <label htmlFor="tenant-slug" className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Host (slug)
            </label>
            <input
              id="tenant-slug"
              type="text"
              value={data?.slug ?? ''}
              disabled
              className={inputCls(true)}
            />
            <p className="text-[11px] text-gray-400 mt-1 m-0">O host não pode ser alterado.</p>
          </div>
        </div>
      </div>

      {/* ── Comportamento ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
        <p className="text-sm font-bold text-gray-900 m-0 mb-5">Comportamento</p>

        <div className="space-y-5">
          {/* Toggle: Paid status */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-gray-900 m-0 mb-0.5">Habilitar status "Pago"</p>
              <p className="text-[12px] text-gray-500 m-0">
                Permite marcar agendamentos como pagos. Quando desativado, a opção é removida do sistema.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {toggleSaving === 'paid' && (
                <svg className="animate-spin text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              )}
              <Toggle
                checked={allowPaidStatus}
                onChange={handleTogglePaidStatus}
                disabled={toggleSaving === 'paid'}
              />
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Toggle: Confirmation required */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-gray-900 m-0 mb-0.5">Exigir confirmação de agendamentos</p>
              <p className="text-[12px] text-gray-500 m-0">
                Novos agendamentos criados por clientes ficam como "Aguardando confirmação" até serem confirmados.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {toggleSaving === 'confirm' && (
                <svg className="animate-spin text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              )}
              <Toggle
                checked={requiresConfirm}
                onChange={handleToggleConfirmation}
                disabled={toggleSaving === 'confirm'}
              />
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Segmented control: Cancellation reason mode */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-gray-900 m-0 mb-0.5">Motivo de cancelamento</p>
              <p className="text-[12px] text-gray-500 m-0">
                Define se o usuário precisa informar um motivo ao cancelar um agendamento.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {toggleSaving === 'cancelReason' && (
                <svg className="animate-spin text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              )}
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                {CANCEL_REASON_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={toggleSaving === 'cancelReason'}
                    onClick={() => handleCancelReasonModeChange(opt.value)}
                    className={cn(
                      'px-3 py-1.5 text-[12px] font-medium border-0 cursor-pointer transition-colors',
                      cancelReasonMode === opt.value
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50',
                      i < CANCEL_REASON_OPTIONS.length - 1 && 'border-r border-gray-200',
                      toggleSaving === 'cancelReason' && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      {error && (
        <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[13px] text-emerald-700">
          Alterações salvas com sucesso.
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="h-[42px] px-6 bg-indigo-500 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer inline-flex items-center gap-2 hover:bg-indigo-600 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Salvando...
            </>
          ) : 'Salvar alterações'}
        </button>
      </div>

    </form>
  )
}
```

---

## Task 7: Frontend — Update useCancelAppointment signature

**Files:**
- Modify: `packages/web/src/hooks/useAppointments.ts`

- [ ] **Step 1: Change mutationFn to accept {id, reason?} instead of just id**

In `packages/web/src/hooks/useAppointments.ts`, replace the `useCancelAppointment` function (lines 66–78) with:

```ts
export function useCancelAppointment() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api(`/appointments/${id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', slug] })
      queryClient.invalidateQueries({ queryKey: ['appointments-calendar', slug] })
    },
  })
}
```

---

## Task 8: Frontend — Create CancelAppointmentModal component

**Files:**
- Create: `packages/web/src/app/(tenant)/(app)/appointments/_components/CancelAppointmentModal.tsx`

- [ ] **Step 1: Create the shared modal component**

Create `packages/web/src/app/(tenant)/(app)/appointments/_components/CancelAppointmentModal.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useCancelAppointment } from '@/hooks/useAppointments'
import { useTenantSettingsContext } from '@/providers/TenantSettingsProvider'
import { cn } from '@/lib/utils'

type Props = {
  appointmentId: string | null
  onClose: () => void
  onSuccess?: () => void
}

export function CancelAppointmentModal({ appointmentId, onClose, onSuccess }: Props) {
  const { cancellationReasonMode } = useTenantSettingsContext()
  const [reason, setReason] = useState('')
  const cancelMut = useCancelAppointment()

  if (!appointmentId) return null

  const showTextarea = cancellationReasonMode !== 'no'
  const submitDisabled =
    cancelMut.isPending ||
    (cancellationReasonMode === 'required' && reason.trim().length < 3)

  function handleConfirm() {
    cancelMut.mutate(
      { id: appointmentId!, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          onSuccess?.()
          onClose()
        },
      },
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={() => !cancelMut.isPending && onClose()}
    >
      <div
        className="bg-white rounded-xl p-7 w-full max-w-[400px] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>

        <h2 className="text-base font-bold text-gray-900 m-0 mb-2">
          Cancelar agendamento
        </h2>
        <p className="text-[13.5px] text-gray-500 m-0 mb-5 leading-relaxed">
          Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
        </p>

        {showTextarea && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[13px] font-medium text-gray-700">
                Motivo
                {cancellationReasonMode === 'required' && (
                  <span className="text-red-400 ml-0.5">*</span>
                )}
              </label>
              <span className="text-[11px] text-gray-400">{reason.length}/255</span>
            </div>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value.slice(0, 255))}
              placeholder="Informe o motivo do cancelamento"
              rows={3}
              className="w-full px-3 py-2 text-sm text-gray-900 bg-white rounded-lg border border-gray-200 outline-none resize-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
            />
            {cancellationReasonMode === 'required' && reason.trim().length > 0 && reason.trim().length < 3 && (
              <p className="text-[11px] text-red-500 mt-1 m-0">Mínimo de 3 caracteres.</p>
            )}
          </div>
        )}

        <div className="flex gap-2.5 justify-end">
          <button
            onClick={onClose}
            disabled={cancelMut.isPending}
            className="px-4 py-[9px] border border-gray-200 bg-white text-gray-700 text-[13.5px] font-semibold rounded-lg cursor-pointer hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Voltar
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitDisabled}
            className="px-5 py-[9px] bg-red-600 text-white text-[13.5px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 disabled:opacity-65 transition-colors"
          >
            {cancelMut.isPending ? 'Cancelando...' : 'Sim, cancelar'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## Task 9: Frontend — Wire CancelAppointmentModal into the list page

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/page.tsx`

- [ ] **Step 1: Replace the inline cancel modal with the shared component**

In `packages/web/src/app/(tenant)/(app)/appointments/page.tsx`:

1. Add this import near the top (after `CalendarView` import):
```ts
import { CancelAppointmentModal } from './_components/CancelAppointmentModal'
```

2. Remove these lines:
```ts
const cancel = useCancelAppointment()
```
and
```ts
  function confirmCancel() {
    if (!cancelId) return
    cancel.mutate(cancelId, { onSuccess: () => setCancelId(null) })
  }
```
and the import `useCancelAppointment` from the `useAppointments` import line (keep the rest of that import).

3. Replace the entire `{cancelId && (<div ...>...</div>)}` block at the bottom of the return (lines 288–331 in the original) with:
```tsx
<CancelAppointmentModal
  appointmentId={cancelId}
  onClose={() => setCancelId(null)}
/>
```

The final file should look like this (replace entirely):

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppointments } from '@/hooks/useAppointments'
import { useServices } from '@/hooks/useServices'
import { AvatarName } from '@/components/ui/AvatarName'
import { DateTimeCell } from '@/components/ui/DateTimeCell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Appointment } from '@/types'
import { AppointmentFilters } from './_components/AppointmentFilters'
import { CalendarView } from './_components/CalendarView'
import { CancelAppointmentModal } from './_components/CancelAppointmentModal'

const STATUS_LABELS: Record<Appointment['status'], string> = {
  pending:   'Aguardando confirmação',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Pago',
}

const STATUS_VARIANTS: Record<Appointment['status'], import('@/components/ui/StatusBadge').StatusVariant> = {
  pending:   'warning',
  confirmed: 'success',
  cancelled: 'error',
  completed: 'purple',
}

export default function AppointmentsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [serviceId,    setServiceId]    = useState('')
  const [status,       setStatus]       = useState('')
  const [clientId,       setClientId]       = useState('')
  const [professionalId, setProfessionalId] = useState('')

  const [clientDisplayValue, setClientDisplayValue] = useState('')
  const [professionalDisplayValue, setProfessionalDisplayValue] = useState('')

  const [timeRange, setTimeRange] = useState<'' | 'future' | 'past'>('')

  function localDateStr(d: Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const { data: servicesList = [] } = useServices()

  let effectiveDateFrom = dateFrom
  let effectiveDateTo   = dateTo
  if (timeRange === 'future') {
    effectiveDateFrom = localDateStr(new Date())
    effectiveDateTo   = ''
  } else if (timeRange === 'past') {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    effectiveDateFrom = ''
    effectiveDateTo   = localDateStr(yesterday)
  }

  const filters = { dateFrom: effectiveDateFrom, dateTo: effectiveDateTo, serviceId, status, clientId, professionalId }
  const { data, isLoading } = useAppointments(page, filters)

  useEffect(() => { setPage(1) }, [timeRange, dateFrom, dateTo, serviceId, status, clientId, professionalId])

  const appointments = data?.data ?? []
  const total = data?.total ?? 0
  const limit = data?.limit ?? 10
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const hasFilters = !!(timeRange || dateFrom || dateTo || serviceId || status || clientId || professionalId)

  function clearFilters() {
    setTimeRange('')
    setDateFrom('');  setDateTo('')
    setServiceId(''); setStatus('');  setClientId(''); setProfessionalId('')
    setClientDisplayValue(''); setProfessionalDisplayValue('')
  }

  function selectClient(id: string, name: string) {
    setClientId(id)
    setClientDisplayValue(name)
  }

  function handleClientInput(value: string) {
    setClientDisplayValue(value)
    if (clientId) setClientId('')
  }

  return (
    <>
      <div>
        {/* Page header */}
        <div className="flex items-center justify-between mb-4">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex">
            <button
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer ${viewMode === 'calendar' ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
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
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
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

        <AppointmentFilters
          viewMode={viewMode}
          timeRange={timeRange}
          dateFrom={dateFrom}
          dateTo={dateTo}
          serviceId={serviceId}
          status={status}
          clientId={clientId}
          professionalId={professionalId}
          clientDisplayValue={clientDisplayValue}
          professionalDisplayValue={professionalDisplayValue}
          servicesList={servicesList}
          hasFilters={hasFilters}
          onTimeRangeChange={setTimeRange}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onServiceIdChange={setServiceId}
          onStatusChange={setStatus}
          onClientInput={handleClientInput}
          onClientSelect={selectClient}
          onClientClear={() => { setClientId(''); setClientDisplayValue('') }}
          onProfessionalInput={v => { setProfessionalDisplayValue(v); if (professionalId) setProfessionalId('') }}
          onProfessionalSelect={(id, name) => { setProfessionalId(id); setProfessionalDisplayValue(name) }}
          onProfessionalClear={() => { setProfessionalId(''); setProfessionalDisplayValue('') }}
          onClearFilters={clearFilters}
        />

        {viewMode === 'calendar' ? (
          <CalendarView filters={{ serviceId, status, clientId, professionalId }} />
        ) : (
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
                          <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em] whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((appt: Appointment) => (
                        <tr key={appt.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                          <td className="px-4 py-3.5">
                            <DateTimeCell iso={appt.startsAt} />
                          </td>
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
                          <td className="px-4 py-3.5 whitespace-nowrap text-gray-500">
                            {appt.serviceName}
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge
                              label={STATUS_LABELS[appt.status]}
                              variant={STATUS_VARIANTS[appt.status]}
                            />
                          </td>
                          <td className="px-4 py-3.5">
                            <DateTimeCell iso={appt.createdAt} />
                          </td>
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
                  <p className="text-[13px] text-gray-500 m-0">
                    Página {page} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-md text-[13px] font-medium cursor-pointer hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      onClick={() => setPage(p => p - 1)}
                      disabled={page <= 1}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="15 18 9 12 15 6"/>
                      </svg>
                      Anterior
                    </button>
                    <button
                      className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-md text-[13px] font-medium cursor-pointer hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= totalPages}
                    >
                      Próxima
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <CancelAppointmentModal
        appointmentId={cancelId}
        onClose={() => setCancelId(null)}
      />
    </>
  )
}
```

---

## Task 10: Frontend — Wire CancelAppointmentModal into AppointmentPopover

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentPopover.tsx`

- [ ] **Step 1: Replace direct cancel mutation with modal state**

Replace the entire file `packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentPopover.tsx` with:

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Appointment } from '@/types'
import { useFormatTime } from '@/hooks/useFormatTime'
import { clientColor } from '@/lib/calendarColors'
import { useCompleteAppointment, useConfirmAppointment } from '@/hooks/useAppointments'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { StatusVariant } from '@/components/ui/StatusBadge'
import { useTenantSettingsContext } from '@/providers/TenantSettingsProvider'
import { CancelAppointmentModal } from './CancelAppointmentModal'

const POPOVER_WIDTH = 300
const POPOVER_HEIGHT = 270

const STATUS_LABELS: Record<Appointment['status'], string> = {
  pending: 'Aguardando confirmação', confirmed: 'Confirmado', cancelled: 'Cancelado', completed: 'Pago',
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
  const [cancelOpen, setCancelOpen] = useState(false)

  const confirmMut  = useConfirmAppointment()
  const completeMut = useCompleteAppointment()
  const { allowPaidStatus } = useTenantSettingsContext()
  const { formatISOTime } = useFormatTime()

  const { top, left } = useMemo(() => {
    let l = blockRect.right + 8
    if (l + POPOVER_WIDTH > window.innerWidth - 16) l = blockRect.left - POPOVER_WIDTH - 8
    let t = blockRect.top
    if (t + POPOVER_HEIGHT > window.innerHeight - 16) t = window.innerHeight - POPOVER_HEIGHT - 16
    return { top: Math.max(8, t), left: Math.max(8, l) }
  }, [blockRect])

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

  function handleStatusChange(action: 'confirm' | 'complete') {
    setStatusOpen(false)
    if (action === 'confirm')  confirmMut.mutate(appointment.id,  { onSuccess: onClose })
    if (action === 'complete') completeMut.mutate(appointment.id, { onSuccess: onClose })
  }

  const { status } = appointment

  const popover = (
    <div
      ref={ref}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-visible w-[300px]"
      style={{ top, left }}
    >
      {/* Action bar */}
      <div className="flex items-center justify-end gap-1 px-3 py-2.5 bg-gray-50 border-b border-gray-200 rounded-t-xl">
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
              {allowPaidStatus && status !== 'completed' && status !== 'cancelled' && (
                <button className="w-full text-left px-3 py-2 text-[12.5px] text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer border-none bg-transparent border-b border-gray-100" onClick={() => handleStatusChange('complete')}>
                  <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />Marcar como Pago
                </button>
              )}
              {status !== 'cancelled' && (
                <button
                  className="w-full text-left px-3 py-2 text-[12.5px] text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer border-none bg-transparent"
                  onClick={() => { setStatusOpen(false); setCancelOpen(true) }}
                >
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
          {appointment.clientAvatarUrl ? (
            <img src={appointment.clientAvatarUrl} alt={appointment.clientName} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
          ) : (
            <span className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold" style={{ background: color }}>
              {appointment.clientName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="text-[15px] font-bold text-gray-900 leading-tight">{appointment.clientName}</span>
        </div>
        <div className="pl-[38px] space-y-1.5">
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
            {appointment.professionalAvatarUrl ? (
              <img src={appointment.professionalAvatarUrl} alt={appointment.professionalName} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
            ) : (
              <span className="w-4 h-4 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-500 text-[8px] font-bold">
                {appointment.professionalName.charAt(0).toUpperCase()}
              </span>
            )}
            <span>{appointment.professionalName}</span>
          </div>
          <div className="pt-0.5">
            <StatusBadge label={STATUS_LABELS[status]} variant={STATUS_VARIANTS[status]} />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {createPortal(popover, document.body)}
      <CancelAppointmentModal
        appointmentId={cancelOpen ? appointment.id : null}
        onClose={() => setCancelOpen(false)}
        onSuccess={onClose}
      />
    </>
  )
}
```

---

## Task 11: Final commit

- [ ] **Step 1: Verify TypeScript compiles without errors**

```bash
cd packages/web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Commit all frontend changes**

```bash
git add packages/web/src/hooks/useTenantSettings.ts \
        packages/web/src/providers/TenantSettingsProvider.tsx \
        packages/web/src/app/\(tenant\)/\(app\)/settings/_components/TenantGeneralForm.tsx \
        packages/web/src/hooks/useAppointments.ts \
        packages/web/src/app/\(tenant\)/\(app\)/appointments/_components/CancelAppointmentModal.tsx \
        packages/web/src/app/\(tenant\)/\(app\)/appointments/page.tsx \
        packages/web/src/app/\(tenant\)/\(app\)/appointments/_components/AppointmentPopover.tsx
git commit -m "feat(web): add cancellation reason modal with optional/required setting"
```

- [ ] **Step 3: Rebuild and test the web container**

```bash
docker compose build web && docker compose up -d web
```

Then open the app and verify:
1. Settings → Gerais → Comportamento → "Motivo de cancelamento" shows 3 pill buttons (Não · Sim · Obrigatório)
2. With **Não**: clicking "Cancelar" on a list or calendar appointment shows the simple confirmation modal (no textarea)
3. With **Sim**: modal shows textarea, can submit empty or with text
4. With **Obrigatório**: modal shows textarea, "Sim, cancelar" stays disabled until 3+ chars typed; error hint appears when 1-2 chars entered
