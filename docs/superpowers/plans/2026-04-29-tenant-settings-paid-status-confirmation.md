# Tenant Settings: Paid Status & Confirmation Mode

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two tenant settings — "Habilitar status pago" and "Exigir confirmação de agendamentos" — with backend enforcement and full frontend integration including label renames and conditional UI.

**Architecture:** A new `allow_paid_status` boolean is added to the `tenants` table; the existing `confirmation_mode` enum is finally wired to the settings UI. Both fields flow through `/tenants/me` → `TenantSettingsProvider` context → consuming components. The `pending` status label is renamed to "Aguardando confirmação" everywhere. When paid status is disabled, the backend rejects `PATCH /:id/complete`. When confirmation mode is `manual`, clients always get `pending` on creation; admin/prof get a status picker in the wizard.

**Tech Stack:** NestJS, Drizzle ORM (PostgreSQL), Next.js 16 App Router, TanStack Query, Tailwind CSS, TypeScript, class-validator.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `packages/shared/src/schema/tenants.schema.ts` | Modify | Add `allowPaidStatus` boolean column |
| `packages/api/src/tenants/dto/update-tenant.dto.ts` | Modify | Add `confirmationMode` and `allowPaidStatus` fields |
| `packages/api/src/tenants/tenants.service.ts` | Modify | `findCurrent` + `update` include new fields |
| `packages/api/src/appointments/dto/create-appointment.dto.ts` | Modify | Add optional `initialStatus` field |
| `packages/api/src/appointments/appointments.service.ts` | Modify | Guard `complete` with `allowPaidStatus`; use `initialStatus` on create |
| `packages/web/src/hooks/useTenantSettings.ts` | Modify | Extend `TenantSettings` type + mutation body |
| `packages/web/src/providers/TenantSettingsProvider.tsx` | Modify | Expose `allowPaidStatus` + `confirmationMode` in context |
| `packages/web/src/app/(tenant)/(app)/settings/_components/TenantGeneralForm.tsx` | Modify | Add "Comportamento" section with two immediate-save toggles |
| `packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentPopover.tsx` | Modify | Rename `pending` label; hide "Marcar como Pago" when `allowPaidStatus` is false |
| `packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentFilters.tsx` | Modify | Rename `pending` label; hide "Pago" option when `allowPaidStatus` is false |
| `packages/web/src/app/(tenant)/(app)/appointments/page.tsx` | Modify | Rename `pending` label in `STATUS_LABELS` |
| `packages/web/src/app/(tenant)/(app)/appointments/create/page.tsx` | Modify | Add status picker for admin/prof when `confirmationMode === 'manual'` |
| `packages/web/src/hooks/useAppointments.ts` | Modify | `useCreateAppointment` accepts `initialStatus` |

---

## Task 1: Add `allowPaidStatus` to tenants schema

**Files:**
- Modify: `packages/shared/src/schema/tenants.schema.ts`

- [ ] **Step 1: Update schema**

Replace the current `tenants.schema.ts` with:

```ts
import { boolean, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const confirmationModeEnum = pgEnum('confirmation_mode', ['auto', 'manual']);

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  confirmationMode: confirmationModeEnum('confirmation_mode').notNull().default('auto'),
  allowPaidStatus: boolean('allow_paid_status').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
```

- [ ] **Step 2: Generate and apply migration**

Run from the monorepo root:
```bash
pnpm db:generate
pnpm db:migrate
```

Expected: a new SQL migration file appears under `packages/api/drizzle/` with `ALTER TABLE tenants ADD COLUMN allow_paid_status boolean NOT NULL DEFAULT true`.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/schema/tenants.schema.ts packages/api/drizzle/
git commit -m "feat(db): add allow_paid_status column to tenants"
```

---

## Task 2: Expose new fields in the Tenants API

**Files:**
- Modify: `packages/api/src/tenants/dto/update-tenant.dto.ts`
- Modify: `packages/api/src/tenants/tenants.service.ts`

- [ ] **Step 1: Update UpdateTenantDto**

Replace `packages/api/src/tenants/dto/update-tenant.dto.ts`:

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
}
```

- [ ] **Step 2: Update TenantsService**

Replace `packages/api/src/tenants/tenants.service.ts`:

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
        id:               tenants.id,
        name:             tenants.name,
        slug:             tenants.slug,
        logoUrl:          tenants.logoUrl,
        confirmationMode: tenants.confirmationMode,
        allowPaidStatus:  tenants.allowPaidStatus,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId));

    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(tenantId: string, dto: UpdateTenantDto) {
    const patch: Partial<typeof tenants.$inferInsert> = {};
    if (dto.name             !== undefined) patch.name             = dto.name;
    if (dto.logoUrl          !== undefined) patch.logoUrl          = dto.logoUrl;
    if (dto.confirmationMode !== undefined) patch.confirmationMode = dto.confirmationMode;
    if (dto.allowPaidStatus  !== undefined) patch.allowPaidStatus  = dto.allowPaidStatus;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('No updatable fields provided');
    }

    const [updated] = await this.db
      .update(tenants)
      .set(patch)
      .where(eq(tenants.id, tenantId))
      .returning({
        id:               tenants.id,
        name:             tenants.name,
        slug:             tenants.slug,
        logoUrl:          tenants.logoUrl,
        confirmationMode: tenants.confirmationMode,
        allowPaidStatus:  tenants.allowPaidStatus,
      });

    if (!updated) throw new NotFoundException('Tenant not found');
    return updated;
  }
}
```

- [ ] **Step 3: Run API tests to verify no regression**

```bash
pnpm test:api
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/tenants/
git commit -m "feat(api): expose confirmationMode and allowPaidStatus in tenants endpoints"
```

---

## Task 3: Guard the `complete` endpoint and wire `initialStatus` on create

**Files:**
- Modify: `packages/api/src/appointments/dto/create-appointment.dto.ts`
- Modify: `packages/api/src/appointments/appointments.service.ts`

- [ ] **Step 1: Update CreateAppointmentDto**

Replace `packages/api/src/appointments/dto/create-appointment.dto.ts`:

```ts
import { IsIn, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  professionalId: string;

  @IsUUID()
  serviceId: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string; // "YYYY-MM-DD"

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime: string; // "HH:MM"

  @IsOptional()
  @IsUUID()
  clientId?: string; // admin/professional can specify the client

  @IsOptional()
  @IsIn(['pending', 'confirmed'])
  initialStatus?: 'pending' | 'confirmed'; // admin/professional override in manual mode
}
```

- [ ] **Step 2: Update AppointmentsService — protect `complete` and use `initialStatus`**

Replace `packages/api/src/appointments/appointments.service.ts`:

```ts
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, count, desc, gte, lte } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { appointments, services, tenants, professionals, users } from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';
import { AvailabilityService } from '../availability/availability.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async create(dto: CreateAppointmentDto, userId: string, userRole: string, tenantId: string) {
    const clientId =
      dto.clientId && (userRole === 'tenant_admin' || userRole === 'professional')
        ? dto.clientId
        : userId;
    const availableSlots = await this.availabilityService.getAvailableSlots(
      dto.professionalId, dto.date, tenantId,
    );
    if (!availableSlots.includes(dto.startTime)) {
      throw new BadRequestException('Selected slot is not available');
    }

    return withTenant(this.db, tenantId, async (tx) => {
      const [svc] = await tx
        .select({ durationMinutes: services.durationMinutes })
        .from(services)
        .where(and(eq(services.id, dto.serviceId), eq(services.tenantId, tenantId)));
      if (!svc) throw new NotFoundException('Service not found');

      const [tenant] = await tx
        .select({ confirmationMode: tenants.confirmationMode })
        .from(tenants)
        .where(eq(tenants.id, tenantId));
      if (!tenant) throw new NotFoundException('Tenant not found');

      const startsAt = new Date(`${dto.date}T${dto.startTime}:00Z`);
      const endsAt = new Date(startsAt.getTime() + svc.durationMinutes * 60000);

      let status: 'pending' | 'confirmed';
      if (tenant.confirmationMode === 'auto') {
        status = 'confirmed';
      } else {
        // manual mode: clients always start pending; admin/prof may choose
        const isPrivileged = userRole === 'tenant_admin' || userRole === 'professional';
        status = isPrivileged && dto.initialStatus ? dto.initialStatus : 'pending';
      }

      const [appointment] = await tx.insert(appointments).values({
        tenantId,
        professionalId: dto.professionalId,
        serviceId: dto.serviceId,
        clientId,
        startsAt,
        endsAt,
        status,
      }).returning();

      return appointment;
    });
  }

  async findAll(
    tenantId: string,
    userId: string,
    role: string,
    page: number,
    limit: number,
    filters: {
      dateFrom?: string;
      dateTo?: string;
      serviceId?: string;
      status?: string;
      clientId?: string;
      professionalId?: string;
    } = {},
  ) {
    const offset = (page - 1) * limit;

    const profUsers = alias(users, 'prof_users');

    return withTenant(this.db, tenantId, async (tx) => {
      const FIELDS = {
        id:                    appointments.id,
        startsAt:              appointments.startsAt,
        endsAt:                appointments.endsAt,
        status:                appointments.status,
        createdAt:             appointments.createdAt,
        professionalId:        appointments.professionalId,
        serviceId:             appointments.serviceId,
        clientId:              appointments.clientId,
        clientName:            users.name,
        clientAvatarUrl:       users.avatarUrl,
        serviceName:           services.name,
        professionalName:      profUsers.name,
        professionalAvatarUrl: profUsers.avatarUrl,
      };

      let roleWhere;
      if (role === 'client') {
        roleWhere = and(eq(appointments.tenantId, tenantId), eq(appointments.clientId, userId));
      } else if (role === 'professional') {
        const [prof] = await tx
          .select({ id: professionals.id })
          .from(professionals)
          .where(and(eq(professionals.userId, userId), eq(professionals.tenantId, tenantId)));
        if (!prof) return { data: [], total: 0, page, limit };
        roleWhere = and(eq(appointments.tenantId, tenantId), eq(appointments.professionalId, prof.id));
      } else {
        roleWhere = eq(appointments.tenantId, tenantId);
      }

      const where = and(
        roleWhere,
        filters.dateFrom ? gte(appointments.startsAt, new Date(filters.dateFrom + 'T00:00:00.000Z')) : undefined,
        filters.dateTo   ? lte(appointments.startsAt, new Date(filters.dateTo   + 'T23:59:59.999Z')) : undefined,
        filters.serviceId ? eq(appointments.serviceId, filters.serviceId) : undefined,
        filters.status         ? eq(appointments.status, filters.status as any)               : undefined,
        filters.clientId       ? eq(appointments.clientId, filters.clientId)                  : undefined,
        filters.professionalId ? eq(appointments.professionalId, filters.professionalId)      : undefined,
      );

      const [{ total }] = await tx
        .select({ total: count() })
        .from(appointments)
        .where(where);

      const data = await tx
        .select(FIELDS)
        .from(appointments)
        .innerJoin(users, eq(appointments.clientId, users.id))
        .innerJoin(services, eq(appointments.serviceId, services.id))
        .innerJoin(professionals, eq(appointments.professionalId, professionals.id))
        .innerJoin(profUsers, eq(professionals.userId, profUsers.id))
        .where(where)
        .orderBy(desc(appointments.createdAt))
        .limit(limit)
        .offset(offset);

      return { data, total, page, limit };
    });
  }

  async updateStatus(id: string, status: 'confirmed' | 'cancelled' | 'completed', tenantId: string) {
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

      const [updated] = await tx
        .update(appointments)
        .set({ status })
        .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
        .returning();
      return updated;
    });
  }

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
}
```

- [ ] **Step 3: Run API tests**

```bash
pnpm test:api
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/appointments/
git commit -m "feat(api): guard complete endpoint with allowPaidStatus; support initialStatus on create"
```

---

## Task 4: Update frontend TenantSettings type and hook

**Files:**
- Modify: `packages/web/src/hooks/useTenantSettings.ts`

- [ ] **Step 1: Extend TenantSettings type and mutation body**

Replace `packages/web/src/hooks/useTenantSettings.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'

export type TenantSettings = {
  id:               string
  name:             string
  slug:             string
  logoUrl:          string | null
  confirmationMode: 'auto' | 'manual'
  allowPaidStatus:  boolean
}

export function useTenantSettings() {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<TenantSettings>({
    queryKey: ['tenant-settings', slug],
    queryFn:  async () => (await api('/tenants/me')).json(),
  })
}

export function useUpdateTenantSettings() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (body: {
      name?:             string
      logoUrl?:          string | null
      confirmationMode?: 'auto' | 'manual'
      allowPaidStatus?:  boolean
    }) =>
      api('/tenants/me', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['tenant-settings', slug] }),
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/hooks/useTenantSettings.ts
git commit -m "feat(web): extend TenantSettings type with confirmationMode and allowPaidStatus"
```

---

## Task 5: Update TenantSettingsProvider to expose new settings

**Files:**
- Modify: `packages/web/src/providers/TenantSettingsProvider.tsx`

- [ ] **Step 1: Extend context value**

Replace `packages/web/src/providers/TenantSettingsProvider.tsx`:

```tsx
'use client'

import { createContext, useContext, useEffect } from 'react'
import { useTenantSettings } from '@/hooks/useTenantSettings'

type TenantSettingsContextValue = {
  tenantName:       string
  tenantLogoUrl:    string | null
  confirmationMode: 'auto' | 'manual'
  allowPaidStatus:  boolean
}

const TenantSettingsContext = createContext<TenantSettingsContextValue>({
  tenantName:       '',
  tenantLogoUrl:    null,
  confirmationMode: 'auto',
  allowPaidStatus:  true,
})

export function TenantSettingsProvider({ children }: { children: React.ReactNode }) {
  const { data } = useTenantSettings()

  const tenantName       = data?.name             ?? ''
  const tenantLogoUrl    = data?.logoUrl           ?? null
  const confirmationMode = data?.confirmationMode  ?? 'auto'
  const allowPaidStatus  = data?.allowPaidStatus   ?? true

  useEffect(() => {
    if (!tenantName) return
    const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Scheduler'
    document.title = `${tenantName} | ${appName}`
  }, [tenantName])

  return (
    <TenantSettingsContext.Provider value={{ tenantName, tenantLogoUrl, confirmationMode, allowPaidStatus }}>
      {children}
    </TenantSettingsContext.Provider>
  )
}

export function useTenantSettingsContext() {
  return useContext(TenantSettingsContext)
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/providers/TenantSettingsProvider.tsx
git commit -m "feat(web): expose confirmationMode and allowPaidStatus via TenantSettingsProvider"
```

---

## Task 6: Add behaviour toggles to TenantGeneralForm

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/settings/_components/TenantGeneralForm.tsx`

- [ ] **Step 1: Add the Comportamento section with immediate-save toggles**

Replace the entire `TenantGeneralForm.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { LogoCropField } from '@/components/ui/LogoCropField'
import { useTenantSettings, useUpdateTenantSettings } from '@/hooks/useTenantSettings'
import { cn } from '@/lib/utils'

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

  const [allowPaidStatus,  setAllowPaidStatus]  = useState(true)
  const [requiresConfirm,  setRequiresConfirm]  = useState(false)
  const [toggleSaving,     setToggleSaving]     = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    setName(data.name)
    setLogoUrl(data.logoUrl)
    setAllowPaidStatus(data.allowPaidStatus)
    setRequiresConfirm(data.confirmationMode === 'manual')
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

- [ ] **Step 2: Commit**

```bash
git add "packages/web/src/app/(tenant)/(app)/settings/_components/TenantGeneralForm.tsx"
git commit -m "feat(web): add paid status and confirmation mode toggles to general settings"
```

---

## Task 7: Rename `pending` label and conditionally hide paid status in AppointmentPopover

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentPopover.tsx`

- [ ] **Step 1: Update STATUS_LABELS and conditionally hide paid option**

At the top of `AppointmentPopover.tsx`, change the import block and `STATUS_LABELS`:

```tsx
import { useTenantSettingsContext } from '@/providers/TenantSettingsProvider'
```

Add this import after the existing imports.

Then change the `STATUS_LABELS` constant (line 15-17):

```tsx
const STATUS_LABELS: Record<Appointment['status'], string> = {
  pending: 'Aguardando confirmação', confirmed: 'Confirmado', cancelled: 'Cancelado', completed: 'Pago',
}
```

Inside `AppointmentPopover` function body, add after the existing hooks:

```tsx
const { allowPaidStatus } = useTenantSettingsContext()
```

Then in the status dropdown (the `{statusOpen && ...}` block), change the "complete" button condition from:

```tsx
{status !== 'completed' && status !== 'cancelled' && (
```

to:

```tsx
{allowPaidStatus && status !== 'completed' && status !== 'cancelled' && (
```

Full updated file `packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentPopover.tsx`:

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Appointment } from '@/types'
import { formatISOTime } from '@/lib/calendarUtils'
import { clientColor } from '@/lib/calendarColors'
import { useCancelAppointment, useCompleteAppointment, useConfirmAppointment, useDeleteAppointment } from '@/hooks/useAppointments'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { StatusVariant } from '@/components/ui/StatusBadge'
import { useTenantSettingsContext } from '@/providers/TenantSettingsProvider'

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
  const [confirmDelete, setConfirmDelete] = useState(false)

  const confirmMut  = useConfirmAppointment()
  const cancelMut   = useCancelAppointment()
  const completeMut = useCompleteAppointment()
  const deleteMut   = useDeleteAppointment()
  const { allowPaidStatus } = useTenantSettingsContext()

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
              {allowPaidStatus && status !== 'completed' && status !== 'cancelled' && (
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
git add "packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentPopover.tsx"
git commit -m "feat(web): rename pending label; hide paid status action when disabled"
```

---

## Task 8: Rename `pending` label and hide "Pago" filter in AppointmentFilters

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentFilters.tsx`

- [ ] **Step 1: Add context import and conditional "Pago" option**

Add `import { useTenantSettingsContext } from '@/providers/TenantSettingsProvider'` to the imports in `AppointmentFilters.tsx`.

`allowPaidStatus` is read from context inside the component — the `Props` type stays unchanged:

```tsx
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
```

Inside the `AppointmentFilters` function, destructure `allowPaidStatus` from context:

```tsx
const { allowPaidStatus } = useTenantSettingsContext()
```

Change the Status select block to:

```tsx
{/* Status */}
<div className="min-w-[140px] flex-[1_1_140px]">
  <label className={labelClass}>Status</label>
  <div className="relative">
    <select className={selectClass} value={status} onChange={e => onStatusChange(e.target.value)}>
      <option value="">Todos</option>
      <option value="pending">Aguardando confirmação</option>
      <option value="confirmed">Confirmado</option>
      <option value="cancelled">Cancelado</option>
      {allowPaidStatus && <option value="completed">Pago</option>}
    </select>
    <ChevronDown />
  </div>
</div>
```

Full updated `AppointmentFilters.tsx`:

```tsx
'use client'

import { DatePickerField } from '@/components/ui/DatePickerField'
import { ClientSearchField } from '@/components/ui/ClientSearchField'
import { ProfessionalSearchField } from '@/components/ui/ProfessionalSearchField'
import { useTenantSettingsContext } from '@/providers/TenantSettingsProvider'
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
  const { allowPaidStatus } = useTenantSettingsContext()

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
              <option value="pending">Aguardando confirmação</option>
              <option value="confirmed">Confirmado</option>
              <option value="cancelled">Cancelado</option>
              {allowPaidStatus && <option value="completed">Pago</option>}
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
git add "packages/web/src/app/(tenant)/(app)/appointments/_components/AppointmentFilters.tsx"
git commit -m "feat(web): rename pending label in filters; hide Pago option when disabled"
```

---

## Task 9: Rename `pending` label in appointments list page

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/page.tsx`

- [ ] **Step 1: Update STATUS_LABELS constant**

In `appointments/page.tsx`, find the `STATUS_LABELS` constant at the top (around line 16) and change:

```tsx
const STATUS_LABELS: Record<Appointment['status'], string> = {
  pending:   'Aguardando confirmação',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Pago',
}
```

- [ ] **Step 2: Commit**

```bash
git add "packages/web/src/app/(tenant)/(app)/appointments/page.tsx"
git commit -m "feat(web): rename pending label to Aguardando confirmação in appointments list"
```

---

## Task 10: Add `initialStatus` to `useCreateAppointment` and add status picker in creation wizard

**Files:**
- Modify: `packages/web/src/hooks/useAppointments.ts`
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/create/page.tsx`

- [ ] **Step 1: Update `useCreateAppointment` to accept `initialStatus`**

In `packages/web/src/hooks/useAppointments.ts`, change the `useCreateAppointment` mutation body type:

```ts
export function useCreateAppointment() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (body: {
      professionalId: string
      serviceId: string
      date: string
      startTime: string
      clientId?: string
      initialStatus?: 'pending' | 'confirmed'
    }) =>
      api('/appointments', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments', slug] }),
  })
}
```

- [ ] **Step 2: Add status picker in the creation wizard**

In `packages/web/src/app/(tenant)/(app)/appointments/create/page.tsx`, make the following changes:

**a)** Add import for `useTenantSettingsContext`:

```tsx
import { useTenantSettingsContext } from '@/providers/TenantSettingsProvider'
```

**b)** Inside `CreateAppointmentPage`, add state and context:

```tsx
const { confirmationMode } = useTenantSettingsContext()
const showStatusPicker = isAdminOrProfessional && confirmationMode === 'manual'
const [initialStatus, setInitialStatus] = useState<'pending' | 'confirmed'>('pending')
```

**c)** Update `handleSubmit` to pass `initialStatus` when `showStatusPicker` is true:

```tsx
async function handleSubmit() {
  if (!professionalId || !serviceId || !date || !startTime) return
  const body: Parameters<typeof create.mutateAsync>[0] = { professionalId, serviceId, date, startTime }
  if (isAdminOrProfessional && clientId) body.clientId = clientId
  if (showStatusPicker) body.initialStatus = initialStatus
  await create.mutateAsync(body)
  router.push('/appointments')
}
```

**d)** In the confirmation step section (Step 5/4), add the status picker before the submit button. Find the section with `{step === confirmStep && (` and add this block just before the error message and submit button:

```tsx
{showStatusPicker && (
  <div className="mb-5">
    <label className="block text-xs font-semibold text-gray-500 mb-2.5 uppercase tracking-[0.06em]">
      Status inicial
    </label>
    <div className="flex gap-2">
      {(['pending', 'confirmed'] as const).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setInitialStatus(s)}
          className={cn(
            'px-3.5 py-2.5 border-[1.5px] rounded-lg cursor-pointer text-[13px] font-semibold transition-[border-color,background,color]',
            initialStatus === s
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-700',
          )}
        >
          {s === 'pending' ? 'Aguardando confirmação' : 'Confirmado'}
        </button>
      ))}
    </div>
  </div>
)}
```

Full updated relevant section of `CreateAppointmentPage` (the imports + top of the function, and the confirm step):

Add at the top with other imports:
```tsx
import { useTenantSettingsContext } from '@/providers/TenantSettingsProvider'
```

Add inside `CreateAppointmentPage` after `const isAdminOrProfessional = ...`:
```tsx
const { confirmationMode } = useTenantSettingsContext()
const showStatusPicker = isAdminOrProfessional && confirmationMode === 'manual'
const [initialStatus, setInitialStatus] = useState<'pending' | 'confirmed'>('pending')
```

Updated `handleSubmit`:
```tsx
async function handleSubmit() {
  if (!professionalId || !serviceId || !date || !startTime) return
  const body: Parameters<typeof create.mutateAsync>[0] = { professionalId, serviceId, date, startTime }
  if (isAdminOrProfessional && clientId) body.clientId = clientId
  if (showStatusPicker) body.initialStatus = initialStatus
  await create.mutateAsync(body)
  router.push('/appointments')
}
```

The confirm step JSX block (inside `{step === confirmStep && (`) becomes:

```tsx
{step === confirmStep && (
  <div>
    <div className="bg-gray-50 rounded-lg px-4 py-3.5 mb-5 flex flex-col gap-2">
      {[
        ...(isAdminOrProfessional ? [{ label: 'Cliente', value: clientName }] : []),
        { label: 'Serviço',      value: `${selectedService?.name} · ${selectedService?.durationMinutes} min` },
        { label: 'Profissional', value: selectedProf?.name },
        { label: 'Data',         value: new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) },
        { label: 'Horário',      value: startTime },
      ].map(({ label, value }) => (
        <div key={label} className="flex justify-between text-[13.5px]">
          <span className="text-gray-500">{label}</span>
          <span className="font-semibold text-gray-900">{value}</span>
        </div>
      ))}
    </div>

    {showStatusPicker && (
      <div className="mb-5">
        <label className="block text-xs font-semibold text-gray-500 mb-2.5 uppercase tracking-[0.06em]">
          Status inicial
        </label>
        <div className="flex gap-2">
          {(['pending', 'confirmed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setInitialStatus(s)}
              className={cn(
                'px-3.5 py-2.5 border-[1.5px] rounded-lg cursor-pointer text-[13px] font-semibold transition-[border-color,background,color]',
                initialStatus === s
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-700',
              )}
            >
              {s === 'pending' ? 'Aguardando confirmação' : 'Confirmado'}
            </button>
          ))}
        </div>
      </div>
    )}

    {create.isError && (
      <p className="text-[13px] text-red-600 mb-3.5">
        Horário indisponível. Escolha outro horário.
      </p>
    )}

    <button
      onClick={handleSubmit}
      disabled={create.isPending}
      className="w-full h-11 bg-indigo-500 text-white border-0 rounded-lg text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 transition-[background,transform] hover:enabled:bg-indigo-600 hover:enabled:-translate-y-px active:enabled:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {create.isPending ? (
        <>
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          Confirmando...
        </>
      ) : 'Confirmar agendamento'}
    </button>
  </div>
)}
```

- [ ] **Step 3: Run API tests to check nothing broke**

```bash
pnpm test:api
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/hooks/useAppointments.ts "packages/web/src/app/(tenant)/(app)/appointments/create/page.tsx"
git commit -m "feat(web): add status picker for admin/prof when confirmation mode is manual"
```

---

## Task 11: Verify end-to-end in running app

- [ ] **Step 1: Rebuild and start the app**

```bash
docker compose build web && docker compose up -d web
```

- [ ] **Step 2: Verify settings page**

Navigate to `/:slug/settings/general`. Confirm:
- The "Comportamento" section appears below "Informações"
- Both toggles are rendered and interactive
- Toggling "Habilitar status Pago" OFF: open an appointment popover — "Marcar como Pago" is gone; the "Pago" option is missing from the status filter dropdown
- Toggling "Exigir confirmação de agendamentos" ON: go to create an appointment as admin/prof — the status picker ("Aguardando confirmação" / "Confirmado") appears in the confirmation step

- [ ] **Step 3: Verify label rename**

In the appointments list/calendar, check that any `pending` appointment shows "Aguardando confirmação" (not "Agendado") in the badge.

- [ ] **Step 4: Final commit (if any cleanup needed)**

```bash
git add -p
git commit -m "chore: cleanup after tenant settings feature"
```
