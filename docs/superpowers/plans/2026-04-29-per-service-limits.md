# Per-Service Appointment Limits — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-service appointment limit mode to client profiles, enforce it on appointment creation, and show a UX warning in the booking wizard before the user tries to confirm.

**Architecture:** A new `client_service_limits` table stores (clientProfileId, serviceId, limitCount, limitPeriod) tuples, used when the client is in "Per Serviço" mode. The existing `serviceLimitCount`/`serviceLimitPeriod` columns remain for "Normal" mode. The appointments service checks the applicable limit before inserting, and a new `GET /appointments/limit-check` endpoint lets the frontend show the warning early.

**Tech Stack:** Drizzle ORM, NestJS (class-validator, class-transformer), Next.js 16 App Router, TanStack Query.

---

## File Map

| Action | File |
|--------|------|
| Create | `packages/shared/src/schema/client-service-limits.schema.ts` |
| Modify | `packages/shared/src/schema/index.ts` |
| Run    | `pnpm db:generate` + `pnpm db:migrate` (generates SQL migration) |
| Modify | `packages/api/src/clients/dto/create-client.dto.ts` |
| Modify | `packages/api/src/clients/dto/update-client.dto.ts` |
| Modify | `packages/api/src/clients/clients.service.ts` |
| Modify | `packages/api/src/appointments/appointments.service.ts` |
| Modify | `packages/api/src/appointments/appointments.controller.ts` |
| Modify | `packages/web/src/types/index.ts` |
| Modify | `packages/web/src/hooks/useClients.ts` |
| Create | `packages/web/src/hooks/useLimitCheck.ts` |
| Modify | `packages/web/src/app/(tenant)/(app)/clients/_components/ClientForm.tsx` |
| Modify | `packages/web/src/app/(tenant)/(app)/appointments/create/page.tsx` |

---

## Task 1: New shared schema for `client_service_limits`

**Files:**
- Create: `packages/shared/src/schema/client-service-limits.schema.ts`
- Modify: `packages/shared/src/schema/index.ts`

- [ ] **Step 1: Create the schema file**

```typescript
// packages/shared/src/schema/client-service-limits.schema.ts
import { integer, pgTable, unique, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';
import { clientProfiles, serviceLimitPeriodEnum } from './client-profiles.schema';
import { services } from './services.schema';

export const clientServiceLimits = pgTable('client_service_limits', {
  id:              uuid('id').primaryKey().defaultRandom(),
  tenantId:        uuid('tenant_id').notNull().references(() => tenants.id,         { onDelete: 'cascade' }),
  clientProfileId: uuid('client_profile_id').notNull().references(() => clientProfiles.id, { onDelete: 'cascade' }),
  serviceId:       uuid('service_id').notNull().references(() => services.id,       { onDelete: 'cascade' }),
  limitCount:      integer('limit_count').notNull(),
  limitPeriod:     serviceLimitPeriodEnum('limit_period').notNull(),
}, (t) => ({
  uniq: unique().on(t.clientProfileId, t.serviceId),
}));

export type ClientServiceLimit  = typeof clientServiceLimits.$inferSelect;
export type NewClientServiceLimit = typeof clientServiceLimits.$inferInsert;
```

- [ ] **Step 2: Export the new schema from the shared index**

Open `packages/shared/src/schema/index.ts` and add the export after `client-services.schema`:

```typescript
export * from './tenants.schema';
export * from './users.schema';
export * from './professionals.schema';
export * from './services.schema';
export * from './weekly-availability.schema';
export * from './schedule-exceptions.schema';
export * from './appointments.schema';
export * from './client-profiles.schema';
export * from './client-professionals.schema';
export * from './client-services.schema';
export * from './client-service-limits.schema';   // ← add this line
export * from './refresh-tokens.schema';
```

- [ ] **Step 3: Generate and apply the migration**

Run from the repo root (requires the DB to be up):

```bash
pnpm db:generate
pnpm db:migrate
```

Expected: a new migration file is created and applied. The output should mention `client_service_limits`.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/schema/client-service-limits.schema.ts packages/shared/src/schema/index.ts
git add packages/shared/src/drizzle/  # migration files location
git commit -m "feat(shared): add client_service_limits schema and migration"
```

---

## Task 2: Update API DTOs

**Files:**
- Modify: `packages/api/src/clients/dto/create-client.dto.ts`
- Modify: `packages/api/src/clients/dto/update-client.dto.ts`

- [ ] **Step 1: Replace `create-client.dto.ts`**

```typescript
// packages/api/src/clients/dto/create-client.dto.ts
import {
  IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID,
  Matches, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ServiceLimitItemDto {
  @IsUUID() serviceId: string;
  @IsInt() @Min(1) limitCount: number;
  @IsIn(['day', 'week', 'month']) limitPeriod: 'day' | 'week' | 'month';
}

export class CreateClientDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;

  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) birthDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() @MaxLength(200_000) avatarUrl?: string;

  @IsOptional() @IsInt() @Min(1) serviceLimitCount?: number;
  @IsOptional() @IsIn(['day', 'week', 'month']) serviceLimitPeriod?: 'day' | 'week' | 'month';

  @IsOptional() @IsBoolean() allProfessionals?: boolean;
  @IsOptional() @IsBoolean() allServices?: boolean;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) professionalIds?: string[];
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) serviceIds?: string[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ServiceLimitItemDto)
  serviceLimits?: ServiceLimitItemDto[];

  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() @IsIn(['12h', '24h']) timeFormat?: string;
}
```

- [ ] **Step 2: Replace `update-client.dto.ts`**

```typescript
// packages/api/src/clients/dto/update-client.dto.ts
import {
  IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID,
  Matches, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ServiceLimitItemDto {
  @IsUUID() serviceId: string;
  @IsInt() @Min(1) limitCount: number;
  @IsIn(['day', 'week', 'month']) limitPeriod: 'day' | 'week' | 'month';
}

export class UpdateClientDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) birthDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() @MaxLength(200_000) avatarUrl?: string;

  @IsOptional() @IsInt() @Min(1) serviceLimitCount?: number | null;
  @IsOptional() @IsIn(['day', 'week', 'month']) serviceLimitPeriod?: 'day' | 'week' | 'month' | null;

  @IsOptional() @IsBoolean() allProfessionals?: boolean;
  @IsOptional() @IsBoolean() allServices?: boolean;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) professionalIds?: string[];
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) serviceIds?: string[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ServiceLimitItemDto)
  serviceLimits?: ServiceLimitItemDto[];

  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() @IsIn(['12h', '24h']) timeFormat?: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/clients/dto/
git commit -m "feat(api): add serviceLimits[] field to client DTOs"
```

---

## Task 3: Update `clients.service.ts` to handle per-service limits

**Files:**
- Modify: `packages/api/src/clients/clients.service.ts`

- [ ] **Step 1: Add import for `clientServiceLimits`**

In the import from `@scheduler/shared`, add `clientServiceLimits`:

```typescript
import {
  appointments,
  clientProfiles,
  clientProfessionals,
  clientServices,
  clientServiceLimits,   // ← add this
  professionals,
  services,
  users,
} from '@scheduler/shared';
```

- [ ] **Step 2: Update `findOne` to also return per-service limits**

Inside the `findOne` method, after the `linkedServices` query and before `return`, add:

```typescript
const perServiceLimits = row.profileId
  ? await tx
      .select({
        serviceId:   clientServiceLimits.serviceId,
        limitCount:  clientServiceLimits.limitCount,
        limitPeriod: clientServiceLimits.limitPeriod,
      })
      .from(clientServiceLimits)
      .where(eq(clientServiceLimits.clientProfileId, row.profileId))
  : [];

return { ...row, linkedProfessionals, linkedServices, perServiceLimits };
```

- [ ] **Step 3: Update `create` to insert per-service limits**

Inside the `create` method, after the `serviceIds` block, add:

```typescript
if (dto.serviceLimits?.length) {
  await tx.insert(clientServiceLimits).values(
    dto.serviceLimits.map((sl) => ({
      tenantId,
      clientProfileId: profile.id,
      serviceId:  sl.serviceId,
      limitCount: sl.limitCount,
      limitPeriod: sl.limitPeriod,
    })),
  );
}
```

- [ ] **Step 4: Update `update` to sync per-service limits**

Inside the `update` method, after the `serviceIds` block (around line 252), add:

```typescript
if (dto.serviceLimits !== undefined) {
  await tx.delete(clientServiceLimits).where(eq(clientServiceLimits.clientProfileId, profileId));
  if (dto.serviceLimits.length) {
    await tx.insert(clientServiceLimits).values(
      dto.serviceLimits.map((sl) => ({
        tenantId,
        clientProfileId: profileId,
        serviceId:  sl.serviceId,
        limitCount: sl.limitCount,
        limitPeriod: sl.limitPeriod,
      })),
    );
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/clients/clients.service.ts
git commit -m "feat(api): persist and return per-service limits in clients service"
```

---

## Task 4: Add limit enforcement to `appointments.service.ts`

**Files:**
- Modify: `packages/api/src/appointments/appointments.service.ts`

- [ ] **Step 1: Update the imports**

Replace the drizzle-orm import line with:

```typescript
import { and, eq, count, desc, gte, lte, notInArray } from 'drizzle-orm';
```

Add `clientProfiles`, `clientServiceLimits` to the `@scheduler/shared` import:

```typescript
import {
  appointments, services, tenants, professionals, users,
  clientProfiles, clientServiceLimits,
} from '@scheduler/shared';
```

- [ ] **Step 2: Add `getPeriodBounds` helper at the top of the file (after imports)**

```typescript
function getPeriodBounds(dateStr: string, period: 'day' | 'week' | 'month'): { from: Date; to: Date } {
  const date = new Date(dateStr + 'T00:00:00Z');
  if (period === 'day') {
    return {
      from: date,
      to: new Date(dateStr + 'T23:59:59.999Z'),
    };
  }
  if (period === 'week') {
    const dow = date.getUTCDay();
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() - ((dow + 6) % 7));
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 59, 999);
    return { from: monday, to: sunday };
  }
  // month
  const from = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const to   = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { from, to };
}
```

- [ ] **Step 3: Insert the limit check inside the `create` method's `withTenant` block**

Inside `withTenant(this.db, tenantId, async (tx) => { ... })` in `create`, add this block immediately after resolving the service duration (after the `if (!svc) throw` line) and before calculating `startsAt`:

```typescript
// ── Appointment limit check ───────────────────────────────────────────
const [profile] = await tx
  .select({
    serviceLimitCount:  clientProfiles.serviceLimitCount,
    serviceLimitPeriod: clientProfiles.serviceLimitPeriod,
  })
  .from(clientProfiles)
  .where(eq(clientProfiles.userId, clientId));

if (profile?.serviceLimitCount && profile?.serviceLimitPeriod) {
  // Normal mode: count all appointments for the client in the period
  const { from, to } = getPeriodBounds(dto.date, profile.serviceLimitPeriod);
  const [{ total }] = await tx
    .select({ total: count() })
    .from(appointments)
    .where(and(
      eq(appointments.clientId, clientId),
      eq(appointments.tenantId, tenantId),
      gte(appointments.startsAt, from),
      lte(appointments.startsAt, to),
      notInArray(appointments.status, ['cancelled', 'completed']),
    ));
  if (Number(total) >= profile.serviceLimitCount) {
    throw new BadRequestException('LIMIT_EXCEEDED');
  }
} else if (profile) {
  // Per-service mode: look for a limit specific to this service
  const [serviceLimit] = await tx
    .select({ limitCount: clientServiceLimits.limitCount, limitPeriod: clientServiceLimits.limitPeriod })
    .from(clientServiceLimits)
    .innerJoin(clientProfiles, eq(clientProfiles.id, clientServiceLimits.clientProfileId))
    .where(and(
      eq(clientProfiles.userId, clientId),
      eq(clientServiceLimits.serviceId, dto.serviceId),
    ));

  if (serviceLimit) {
    const { from, to } = getPeriodBounds(dto.date, serviceLimit.limitPeriod);
    const [{ total }] = await tx
      .select({ total: count() })
      .from(appointments)
      .where(and(
        eq(appointments.clientId, clientId),
        eq(appointments.tenantId, tenantId),
        eq(appointments.serviceId, dto.serviceId),
        gte(appointments.startsAt, from),
        lte(appointments.startsAt, to),
        notInArray(appointments.status, ['cancelled', 'completed']),
      ));
    if (Number(total) >= serviceLimit.limitCount) {
      throw new BadRequestException('LIMIT_EXCEEDED');
    }
  }
}
// ─────────────────────────────────────────────────────────────────────
```

> Note: `profile?.serviceLimitCount && profile?.serviceLimitPeriod` covers Normal mode. The `else if (profile)` covers Per-Serviço mode — if the profile exists but has no global limit, we check the per-service table. If no per-service limit is found either, the appointment is allowed.

- [ ] **Step 4: Add a `checkLimit` method (reused by the limit-check endpoint)**

Add a new public method to `AppointmentsService` for the endpoint added in Task 5:

```typescript
async checkLimit(
  clientId: string,
  serviceId: string,
  date: string,
  tenantId: string,
): Promise<{ exceeded: boolean }> {
  return withTenant(this.db, tenantId, async (tx) => {
    const [profile] = await tx
      .select({
        serviceLimitCount:  clientProfiles.serviceLimitCount,
        serviceLimitPeriod: clientProfiles.serviceLimitPeriod,
      })
      .from(clientProfiles)
      .where(eq(clientProfiles.userId, clientId));

    if (!profile) return { exceeded: false };

    if (profile.serviceLimitCount && profile.serviceLimitPeriod) {
      const { from, to } = getPeriodBounds(date, profile.serviceLimitPeriod);
      const [{ total }] = await tx
        .select({ total: count() })
        .from(appointments)
        .where(and(
          eq(appointments.clientId, clientId),
          eq(appointments.tenantId, tenantId),
          gte(appointments.startsAt, from),
          lte(appointments.startsAt, to),
          notInArray(appointments.status, ['cancelled', 'completed']),
        ));
      return { exceeded: Number(total) >= profile.serviceLimitCount };
    }

    const [serviceLimit] = await tx
      .select({ limitCount: clientServiceLimits.limitCount, limitPeriod: clientServiceLimits.limitPeriod })
      .from(clientServiceLimits)
      .innerJoin(clientProfiles, eq(clientProfiles.id, clientServiceLimits.clientProfileId))
      .where(and(
        eq(clientProfiles.userId, clientId),
        eq(clientServiceLimits.serviceId, serviceId),
      ));

    if (!serviceLimit) return { exceeded: false };

    const { from, to } = getPeriodBounds(date, serviceLimit.limitPeriod);
    const [{ total }] = await tx
      .select({ total: count() })
      .from(appointments)
      .where(and(
        eq(appointments.clientId, clientId),
        eq(appointments.tenantId, tenantId),
        eq(appointments.serviceId, serviceId),
        gte(appointments.startsAt, from),
        lte(appointments.startsAt, to),
        notInArray(appointments.status, ['cancelled', 'completed']),
      ));
    return { exceeded: Number(total) >= serviceLimit.limitCount };
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/appointments/appointments.service.ts
git commit -m "feat(api): enforce appointment limits (normal + per-service) on create"
```

---

## Task 5: Add `GET /appointments/limit-check` endpoint

**Files:**
- Modify: `packages/api/src/appointments/appointments.controller.ts`

- [ ] **Step 1: Add the `@Get('limit-check')` endpoint**

Add a `@Query` import for the missing `Query` decorator — it's already imported. Then add this method to `AppointmentsController` before the `@Get()` `findAll` handler:

```typescript
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
```

> Placement matters: this route must be declared **before** any `:id`-prefixed `@Get` routes to avoid NestJS treating `limit-check` as an ID parameter. Place it right after `create` and before `findAll`.

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/appointments/appointments.controller.ts
git commit -m "feat(api): add GET /appointments/limit-check endpoint"
```

---

## Task 6: Update frontend types and `useClients` hook

**Files:**
- Modify: `packages/web/src/types/index.ts`
- Modify: `packages/web/src/hooks/useClients.ts`

- [ ] **Step 1: Add `ServiceLimit` type and update `ClientDetail` in `types/index.ts`**

After the `ClientPage` type, add:

```typescript
export type ServiceLimit = {
  serviceId:   string
  limitCount:  number
  limitPeriod: 'day' | 'week' | 'month'
}
```

Update `ClientDetail` to include `perServiceLimits`:

```typescript
export type ClientDetail = Client & {
  linkedProfessionals: { professionalId: string; name: string; position: string | null }[]
  linkedServices: { serviceId: string; name: string }[]
  perServiceLimits: ServiceLimit[]
}
```

- [ ] **Step 2: Update mutation body types in `useClients.ts`**

In `useCreateClient`, add `serviceLimits` to the body type:

```typescript
mutationFn: (body: {
  name: string; email: string; password: string;
  phone?: string; birthDate?: string; notes?: string;
  active?: boolean; avatarUrl?: string; allProfessionals?: boolean; allServices?: boolean;
  serviceLimitCount?: number; serviceLimitPeriod?: string;
  serviceLimits?: { serviceId: string; limitCount: number; limitPeriod: string }[];
  professionalIds?: string[]; serviceIds?: string[];
  timezone?: string; timeFormat?: '12h' | '24h';
}) => api('/clients', { method: 'POST', body: JSON.stringify(body) }),
```

In `useUpdateClient`, add `serviceLimits` to the body type:

```typescript
mutationFn: (body: {
  name?: string; email?: string; phone?: string;
  birthDate?: string; notes?: string; active?: boolean; avatarUrl?: string;
  allProfessionals?: boolean; allServices?: boolean;
  serviceLimitCount?: number | null; serviceLimitPeriod?: string | null;
  serviceLimits?: { serviceId: string; limitCount: number; limitPeriod: string }[];
  professionalIds?: string[]; serviceIds?: string[];
  timezone?: string; timeFormat?: '12h' | '24h';
}) => api(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/types/index.ts packages/web/src/hooks/useClients.ts
git commit -m "feat(web): add ServiceLimit type and update client hook body types"
```

---

## Task 7: Update `ClientForm` — reorder cards and add limit mode UI

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/clients/_components/ClientForm.tsx`

This is the largest UI change. The full file is replaced here to ensure correctness.

- [ ] **Step 1: Update `ClientFormData` type** (near the top of the file, in the Types section)

```typescript
export type ClientFormData = {
  name: string
  email: string
  password?: string
  phone?: string
  birthDate?: string
  notes?: string
  active: boolean
  avatarUrl?: string
  timezone: string
  timeFormat: '12h' | '24h'
  allProfessionals: boolean
  allServices: boolean
  professionalIds: string[]
  serviceIds: string[]
  serviceLimitCount?: number | null
  serviceLimitPeriod?: 'day' | 'week' | 'month' | null
  serviceLimits?: { serviceId: string; limitCount: number; limitPeriod: 'day' | 'week' | 'month' }[]
}
```

- [ ] **Step 2: Add `LimitMode` type and new state variables**

After the `FormState` type definition, add:

```typescript
type LimitMode = 'none' | 'normal' | 'per_service'
type PerServiceLimitMap = Record<string, { count: string; period: string }>
```

Inside the component, after the existing `selectedServiceIds` state, add:

```typescript
const [limitMode, setLimitMode] = useState<LimitMode>('none')
const [perServiceLimits, setPerServiceLimits] = useState<PerServiceLimitMap>({})
```

- [ ] **Step 3: Update the `useEffect` initializer to restore limit mode from `defaultValues`**

Inside the `useEffect` that initializes edit mode, after `setSelectedServiceIds(...)`, add:

```typescript
if (defaultValues.serviceLimitCount != null && defaultValues.serviceLimitPeriod) {
  setLimitMode('normal')
} else if (defaultValues.perServiceLimits?.length) {
  setLimitMode('per_service')
  const map: PerServiceLimitMap = {}
  defaultValues.perServiceLimits.forEach(sl => {
    map[sl.serviceId] = { count: String(sl.limitCount), period: sl.limitPeriod }
  })
  setPerServiceLimits(map)
} else {
  setLimitMode('none')
}
```

- [ ] **Step 4: Update `validate()` to validate per-service limits**

Replace the existing service limit validation block:

```typescript
if (limitMode === 'normal') {
  if (form.serviceLimitCount && isNaN(Number(form.serviceLimitCount))) {
    e.serviceLimitCount = 'Valor inválido'
  }
  if (form.serviceLimitCount && !form.serviceLimitPeriod) {
    e.serviceLimitPeriod = 'Selecione o período'
  }
  if (!form.serviceLimitCount && form.serviceLimitPeriod) {
    e.serviceLimitCount = 'Informe a quantidade'
  }
}
if (limitMode === 'per_service') {
  for (const id of selectedServiceIds) {
    const sl = perServiceLimits[id]
    if (sl?.count && !sl?.period) {
      e[`perServicePeriod_${id}` as any] = 'Selecione o período'
    }
  }
}
```

- [ ] **Step 5: Update `handleSubmit` to build the correct payload**

Replace the current spread for `serviceLimitCount`/`serviceLimitPeriod` in `data`:

```typescript
const data: ClientFormData = {
  name:             form.name.trim(),
  email:            form.email.trim(),
  ...(mode === 'create' ? { password: form.password } : {}),
  phone:            form.phone.trim() || undefined,
  birthDate:        form.birthDate || undefined,
  notes:            form.notes.trim() || undefined,
  active:           form.active,
  avatarUrl:        avatarUrl ?? undefined,
  timezone,
  timeFormat,
  allProfessionals: allProfs,
  allServices:      allSvcs,
  professionalIds:  allProfs ? [] : selectedProfs.map(p => p.id),
  serviceIds:       allSvcs ? [] : selectedServiceIds,
  // Limit mode
  serviceLimitCount:  limitMode === 'normal' && form.serviceLimitCount
    ? Number(form.serviceLimitCount) : null,
  serviceLimitPeriod: limitMode === 'normal' && form.serviceLimitPeriod
    ? form.serviceLimitPeriod as 'day' | 'week' | 'month' : null,
  serviceLimits: limitMode === 'per_service'
    ? selectedServiceIds
        .filter(id => perServiceLimits[id]?.count && perServiceLimits[id]?.period)
        .map(id => ({
          serviceId:   id,
          limitCount:  Number(perServiceLimits[id].count),
          limitPeriod: perServiceLimits[id].period as 'day' | 'week' | 'month',
        }))
    : [],
}
```

- [ ] **Step 6: Reorder cards in JSX and replace "Limite de serviços" card**

In the JSX `return`, the card order should now be:

1. Card: Dados pessoais (unchanged)
2. Card: Perfil (unchanged)
3. `<PreferencesCard .../>` (unchanged)
4. Card: **Profissionais vinculados** (move up — was Card 5)
5. Card: **Serviços permitidos** (move up — was Card 6)
6. Card: **Limite de serviços** (new UI — move down to last)

The new "Limite de serviços" card JSX (replace the old one entirely):

```tsx
{/* ── Card 6: Limite de serviços ── */}
<div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 shadow-sm">
  <p className="text-sm font-bold text-gray-900 m-0 mb-2">Limite de serviços</p>
  <p className="text-[13px] text-gray-500 m-0 mb-5">
    Define quantos agendamentos este cliente pode fazer em um determinado período.
  </p>

  {/* Mode selector */}
  <div className="flex flex-col gap-2 mb-5">
    {(['none', 'normal', 'per_service'] as LimitMode[]).map((mode) => {
      const labels: Record<LimitMode, string> = {
        none:        'Sem limite',
        normal:      'Normal',
        per_service: 'Por Serviço',
      }
      const descs: Record<LimitMode, string> = {
        none:        'Nenhuma restrição de quantidade de agendamentos',
        normal:      'Limite total por período, independente do serviço',
        per_service: 'Limite individual para cada serviço',
      }
      return (
        <label
          key={mode}
          className={cn(
            'flex items-start gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors',
            limitMode === mode ? 'border-indigo-400 bg-indigo-50/60' : 'border-gray-200 hover:bg-gray-50',
          )}
        >
          <input
            type="radio"
            name="limitMode"
            value={mode}
            checked={limitMode === mode}
            onChange={() => {
              setLimitMode(mode)
              if (mode !== 'normal') { set('serviceLimitCount', ''); set('serviceLimitPeriod', '') }
              if (mode !== 'per_service') setPerServiceLimits({})
            }}
            className="mt-0.5 w-4 h-4 accent-indigo-500 cursor-pointer shrink-0"
          />
          <div>
            <p className="m-0 text-[13.5px] font-semibold text-gray-800">{labels[mode]}</p>
            <p className="m-0 text-xs text-gray-400">{descs[mode]}</p>
          </div>
        </label>
      )
    })}
  </div>

  {/* Normal mode inputs */}
  {limitMode === 'normal' && (
    <div className="flex gap-3 items-end">
      <div className="[flex:0_0_140px]">
        <label htmlFor="client-limit-count" className="block text-[13px] font-medium text-gray-700 mb-1.5">Quantidade</label>
        <input
          id="client-limit-count"
          type="number"
          min={1}
          value={form.serviceLimitCount}
          onChange={e => set('serviceLimitCount', e.target.value)}
          placeholder="Ex: 3"
          className={inputCls(!!errors.serviceLimitCount)}
        />
        {errors.serviceLimitCount && <p className="text-xs text-red-500 mt-1 m-0">{errors.serviceLimitCount}</p>}
      </div>
      <div className="[flex:0_0_180px]">
        <label htmlFor="client-limit-period" className="block text-[13px] font-medium text-gray-700 mb-1.5">Por período</label>
        <div className="relative">
          <select
            id="client-limit-period"
            value={form.serviceLimitPeriod}
            onChange={e => set('serviceLimitPeriod', e.target.value)}
            className={cn(
              'w-full h-[42px] pl-3 pr-8 text-sm text-gray-900 bg-white rounded-lg border appearance-none cursor-pointer outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
              errors.serviceLimitPeriod ? 'border-red-400' : 'border-gray-200',
            )}
          >
            <option value="">Selecione…</option>
            <option value="day">Dia</option>
            <option value="week">Semana</option>
            <option value="month">Mês</option>
          </select>
          <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        {errors.serviceLimitPeriod && <p className="text-xs text-red-500 mt-1 m-0">{errors.serviceLimitPeriod}</p>}
      </div>
    </div>
  )}

  {/* Per-service mode inputs */}
  {limitMode === 'per_service' && (
    <div className="flex flex-col gap-3">
      {allSvcs || selectedServiceIds.length === 0 ? (
        <p className="text-[13px] text-gray-400">
          Selecione serviços específicos em "Serviços permitidos" para configurar limites por serviço.
        </p>
      ) : (
        selectedServiceIds.map(id => {
          const svc = services.find((s: Service) => s.id === id)
          const sl  = perServiceLimits[id] ?? { count: '', period: '' }
          const errKey = `perServicePeriod_${id}` as any
          return (
            <div key={id} className="flex gap-3 items-end">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-700 mb-1.5 truncate">{svc?.name ?? id}</p>
              </div>
              <div className="[flex:0_0_120px]">
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Quantidade</label>
                <input
                  type="number"
                  min={1}
                  value={sl.count}
                  onChange={e => setPerServiceLimits(prev => ({ ...prev, [id]: { ...sl, count: e.target.value } }))}
                  placeholder="Ex: 2"
                  className={inputCls(false)}
                />
              </div>
              <div className="[flex:0_0_160px]">
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Período</label>
                <div className="relative">
                  <select
                    value={sl.period}
                    onChange={e => setPerServiceLimits(prev => ({ ...prev, [id]: { ...sl, period: e.target.value } }))}
                    className={cn(
                      'w-full h-[42px] pl-3 pr-8 text-sm text-gray-900 bg-white rounded-lg border appearance-none cursor-pointer outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
                      errors[errKey] ? 'border-red-400' : 'border-gray-200',
                    )}
                  >
                    <option value="">Selecione…</option>
                    <option value="day">Dia</option>
                    <option value="week">Semana</option>
                    <option value="month">Mês</option>
                  </select>
                  <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
                {errors[errKey] && <p className="text-xs text-red-500 mt-1 m-0">{errors[errKey]}</p>}
              </div>
            </div>
          )
        })
      )}
    </div>
  )}
</div>
```

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/clients/_components/ClientForm.tsx
git commit -m "feat(web): redesign limit-of-services card with Normal/Por Serviço modes"
```

---

## Task 8: Add `useLimitCheck` hook

**Files:**
- Create: `packages/web/src/hooks/useLimitCheck.ts`

- [ ] **Step 1: Create the hook**

```typescript
// packages/web/src/hooks/useLimitCheck.ts
import { useQuery } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'

export function useLimitCheck(
  serviceId: string | null,
  date: string | null,
  clientId?: string | null,
) {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<{ exceeded: boolean }>({
    queryKey: ['limit-check', slug, serviceId, date, clientId ?? null],
    enabled: !!serviceId && !!date,
    staleTime: 0,
    queryFn: async () => {
      const params = new URLSearchParams({ serviceId: serviceId!, date: date! })
      if (clientId) params.set('clientId', clientId)
      const res = await api(`/appointments/limit-check?${params}`)
      return res.json()
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/hooks/useLimitCheck.ts
git commit -m "feat(web): add useLimitCheck hook for appointment limit validation"
```

---

## Task 9: Show limit warning in the appointment wizard

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/appointments/create/page.tsx`

- [ ] **Step 1: Import `useLimitCheck`**

Add to the imports at the top of the page:

```typescript
import { useLimitCheck } from '@/hooks/useLimitCheck'
```

- [ ] **Step 2: Call the hook after the existing `useSlots` call**

After `const create = useCreateAppointment()`, add:

```typescript
const limitClientId = isAdminOrProfessional ? clientId : (user?.id ?? null)
const { data: limitCheck } = useLimitCheck(serviceId, date, limitClientId)
const limitExceeded = limitCheck?.exceeded === true
```

- [ ] **Step 3: Show the warning in the Date & Time step**

In the "Data e horário" section, right after the slots grid (after the closing `</div>` of the `flex flex-wrap gap-2` slots wrapper), add:

```tsx
{limitExceeded && (
  <p className="mt-3 text-[13px] text-red-600 font-medium">
    Não é possivel agendar nessa data pelo seu limite de agendamentos
  </p>
)}
```

- [ ] **Step 4: Also prevent selecting a time slot when limit is exceeded**

In the slot `<button>` `onClick`, guard against selecting if limit exceeded:

```tsx
onClick={() => !limitExceeded && setStartTime(slot)}
className={cn(
  'px-3.5 py-2 border-[1.5px] rounded-lg text-[13px] font-semibold transition-[border-color,background,color]',
  limitExceeded
    ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed opacity-60'
    : 'cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-700',
  !limitExceeded && startTime === slot
    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
    : !limitExceeded ? 'border-gray-200 bg-white text-gray-700' : '',
)}
```

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/appointments/create/page.tsx
git commit -m "feat(web): show limit warning and disable slots when client limit exceeded"
```

---

## Task 10: End-to-end validation

- [ ] **Step 1: Start the stack and verify the form**

```bash
docker compose up --build
```

- Navigate to any client's edit page → confirm "Profissionais vinculados" appears before "Serviços permitidos", and "Limite de serviços" is last.
- Select specific services (uncheck "Todos os serviços").
- Set limit mode to "Por Serviço" → confirm the service rows appear with quantity + period fields.
- Switch to "Normal" → confirm the global inputs appear and per-service inputs are gone.
- Switch to "Sem limite" → confirm all limit inputs are hidden.
- Save with each mode and reload — confirm the values restore correctly.

- [ ] **Step 2: Verify limit enforcement**

- Set a client's Normal limit to `1 per month`.
- Create an appointment for that client.
- Go to create a second appointment for the same client in the same month → confirm the limit warning appears in the Date step and slots are disabled.
- Try submitting from another tab (bypass UI) → confirm the API returns a 400 with `LIMIT_EXCEEDED`.

- [ ] **Step 3: Verify per-service mode**

- Set a client with service A: limit 1 per day, service B: no limit.
- Create an appointment for service A.
- Try to create another appointment for service A same day → warning appears.
- Create an appointment for service B same day → no warning.

- [ ] **Step 4: Final commit (if any loose ends)**

```bash
git add -p
git commit -m "fix(web/api): per-service limits — any final adjustments"
```
