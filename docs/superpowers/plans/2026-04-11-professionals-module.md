# Professionals Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the professionals module with role-based access, new fields (position), full CRUD from the admin, self-editing for the professional, and a Metronic-style detail/edit UI.

**Architecture:** The API splits concerns between `professionals` (profile data) and `users` (auth data). `create` now provisions both in a transaction. The `update` endpoint accepts all fields but enforces field-level authorization server-side — admin can change `active` and `role`; a professional can only edit their own `name/bio/avatarUrl/position`. The frontend has three distinct pages: listing (admin), detail/edit (`[id]`), and a me-redirect. The `[id]` page renders admin vs. professional views based on the JWT role.

**Tech Stack:** NestJS · Drizzle ORM · PostgreSQL · Next.js 16 App Router · TanStack Query · React Hook Form

---

## File Map

**API — modified**
- `packages/shared/src/schema/professionals.schema.ts` — add `position` column
- `packages/api/migrations/0002_professionals_position.sql` — migration for new column
- `packages/api/src/professionals/dto/create-professional.dto.ts` — new fields: name, email, password, position, bio, avatarUrl
- `packages/api/src/professionals/dto/update-professional.dto.ts` — add position; keep active/role as admin-only (enforced in service)
- `packages/api/src/professionals/professionals.service.ts` — create (user+prof), findOne (join), findByUserId, update (split user/prof fields), remove (guard self-delete)
- `packages/api/src/professionals/professionals.controller.ts` — open findAll/findOne to admin only; add GET /professionals/me; PATCH without @Roles (service enforces)
- `packages/api/src/professionals/professionals.service.spec.ts` — update existing tests

**Web — new**
- `packages/web/src/hooks/useProfessionals.ts` — add useProfessional(id), useMyProfile, useCreateProfessional, useUpdateProfessional, useDeleteProfessional
- `packages/web/src/app/(tenant)/(app)/professionals/new/page.tsx` — create form (admin)
- `packages/web/src/app/(tenant)/(app)/professionals/me/page.tsx` — redirect to own [id]
- `packages/web/src/app/(tenant)/(app)/professionals/[id]/page.tsx` — detail/edit page

**Web — modified**
- `packages/web/src/types/index.ts` — add position and role to Professional type
- `packages/web/src/components/AppShell/Sidebar.tsx` — add "Meu perfil" for professional role
- `packages/web/src/app/(tenant)/(app)/professionals/page.tsx` — add Create button, clickable names, Ações column

---

## Task 1: Schema migration — add `position` to professionals

**Files:**
- Modify: `packages/shared/src/schema/professionals.schema.ts`
- Create: `packages/api/migrations/0002_professionals_position.sql`

- [ ] **Step 1: Add `position` to the Drizzle schema**

```ts
// packages/shared/src/schema/professionals.schema.ts
import { boolean, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';
import { users } from './users.schema';

export const professionals = pgTable('professionals', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  position: text('position'),   // ← new: Cargo
  active: boolean('active').notNull().default(true),
});

export type Professional = typeof professionals.$inferSelect;
export type NewProfessional = typeof professionals.$inferInsert;
```

- [ ] **Step 2: Write the SQL migration file**

```sql
-- packages/api/migrations/0002_professionals_position.sql
ALTER TABLE "professionals" ADD COLUMN IF NOT EXISTS "position" text;
```

- [ ] **Step 3: Apply the migration inside Docker**

```bash
docker compose exec api pnpm --filter api db:migrate
```

Expected: no error, column visible via `\d professionals` in psql.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/schema/professionals.schema.ts packages/api/migrations/0002_professionals_position.sql
git commit -m "feat(schema): add position column to professionals"
```

---

## Task 2: API — DTOs

**Files:**
- Modify: `packages/api/src/professionals/dto/create-professional.dto.ts`
- Modify: `packages/api/src/professionals/dto/update-professional.dto.ts`

- [ ] **Step 1: Replace create DTO**

Admin creates a professional by supplying user credentials + profile. The service provisions both the user and the professionals record in one transaction.

```ts
// packages/api/src/professionals/dto/create-professional.dto.ts
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProfessionalDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
```

- [ ] **Step 2: Replace update DTO**

All fields are optional. `active` and `role` are accepted but enforced server-side.

```ts
// packages/api/src/professionals/dto/update-professional.dto.ts
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateProfessionalDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;          // admin only — enforced in service

  @IsString()
  @IsIn(['tenant_admin', 'professional', 'client'])
  @IsOptional()
  role?: string;             // admin only — enforced in service
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/professionals/dto/
git commit -m "feat(api): update professionals DTOs with new fields"
```

---

## Task 3: API — Service

**Files:**
- Modify: `packages/api/src/professionals/professionals.service.ts`

- [ ] **Step 1: Rewrite the service**

```ts
// packages/api/src/professionals/professionals.service.ts
import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { professionals, users } from '@scheduler/shared';
import * as bcrypt from 'bcryptjs';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';

const PROF_FIELDS = {
  id:        professionals.id,
  tenantId:  professionals.tenantId,
  userId:    professionals.userId,
  bio:       professionals.bio,
  avatarUrl: professionals.avatarUrl,
  position:  professionals.position,
  active:    professionals.active,
  name:      users.name,
  email:     users.email,
  phone:     users.phone,
  role:      users.role,
};

@Injectable()
export class ProfessionalsService {
  constructor(@Inject(DB) private readonly db: DrizzleDB) {}

  findAll(tenantId: string) {
    return withTenant(this.db, tenantId, (tx) =>
      tx.select(PROF_FIELDS)
        .from(professionals)
        .innerJoin(users, eq(professionals.userId, users.id))
        .where(eq(professionals.tenantId, tenantId)),
    );
  }

  async findOne(id: string, tenantId: string) {
    const [prof] = await withTenant(this.db, tenantId, (tx) =>
      tx.select(PROF_FIELDS)
        .from(professionals)
        .innerJoin(users, eq(professionals.userId, users.id))
        .where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId))),
    );
    if (!prof) throw new NotFoundException('Professional not found');
    return prof;
  }

  async findByUserId(userId: string, tenantId: string) {
    const [prof] = await withTenant(this.db, tenantId, (tx) =>
      tx.select(PROF_FIELDS)
        .from(professionals)
        .innerJoin(users, eq(professionals.userId, users.id))
        .where(and(eq(professionals.userId, userId), eq(professionals.tenantId, tenantId))),
    );
    if (!prof) throw new NotFoundException('Professional profile not found');
    return prof;
  }

  async create(dto: CreateProfessionalDto, tenantId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, dto.email), eq(users.tenantId, tenantId)));
      if (existing) throw new ConflictException('Email already in use');

      const passwordHash = await bcrypt.hash(dto.password, 10);
      const [user] = await tx.insert(users).values({
        tenantId,
        email: dto.email,
        passwordHash,
        role: 'professional',
        name: dto.name,
      }).returning();

      const [prof] = await tx.insert(professionals).values({
        tenantId,
        userId: user.id,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
        position: dto.position,
      }).returning();

      return { ...prof, name: user.name, email: user.email, phone: null, role: user.role };
    });
  }

  async update(
    id: string,
    dto: UpdateProfessionalDto,
    tenantId: string,
    requestingUserId: string,
    requestingUserRole: string,
  ) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [prof] = await tx
        .select({ id: professionals.id, userId: professionals.userId })
        .from(professionals)
        .where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId)));
      if (!prof) throw new NotFoundException('Professional not found');

      const isAdmin = requestingUserRole === 'tenant_admin';
      const isOwn   = prof.userId === requestingUserId;

      if (!isAdmin && !isOwn) throw new ForbiddenException('Cannot edit another professional');

      // Fields only admin may change
      if (!isAdmin && (dto.active !== undefined || dto.role !== undefined)) {
        throw new ForbiddenException('Only admins can change role and status');
      }

      // Update users table (name, role)
      const userPatch: Record<string, unknown> = {};
      if (dto.name !== undefined) userPatch.name = dto.name;
      if (dto.role !== undefined && isAdmin) userPatch.role = dto.role;
      if (Object.keys(userPatch).length) {
        await tx.update(users).set(userPatch).where(eq(users.id, prof.userId));
      }

      // Update professionals table
      const profPatch: Record<string, unknown> = {};
      if (dto.bio       !== undefined) profPatch.bio       = dto.bio;
      if (dto.avatarUrl !== undefined) profPatch.avatarUrl = dto.avatarUrl;
      if (dto.position  !== undefined) profPatch.position  = dto.position;
      if (dto.active    !== undefined && isAdmin) profPatch.active = dto.active;
      if (Object.keys(profPatch).length) {
        await tx.update(professionals).set(profPatch)
          .where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId)));
      }

      return this.findOne(id, tenantId);
    });
  }

  async remove(id: string, tenantId: string, requestingUserId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [prof] = await tx
        .select({ id: professionals.id, userId: professionals.userId })
        .from(professionals)
        .where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId)));
      if (!prof) throw new NotFoundException('Professional not found');
      if (prof.userId === requestingUserId) throw new ForbiddenException('Cannot delete your own account');

      await tx.delete(professionals).where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId)));
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/professionals/professionals.service.ts
git commit -m "feat(api): rewrite professionals service with full CRUD + auth rules"
```

---

## Task 4: API — Controller

**Files:**
- Modify: `packages/api/src/professionals/professionals.controller.ts`

- [ ] **Step 1: Rewrite the controller**

```ts
// packages/api/src/professionals/professionals.controller.ts
import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('professionals')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ProfessionalsController {
  constructor(private readonly service: ProfessionalsService) {}

  /** Admin sees the full list. Professionals access their own via /me. */
  @Get()
  @Roles('tenant_admin')
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  /** Professional (or admin) gets their own profile. */
  @Get('me')
  @Roles('tenant_admin', 'professional')
  findMe(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.service.findByUserId(user.id, tenantId);
  }

  /** Admin views any professional. Professional may view their own only. */
  @Get(':id')
  @Roles('tenant_admin', 'professional')
  async findOne(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const prof = await this.service.findOne(id, tenantId);
    if (user.role !== 'tenant_admin' && prof.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return prof;
  }

  @Post()
  @Roles('tenant_admin')
  create(@Body() dto: CreateProfessionalDto, @TenantId() tenantId: string) {
    return this.service.create(dto, tenantId);
  }

  /** Admin can update any professional; professional can update only themselves (limited fields). */
  @Patch(':id')
  @Roles('tenant_admin', 'professional')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProfessionalDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.service.update(id, dto, tenantId, user.id, user.role);
  }

  @Delete(':id')
  @Roles('tenant_admin')
  remove(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.remove(id, tenantId, user.id);
  }
}
```

- [ ] **Step 2: Restart API and verify routes are mapped**

```bash
docker compose restart api
docker compose logs api --tail=30 | grep "professionals"
```

Expected output includes lines for each of:
- `{/professionals, GET}`
- `{/professionals/me, GET}`
- `{/professionals/:id, GET}`
- `{/professionals, POST}`
- `{/professionals/:id, PATCH}`
- `{/professionals/:id, DELETE}`

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/professionals/professionals.controller.ts
git commit -m "feat(api): open professionals PATCH to professional role, add /me endpoint"
```

---

## Task 5: API — Update unit test

**Files:**
- Modify: `packages/api/src/professionals/professionals.service.spec.ts`

- [ ] **Step 1: Replace the test**

The existing mock doesn't support the join query. Update it to reflect the new service shape.

```ts
// packages/api/src/professionals/professionals.service.spec.ts
import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { DB } from '../database/database.module';

// Minimal chainable mock that resolves to mockResult at the end
function makeMockDb(resolveWith: unknown) {
  const chain: Record<string, jest.Mock> = {};
  const end = jest.fn().mockResolvedValue(resolveWith);
  ['select', 'from', 'innerJoin', 'where', 'insert', 'values', 'returning', 'update', 'set', 'delete'].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue({ ...chain, then: end.bind(null) });
  });
  chain['transaction'] = jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(chain));
  return chain;
}

describe('ProfessionalsService', () => {
  it('remove throws ForbiddenException when deleting own account', async () => {
    const mockDb = makeMockDb([{ id: 'prof-1', userId: 'user-1' }]);
    const module = await Test.createTestingModule({
      providers: [ProfessionalsService, { provide: DB, useValue: mockDb }],
    }).compile();
    const service = module.get(ProfessionalsService);

    await expect(service.remove('prof-1', 'tenant-1', 'user-1')).rejects.toThrow(ForbiddenException);
  });

  it('update throws ForbiddenException when professional tries to change another user', async () => {
    const mockDb = makeMockDb([{ id: 'prof-1', userId: 'user-2' }]);
    const module = await Test.createTestingModule({
      providers: [ProfessionalsService, { provide: DB, useValue: mockDb }],
    }).compile();
    const service = module.get(ProfessionalsService);

    await expect(
      service.update('prof-1', { name: 'X' }, 'tenant-1', 'user-1', 'professional'),
    ).rejects.toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test:api -- --testPathPattern=professionals
```

Expected: both tests PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/professionals/professionals.service.spec.ts
git commit -m "test(api): update professionals service unit tests"
```

---

## Task 6: Frontend — Types and hooks

**Files:**
- Modify: `packages/web/src/types/index.ts`
- Modify: `packages/web/src/hooks/useProfessionals.ts`

- [ ] **Step 1: Add `position` and `role` to Professional type**

```ts
// packages/web/src/types/index.ts  (only the Professional type — leave the rest unchanged)
export type Professional = {
  id: string
  tenantId: string
  userId: string
  bio: string | null
  avatarUrl: string | null
  position: string | null      // ← new: Cargo
  active: boolean
  name: string
  email: string
  phone: string | null
  role: string                 // ← new: user_role from users table
}
```

- [ ] **Step 2: Expand useProfessionals.ts with all mutations**

```ts
// packages/web/src/hooks/useProfessionals.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'
import type { Professional } from '@/types'

export function useProfessionals() {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<Professional[]>({
    queryKey: ['professionals', slug],
    queryFn: async () => (await api('/professionals')).json(),
  })
}

export function useProfessional(id: string) {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<Professional>({
    queryKey: ['professional', slug, id],
    enabled: !!id,
    queryFn: async () => (await api(`/professionals/${id}`)).json(),
  })
}

export function useMyProfessionalProfile() {
  const api = useApi()
  const { slug } = useTenant()
  return useQuery<Professional>({
    queryKey: ['professional-me', slug],
    queryFn: async () => (await api('/professionals/me')).json(),
  })
}

export function useCreateProfessional() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (body: {
      name: string; email: string; password: string;
      position?: string; bio?: string; avatarUrl?: string;
    }) => api('/professionals', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professionals', slug] }),
  })
}

export function useUpdateProfessional(id: string) {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (body: {
      name?: string; bio?: string; avatarUrl?: string;
      position?: string; active?: boolean; role?: string;
    }) => api(`/professionals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professional', slug, id] })
      queryClient.invalidateQueries({ queryKey: ['professionals', slug] })
      queryClient.invalidateQueries({ queryKey: ['professional-me', slug] })
    },
  })
}

export function useDeleteProfessional() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (id: string) => api(`/professionals/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professionals', slug] }),
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/types/index.ts packages/web/src/hooks/useProfessionals.ts
git commit -m "feat(web): add position/role to Professional type and expand professionals hooks"
```

---

## Task 7: Frontend — Sidebar update

**Files:**
- Modify: `packages/web/src/components/AppShell/Sidebar.tsx`

- [ ] **Step 1: Add UserIcon and update NAV_ITEMS**

Replace the `NAV_ITEMS` constant and add a `UserIcon` component. The professional sees "Meu perfil" instead of the full listing.

```ts
// In Sidebar.tsx — add this icon component alongside the others:
function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

// Replace NAV_ITEMS:
const NAV_ITEMS: NavItem[] = [
  { label: 'Agendamentos', href: '/appointments',   icon: <CalendarIcon />, roles: ['tenant_admin', 'professional', 'client'] },
  { label: 'Clientes',     href: '/clients',        icon: <UsersIcon />,    roles: ['tenant_admin', 'professional'] },
  { label: 'Profissionais',href: '/professionals',   icon: <BriefcaseIcon />,roles: ['tenant_admin'] },
  { label: 'Meu perfil',   href: '/professionals/me',icon: <UserIcon />,     roles: ['professional'] },
]
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/AppShell/Sidebar.tsx
git commit -m "feat(web): add 'Meu perfil' sidebar item for professional role"
```

---

## Task 8: Frontend — Professionals listing page

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/page.tsx`
- Modify: `packages/web/src/components/AppShell/Header.tsx` (add /professionals/new title)

- [ ] **Step 1: Rewrite the listing page**

```tsx
// packages/web/src/app/(tenant)/(app)/professionals/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useProfessionals, useDeleteProfessional } from '@/hooks/useProfessionals'
import type { Professional } from '@/types'

function avatar(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}
const COLORS = ['#6366f1','#8b5cf6','#ec4899','#06b6d4','#10b981','#f59e0b']
function pickColor(str: string) {
  let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}

export default function ProfessionalsPage() {
  const router = useRouter()
  const { data: professionals = [], isLoading } = useProfessionals()
  const del = useDeleteProfessional()

  function handleDelete(prof: Professional) {
    if (!confirm(`Excluir ${prof.name}? Esta ação não pode ser desfeita.`)) return
    del.mutate(prof.id)
  }

  return (
    <>
      <style>{`
        .prof-row:hover { background: #f9fafb; }
        .name-link { color: #111827; font-weight: 600; text-decoration: none; cursor: pointer; background: none; border: none; padding: 0; font-family: var(--font-inter, Inter, sans-serif); font-size: 13.5px; }
        .name-link:hover { color: #6366f1; text-decoration: underline; }
        .del-btn { padding: 5px 12px; border: 1px solid #fecaca; background: #fff; color: #dc2626; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: background 0.12s; font-family: var(--font-inter, Inter, sans-serif); }
        .del-btn:hover { background: #fef2f2; }
        .del-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .new-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 13.5px; font-weight: 600; cursor: pointer; transition: background 0.15s, transform 0.1s; font-family: var(--font-inter, Inter, sans-serif); }
        .new-btn:hover { background: #4f46e5; transform: translateY(-1px); }
      `}</style>

      <div style={{ maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            {professionals.length} profissional{professionals.length !== 1 ? 'is' : ''} cadastrado{professionals.length !== 1 ? 's' : ''}
          </p>
          <button className="new-btn" onClick={() => router.push('/professionals/new')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Cadastrar profissional
          </button>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {isLoading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Carregando...</div>
          ) : !professionals.length ? (
            <div style={{ padding: '64px 32px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>Nenhum profissional</p>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Clique em "Cadastrar profissional" para adicionar.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {['Profissional', 'Cargo', 'Função', 'Status', 'Ações'].map(col => (
                    <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {professionals.map((prof: Professional) => (
                  <tr key={prof.id} className="prof-row" style={{ borderBottom: '1px solid #f9fafb', transition: 'background 0.1s' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: pickColor(prof.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {avatar(prof.name)}
                        </div>
                        <div>
                          <button className="name-link" onClick={() => router.push(`/professionals/${prof.id}`)}>
                            {prof.name}
                          </button>
                          <p style={{ margin: '1px 0 0', fontSize: 12, color: '#9ca3af' }}>{prof.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>{prof.position ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                      {prof.role === 'tenant_admin' ? 'Administrador' : 'Profissional'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: prof.active ? '#dcfce7' : '#f3f4f6', color: prof.active ? '#166534' : '#6b7280', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: prof.active ? '#16a34a' : '#9ca3af', flexShrink: 0 }}/>
                        {prof.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button className="del-btn" onClick={() => handleDelete(prof)} disabled={del.isPending && del.variables === prof.id}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Add header title for /professionals/new**

In `packages/web/src/components/AppShell/Header.tsx`, add to `PAGE_TITLES`:

```ts
'/professionals':       'Profissionais',
'/professionals/new':   'Novo profissional',
'/professionals/me':    'Meu perfil',
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/professionals/page.tsx packages/web/src/components/AppShell/Header.tsx
git commit -m "feat(web): professionals listing with Create button and delete action"
```

---

## Task 9: Frontend — New professional form

**Files:**
- Create: `packages/web/src/app/(tenant)/(app)/professionals/new/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// packages/web/src/app/(tenant)/(app)/professionals/new/page.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useRouter } from 'next/navigation'
import { useCreateProfessional } from '@/hooks/useProfessionals'

const schema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  email:     z.string().email('E-mail inválido'),
  password:  z.string().min(8, 'Mínimo 8 caracteres'),
  position:  z.string().optional(),
  bio:       z.string().optional(),
})
type FormData = z.infer<typeof schema>

const inputStyle = (focused: boolean, hasError: boolean): React.CSSProperties => ({
  width: '100%', height: 42, padding: '0 12px', fontSize: 14,
  color: '#111827', background: '#fff', outline: 'none', boxSizing: 'border-box',
  border: `1px solid ${hasError ? '#ef4444' : focused ? '#6366f1' : '#e5e7eb'}`,
  borderRadius: 8,
  boxShadow: focused && !hasError ? '0 0 0 3px rgba(99,102,241,0.10)' : 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
})

export default function NewProfessionalPage() {
  const router = useRouter()
  const create = useCreateProfessional()
  const [focused, setFocused] = useState<Record<string, boolean>>({})
  const focus = (k: string) => setFocused(p => ({ ...p, [k]: true }))
  const blur  = (k: string) => setFocused(p => ({ ...p, [k]: false }))

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await create.mutateAsync(data)
      router.push('/professionals')
    } catch {
      setError('root', { message: 'Não foi possível cadastrar. Verifique os dados e tente novamente.' })
    }
  }

  const field = (key: keyof FormData) => ({
    ...register(key),
    onFocus: () => focus(key),
    onBlur:  () => blur(key),
    style: inputStyle(!!focused[key], !!errors[key]),
  })

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .save-btn { width: 100%; height: 42px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s, transform 0.1s; font-family: var(--font-inter, Inter, sans-serif); display: flex; align-items: center; justify-content: center; gap: 8px; }
        .save-btn:hover:not(:disabled) { background: #4f46e5; transform: translateY(-1px); }
        .save-btn:disabled { opacity: 0.65; cursor: not-allowed; }
      `}</style>

      <div style={{ maxWidth: 560 }}>
        <button onClick={() => router.push('/professionals')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 20px', fontFamily: 'var(--font-inter, Inter, sans-serif)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Voltar para profissionais
        </button>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '28px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 24px' }}>Dados do profissional</h2>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {[
              { key: 'name',     label: 'Nome completo',  type: 'text',     required: true },
              { key: 'email',    label: 'E-mail',         type: 'email',    required: true },
              { key: 'password', label: 'Senha inicial',  type: 'password', required: true },
              { key: 'position', label: 'Cargo',          type: 'text',     required: false },
            ].map(({ key, label, type, required }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
                </label>
                <input id={key} type={type} {...field(key as keyof FormData)} />
                {errors[key as keyof FormData] && (
                  <p style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444' }}>
                    {errors[key as keyof FormData]?.message}
                  </p>
                )}
              </div>
            ))}

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Observações</label>
              <textarea
                {...register('bio')}
                onFocus={() => focus('bio')}
                onBlur={() => blur('bio')}
                rows={3}
                style={{ ...inputStyle(!!focused['bio'], false), height: 'auto', padding: '10px 12px', resize: 'vertical' }}
              />
            </div>

            {errors.root && (
              <div style={{ marginBottom: 16, padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#b91c1c' }}>
                {errors.root.message}
              </div>
            )}

            <button type="submit" className="save-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.75s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Salvando...</>
              ) : 'Cadastrar profissional'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/professionals/new/page.tsx
git commit -m "feat(web): new professional creation form"
```

---

## Task 10: Frontend — Professional detail/edit page

**Files:**
- Create: `packages/web/src/app/(tenant)/(app)/professionals/[id]/page.tsx`

- [ ] **Step 1: Create the detail/edit page**

This page matches the Metronic user detail pattern: header with avatar/name/email, profile card with fields, edit modal, and danger zone (admin only).

```tsx
// packages/web/src/app/(tenant)/(app)/professionals/[id]/page.tsx
'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useProfessional, useUpdateProfessional, useDeleteProfessional } from '@/hooks/useProfessionals'

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}
const COLORS = ['#6366f1','#8b5cf6','#ec4899','#06b6d4','#10b981','#f59e0b']
function pickColor(str: string) {
  let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}

const ROLE_LABELS: Record<string, string> = { tenant_admin: 'Administrador', professional: 'Profissional', client: 'Cliente' }

type EditForm = { name: string; position: string; bio: string; active: boolean; role: string }

export default function ProfessionalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const isAdmin = me?.role === 'tenant_admin'

  const { data: prof, isLoading } = useProfessional(id)
  const update = useUpdateProfessional(id)
  const del    = useDeleteProfessional()

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openModal() {
    if (!prof) return
    setForm({ name: prof.name, position: prof.position ?? '', bio: prof.bio ?? '', active: prof.active, role: prof.role })
    setError('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form) return
    setSaving(true)
    setError('')
    try {
      const patch: Record<string, unknown> = {
        name: form.name,
        position: form.position || undefined,
        bio: form.bio || undefined,
      }
      if (isAdmin) { patch.active = form.active; patch.role = form.role }
      await update.mutateAsync(patch)
      setModalOpen(false)
    } catch {
      setError('Não foi possível salvar as alterações.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!prof) return
    if (!confirm(`Excluir ${prof.name}? Esta ação não pode ser desfeita.`)) return
    await del.mutateAsync(prof.id)
    router.push('/professionals')
  }

  const inputCls: React.CSSProperties = {
    width: '100%', height: 40, padding: '0 10px', fontSize: 14,
    border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none',
    fontFamily: 'var(--font-inter, Inter, sans-serif)', color: '#111827',
    boxSizing: 'border-box',
  }

  if (isLoading) {
    return <div style={{ padding: 48, color: '#9ca3af', fontSize: 14 }}>Carregando...</div>
  }
  if (!prof) {
    return <div style={{ padding: 48, color: '#9ca3af', fontSize: 14 }}>Profissional não encontrado.</div>
  }

  const canDelete = isAdmin && prof.userId !== me?.id

  return (
    <>
      <style>{`
        .field-row { display: flex; padding: 14px 0; border-bottom: 1px solid #f3f4f6; font-size: 13.5px; }
        .field-row:last-child { border-bottom: none; }
        .field-label { width: 180px; color: #6b7280; flex-shrink: 0; }
        .field-value { color: #111827; font-weight: 500; }
        .edit-btn { padding: 8px 18px; border: 1px solid #e5e7eb; background: #fff; color: #374151; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.12s; font-family: var(--font-inter, Inter, sans-serif); }
        .edit-btn:hover { background: #f9fafb; }
        .del-btn { padding: 8px 18px; background: #dc2626; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s; font-family: var(--font-inter, Inter, sans-serif); }
        .del-btn:hover { background: #b91c1c; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 50; }
        .modal-box { background: #fff; border-radius: 12px; padding: 28px; width: 100%; max-width: 480px; box-shadow: 0 20px 60px rgba(0,0,0,0.18); }
        .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
        .cancel-btn { padding: 9px 18px; border: 1px solid #e5e7eb; background: #fff; color: '#374151'; border-radius: 8px; font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: var(--font-inter, Inter, sans-serif); }
        .save-btn { padding: 9px 20px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 13.5px; font-weight: 600; cursor: pointer; transition: background 0.15s; font-family: var(--font-inter, Inter, sans-serif); }
        .save-btn:hover:not(:disabled) { background: #4f46e5; }
        .save-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .back-btn { display: flex; align-items: center; gap: 6px; font-size: 13px; color: '#6b7280'; font-weight: 500; background: none; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; padding: 7px 14px; font-family: var(--font-inter, Inter, sans-serif); transition: background 0.12s; }
        .back-btn:hover { background: #f9fafb; }
      `}</style>

      <div style={{ maxWidth: 800 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 2px' }}>
              Profissionais &rsaquo; {prof.name}
            </p>
          </div>
          {isAdmin && (
            <button className="back-btn" onClick={() => router.push('/professionals')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              Voltar para profissionais
            </button>
          )}
        </div>

        {/* Identity header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: pickColor(prof.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
            {initials(prof.name)}
          </div>
          <div>
            <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 700, color: '#111827' }}>{prof.name}</h2>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>{prof.email}</p>
            <code style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '2px 8px', borderRadius: 4 }}>
              ID: {prof.id}
            </code>
          </div>
        </div>

        {/* Profile card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '8px 24px 24px', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="field-row"><span className="field-label">Nome</span><span className="field-value">{prof.name}</span></div>
          <div className="field-row"><span className="field-label">Cargo</span><span className="field-value">{prof.position || '—'}</span></div>
          <div className="field-row"><span className="field-label">Observações</span><span className="field-value" style={{ whiteSpace: 'pre-wrap' }}>{prof.bio || '—'}</span></div>
          {isAdmin && (
            <>
              <div className="field-row">
                <span className="field-label">Função</span>
                <span className="field-value">{ROLE_LABELS[prof.role] ?? prof.role}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Status</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: prof.active ? '#dcfce7' : '#f3f4f6', color: prof.active ? '#166534' : '#6b7280', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: prof.active ? '#16a34a' : '#9ca3af' }}/>
                  {prof.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </>
          )}
          <div style={{ marginTop: 20 }}>
            <button className="edit-btn" onClick={openModal}>Editar detalhes</button>
          </div>
        </div>

        {/* Danger zone — admin only, not for own account */}
        {canDelete && (
          <div style={{ marginTop: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', margin: '0 0 12px' }}>Zona de perigo</h3>
            <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 6px' }}>Excluir profissional</p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Esta ação excluirá permanentemente o profissional e todos os seus dados. Não pode ser desfeita.</p>
              <button className="del-btn" onClick={handleDelete} disabled={del.isPending}>
                {del.isPending ? 'Excluindo...' : 'Excluir profissional'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {modalOpen && form && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div className="modal-box">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Editar detalhes</h3>

            {[
              { key: 'name',     label: 'Nome',       type: 'text' },
              { key: 'position', label: 'Cargo',      type: 'text' },
            ].map(({ key, label, type }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>{label}</label>
                <input
                  type={type}
                  value={form[key as keyof EditForm] as string}
                  onChange={e => setForm(f => f ? { ...f, [key]: e.target.value } : f)}
                  style={inputCls}
                />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Observações</label>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => f ? { ...f, bio: e.target.value } : f)}
                rows={3}
                style={{ ...inputCls, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
              />
            </div>

            {isAdmin && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Função</label>
                  <select value={form.role} onChange={e => setForm(f => f ? { ...f, role: e.target.value } : f)} style={{ ...inputCls, cursor: 'pointer' }}>
                    <option value="professional">Profissional</option>
                    <option value="tenant_admin">Administrador</option>
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Status</label>
                  <select value={form.active ? 'true' : 'false'} onChange={e => setForm(f => f ? { ...f, active: e.target.value === 'true' } : f)} style={{ ...inputCls, cursor: 'pointer' }}>
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </>
            )}

            {error && <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 12px' }}>{error}</p>}

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="save-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/professionals/\[id\]/page.tsx
git commit -m "feat(web): professional detail/edit page with modal and danger zone"
```

---

## Task 11: Frontend — /professionals/me redirect

**Files:**
- Create: `packages/web/src/app/(tenant)/(app)/professionals/me/page.tsx`

- [ ] **Step 1: Create the redirect page**

```tsx
// packages/web/src/app/(tenant)/(app)/professionals/me/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMyProfessionalProfile } from '@/hooks/useProfessionals'

export default function MeRedirectPage() {
  const router = useRouter()
  const { data: prof, isLoading } = useMyProfessionalProfile()

  useEffect(() => {
    if (prof) {
      router.replace(`/professionals/${prof.id}`)
    }
  }, [prof, router])

  if (isLoading || !prof) {
    return <div style={{ padding: 48, color: '#9ca3af', fontSize: 14 }}>Carregando perfil...</div>
  }
  return null
}
```

- [ ] **Step 2: Build and restart**

```bash
docker compose build web && docker compose up -d web
docker compose logs web --tail=5
```

Expected: `✓ Ready` with no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/(tenant)/(app)/professionals/me/page.tsx
git commit -m "feat(web): /professionals/me redirects to own professional profile"
```

---

## Task 12: Update CLAUDE.md documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add professionals module rules to CLAUDE.md**

Add this section to the "Arquitetura" part of CLAUDE.md:

```markdown
### Módulo de Profissionais — regras de acesso

| Endpoint | tenant_admin | professional |
|---|---|---|
| GET /professionals | ✅ lista todos | ❌ |
| GET /professionals/me | ✅ | ✅ (próprio perfil) |
| GET /professionals/:id | ✅ qualquer | ✅ somente o próprio |
| POST /professionals | ✅ | ❌ |
| PATCH /professionals/:id | ✅ todos os campos | ✅ somente o próprio, sem `active`/`role` |
| DELETE /professionals/:id | ✅ exceto si mesmo | ❌ |

Campos do profissional:
- `name`, `email` → tabela `users`
- `bio` (Observações), `avatarUrl`, `position` (Cargo), `active` (Status) → tabela `professionals`
- `role` (Função) → tabela `users`; somente admin pode alterar

Criação de profissional (`POST /professionals`) provisiona um `users` record com `role='professional'` e um `professionals` record na mesma transação.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document professionals module access rules"
```

---

## Self-Review

**Spec coverage:**
- ✅ Campos: Nome, Avatar, Cargo (position), Observações (bio), Função (role), Status (active)
- ✅ Apenas admin edita Função e Status → enforced in service.update
- ✅ Apenas admin acessa listagem → `@Roles('tenant_admin')` on GET /professionals
- ✅ Apenas admin pode cadastrar, excluir e editar profissionais que não é ele → create is admin-only; remove guards self-deletion; update allows professional to edit own
- ✅ Profissional logado vê e edita seu próprio perfil → GET /me + PATCH /:id
- ✅ Na listagem: coluna Ações com excluir → Task 8
- ✅ Na listagem: nome clicável → router.push(`/professionals/${prof.id}`)
- ✅ Botão "Cadastrar" acima da listagem → Task 8
- ✅ Tela de visualização/edição estilo Metronic → Task 10 (header, profile card, edit modal, danger zone)

**Placeholder scan:** No TBDs or TODOs found.

**Type consistency:**
- `Professional` type includes `position`, `role`, `name`, `email`, `phone`, `bio`, `avatarUrl`, `active`, `id`, `tenantId`, `userId` — used consistently across all tasks.
- `useUpdateProfessional(id)` called with `id` string parameter throughout.
- `PROF_FIELDS` object used consistently in service for all select queries.
