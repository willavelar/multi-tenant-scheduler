# Admins Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralizar `active`/`avatarUrl` na tabela `users`, criar o módulo `Admins` com endpoint paginado, e adicionar a tela "Administradores" no menu lateral.

**Architecture:** `active` e `avatarUrl` saem de `client_profiles` e `professionals` e vão para `users`. Um novo `AdminsModule` expõe `GET /admins` (somente `tenant_admin`). O frontend replica o padrão visual de clientes com os campos solicitados.

**Tech Stack:** NestJS, Drizzle ORM, PostgreSQL (RLS), Next.js 16 App Router, TanStack Query, Tailwind CSS.

---

## File Map

**Shared schema (source of truth for push:pg):**
- Modify: `packages/shared/src/schema/users.schema.ts` — adiciona `active`, `avatarUrl`
- Modify: `packages/shared/src/schema/client-profiles.schema.ts` — remove `active`, `avatarUrl`
- Modify: `packages/shared/src/schema/professionals.schema.ts` — remove `active`, `avatarUrl`

**Migration SQL (documentação; banco usa push:pg):**
- Modify: `packages/api/migrations/0000_nifty_tyger_tiger.sql`
- Modify: `packages/api/migrations/0001_amused_cyclops.sql`
- Modify: `packages/api/migrations/0003_third_rage.sql`

**Seed:**
- Modify: `packages/api/seeds/seed.ts`

**API — serviços existentes:**
- Modify: `packages/api/src/professionals/professionals.service.ts`
- Modify: `packages/api/src/clients/clients.service.ts`
- Modify: `packages/api/src/appointments/appointments.service.ts`
- Modify: `packages/api/src/auth/auth.service.ts`

**API — novo módulo:**
- Create: `packages/api/src/admins/admins.service.ts`
- Create: `packages/api/src/admins/admins.controller.ts`
- Create: `packages/api/src/admins/admins.module.ts`
- Modify: `packages/api/src/app.module.ts`

**Frontend:**
- Modify: `packages/web/src/types/index.ts`
- Create: `packages/web/src/hooks/useAdmins.ts`
- Modify: `packages/web/src/components/AppShell/Sidebar.tsx`
- Create: `packages/web/src/app/(tenant)/(app)/admins/page.tsx`

---

## Task 1: Atualizar schema TypeScript

**Files:**
- Modify: `packages/shared/src/schema/users.schema.ts`
- Modify: `packages/shared/src/schema/client-profiles.schema.ts`
- Modify: `packages/shared/src/schema/professionals.schema.ts`

- [ ] **Substituir `users.schema.ts` completo:**

```ts
import { boolean, pgEnum, pgTable, text, timestamp, uuid, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';

export const roleEnum = pgEnum('user_role', ['super_admin', 'tenant_admin', 'professional', 'client']);

export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  email:        text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  role:         roleEnum('role').notNull(),
  name:         text('name').notNull(),
  phone:        text('phone'),
  active:       boolean('active').notNull().default(true),
  avatarUrl:    text('avatar_url'),
  lastLoginAt:  timestamp('last_login_at'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqueEmailPerTenant: unique('users_tenant_email_unique').on(table.tenantId, table.email),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

- [ ] **Substituir `client-profiles.schema.ts` completo** (remove `active` e `avatarUrl`):

```ts
import { boolean, date, integer, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';
import { users } from './users.schema';

export const serviceLimitPeriodEnum = pgEnum('service_limit_period', ['day', 'week', 'month']);

export const clientProfiles = pgTable('client_profiles', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  tenantId:           uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId:             uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  birthDate:          date('birth_date'),
  notes:              text('notes'),
  allProfessionals:   boolean('all_professionals').notNull().default(false),
  allServices:        boolean('all_services').notNull().default(false),
  serviceLimitCount:  integer('service_limit_count'),
  serviceLimitPeriod: serviceLimitPeriodEnum('service_limit_period'),
});

export type ClientProfile = typeof clientProfiles.$inferSelect;
export type NewClientProfile = typeof clientProfiles.$inferInsert;
```

- [ ] **Substituir `professionals.schema.ts` completo** (remove `active` e `avatarUrl`):

```ts
import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';
import { users } from './users.schema';

export const professionals = pgTable('professionals', {
  id:       uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId:   uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bio:      text('bio'),
  position: text('position'),
});

export type Professional = typeof professionals.$inferSelect;
export type NewProfessional = typeof professionals.$inferInsert;
```

- [ ] **Commit:**

```bash
git add packages/shared/src/schema/
git commit -m "feat: move active and avatarUrl to users table"
```

---

## Task 2: Atualizar migrations SQL e seed

**Files:**
- Modify: `packages/api/migrations/0000_nifty_tyger_tiger.sql`
- Modify: `packages/api/migrations/0001_amused_cyclops.sql`
- Modify: `packages/api/migrations/0003_third_rage.sql`
- Modify: `packages/api/seeds/seed.ts`

- [ ] **Editar `0000_nifty_tyger_tiger.sql` — tabela `users`: adicionar `active` e `avatar_url`**

Localizar o bloco `CREATE TABLE IF NOT EXISTS "users"` e substituir por:

```sql
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"active" boolean DEFAULT true NOT NULL,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_tenant_email_unique" UNIQUE("tenant_id","email")
);
```

- [ ] **Editar `0000_nifty_tyger_tiger.sql` — tabela `professionals`: remover `avatar_url` e `active`**

Localizar o bloco `CREATE TABLE IF NOT EXISTS "professionals"` e substituir por:

```sql
CREATE TABLE IF NOT EXISTS "professionals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"bio" text
);
```

- [ ] **Editar `0001_amused_cyclops.sql` — remover coluna `active` de `client_profiles`**

Localizar o bloco `CREATE TABLE IF NOT EXISTS "client_profiles"` e substituir por (sem a linha `"active"`):

```sql
CREATE TABLE IF NOT EXISTS "client_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"birth_date" date,
	"notes" text,
	"all_professionals" boolean DEFAULT false NOT NULL,
	"service_limit_count" integer,
	"service_limit_period" "service_limit_period"
);
```

- [ ] **Substituir `0003_third_rage.sql` inteiro** (era ADD COLUMN avatar_url em client_profiles — movido para users):

```sql
-- avatar_url moved to users table (see 0000 migration)
```

- [ ] **Atualizar `seeds/seed.ts` — mover `active` e `avatarUrl` dos inserts de perfil para users**

Substituir o bloco de insert de professionals (linhas ~76-96):

```ts
  for (const p of profData) {
    const slug = p.name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
    const [u] = await db.insert(schema.users).values({
      tenantId: tenant.id,
      email: `${slug}@clinica-demo.com`,
      passwordHash,
      role: 'professional',
      name: p.name,
      phone: faker.phone.number(),
      active: true,
    }).returning();

    const [prof] = await db.insert(schema.professionals).values({
      tenantId: tenant.id,
      userId: u.id,
      bio: p.bio,
      position: p.position,
    }).returning();

    profUsers.push(u);
    profs.push(prof);
    console.log('Professional:', u.name);
  }
```

Substituir o bloco de insert de clients (linhas ~143-158):

```ts
    const [u] = await db.insert(schema.users).values({
      tenantId: tenant.id,
      email,
      passwordHash,
      role: 'client',
      name,
      phone: faker.phone.number(),
      active: faker.datatype.boolean({ probability: 0.85 }),
    }).returning();

    await db.insert(schema.clientProfiles).values({
      tenantId: tenant.id,
      userId: u.id,
      birthDate: faker.date.birthdate({ min: 18, max: 75, mode: 'age' }).toISOString().slice(0, 10),
    });
```

- [ ] **Aplicar schema e resetar dados:**

```bash
# Dentro do container ou com pnpm --filter api
pnpm db:migrate
pnpm db:seed
```

Saída esperada: tabelas alteradas, seed completo com "Seed complete!".

- [ ] **Commit:**

```bash
git add packages/api/migrations/ packages/api/seeds/seed.ts
git commit -m "chore: update migrations and seed for active/avatarUrl on users"
```

---

## Task 3: Atualizar `professionals.service.ts`

**Files:**
- Modify: `packages/api/src/professionals/professionals.service.ts`

- [ ] **Atualizar `PROF_FIELDS`** — `avatarUrl` e `active` agora vêm de `users`:

```ts
const PROF_FIELDS = {
  id:          professionals.id,
  tenantId:    professionals.tenantId,
  userId:      professionals.userId,
  bio:         professionals.bio,
  avatarUrl:   users.avatarUrl,
  position:    professionals.position,
  active:      users.active,
  name:        users.name,
  email:       users.email,
  phone:       users.phone,
  role:        users.role,
  lastLoginAt: users.lastLoginAt,
  createdAt:   users.createdAt,
};
```

- [ ] **Atualizar `findAll()`** — filtro `active` aponta para `users.active`:

Substituir as linhas do filtro active:
```ts
        filters.active === 'true'  ? eq(users.active, true)  : undefined,
        filters.active === 'false' ? eq(users.active, false) : undefined,
```

- [ ] **Atualizar `create()`** — `avatarUrl` vai para o insert de `users`; remove do insert de `professionals`:

```ts
  async create(dto: CreateProfessionalDto, tenantId: string) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return withTenant(this.db, tenantId, async (tx) => {
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, dto.email), eq(users.tenantId, tenantId)));
      if (existing) throw new ConflictException('Email already in use');

      const [user] = await tx.insert(users).values({
        tenantId,
        email: dto.email,
        passwordHash,
        role: 'professional',
        name: dto.name,
        avatarUrl: dto.avatarUrl,
      }).returning();

      const [prof] = await tx.insert(professionals).values({
        tenantId,
        userId: user.id,
        bio: dto.bio,
        position: dto.position,
      }).returning();

      return {
        ...prof,
        name: user.name,
        email: user.email,
        phone: null,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
        active: user.active,
        lastLoginAt: null,
        createdAt: user.createdAt,
      };
    });
  }
```

- [ ] **Atualizar `update()`** — `avatarUrl` e `active` movidos para `userPatch`:

Substituir os dois blocos de patch:

```ts
      // Update users table (name, role, avatarUrl, active)
      const userPatch: Record<string, unknown> = {};
      if (dto.name      !== undefined) userPatch.name      = dto.name;
      if (dto.role      !== undefined && isAdmin) userPatch.role = dto.role;
      if (dto.avatarUrl !== undefined) userPatch.avatarUrl = dto.avatarUrl;
      if (dto.active    !== undefined && isAdmin) userPatch.active = dto.active;
      if (Object.keys(userPatch).length) {
        await tx.update(users).set(userPatch).where(eq(users.id, prof.userId));
      }

      // Update professionals table (bio, position only)
      const profPatch: Record<string, unknown> = {};
      if (dto.bio      !== undefined) profPatch.bio      = dto.bio;
      if (dto.position !== undefined) profPatch.position = dto.position;
      if (Object.keys(profPatch).length) {
        await tx.update(professionals).set(profPatch)
          .where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId)));
      }
```

- [ ] **Verificar compilação TypeScript:**

```bash
cd packages/api && npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Commit:**

```bash
git add packages/api/src/professionals/professionals.service.ts
git commit -m "refactor: source avatarUrl and active from users in professionals service"
```

---

## Task 4: Atualizar `clients.service.ts`

**Files:**
- Modify: `packages/api/src/clients/clients.service.ts`

- [ ] **Atualizar `findAll()`** — campo `active` e `avatarUrl` de `users`; filtro `active` em `users.active`:

Substituir o bloco `const FIELDS` dentro de `findAll`:

```ts
      const FIELDS = {
        id:                 users.id,
        name:               users.name,
        email:              users.email,
        phone:              users.phone,
        lastLoginAt:        users.lastLoginAt,
        createdAt:          users.createdAt,
        profileId:          clientProfiles.id,
        birthDate:          clientProfiles.birthDate,
        notes:              clientProfiles.notes,
        active:             users.active,
        avatarUrl:          users.avatarUrl,
        allProfessionals:   clientProfiles.allProfessionals,
        allServices:        clientProfiles.allServices,
        serviceLimitCount:  clientProfiles.serviceLimitCount,
        serviceLimitPeriod: clientProfiles.serviceLimitPeriod,
      };
```

Substituir as linhas de filtro active em `findAll`:

```ts
        filters.active === 'true'  ? eq(users.active, true)  : undefined,
        filters.active === 'false' ? eq(users.active, false) : undefined,
```

- [ ] **Atualizar `findOne()`** — mesmo ajuste no select inline:

Substituir as linhas `active` e `avatarUrl` no `.select({...})` de `findOne`:

```ts
          active:             users.active,
          avatarUrl:          users.avatarUrl,
```

- [ ] **Atualizar `create()`** — `active` e `avatarUrl` vão para o insert de `users`; removidos de `clientProfiles`:

```ts
  async create(dto: CreateClientDto, tenantId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, dto.email), eq(users.tenantId, tenantId)));
      if (existing) throw new ConflictException('Email already in use');

      const passwordHash = await bcrypt.hash(dto.password, 10);

      const [user] = await tx
        .insert(users)
        .values({
          tenantId,
          email: dto.email,
          passwordHash,
          role: 'client',
          name: dto.name,
          phone: dto.phone,
          active: dto.active ?? true,
          avatarUrl: dto.avatarUrl,
        })
        .returning();

      const [profile] = await tx
        .insert(clientProfiles)
        .values({
          tenantId,
          userId: user.id,
          birthDate: dto.birthDate,
          notes: dto.notes,
          allProfessionals: dto.allProfessionals ?? false,
          allServices: dto.allServices ?? false,
          serviceLimitCount: dto.serviceLimitCount,
          serviceLimitPeriod: dto.serviceLimitPeriod,
        })
        .returning();

      if (dto.professionalIds?.length) {
        await tx.insert(clientProfessionals).values(
          dto.professionalIds.map((professionalId) => ({ tenantId, clientProfileId: profile.id, professionalId })),
        );
      }

      if (dto.serviceIds?.length) {
        await tx.insert(clientServices).values(
          dto.serviceIds.map((serviceId) => ({ tenantId, clientProfileId: profile.id, serviceId })),
        );
      }

      return { id: user.id };
    });
  }
```

- [ ] **Atualizar `update()`** — `active` e `avatarUrl` movidos para `userPatch`; removidos de `profilePatch`; remover `active: true` do insert do profile no upsert:

```ts
  async update(userId: string, dto: UpdateClientDto, tenantId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId), eq(users.role, 'client')));
      if (!user) throw new NotFoundException('Client not found');

      const userPatch: Partial<typeof users.$inferInsert> = {};
      if (dto.name      !== undefined) userPatch.name      = dto.name;
      if (dto.email     !== undefined) userPatch.email     = dto.email;
      if (dto.phone     !== undefined) userPatch.phone     = dto.phone;
      if (dto.active    !== undefined) userPatch.active    = dto.active;
      if (dto.avatarUrl !== undefined) userPatch.avatarUrl = dto.avatarUrl;
      if (Object.keys(userPatch).length) {
        await tx.update(users).set(userPatch).where(eq(users.id, userId));
      }

      const profilePatch: Partial<typeof clientProfiles.$inferInsert> = {};
      if (dto.birthDate          !== undefined) profilePatch.birthDate          = dto.birthDate;
      if (dto.notes              !== undefined) profilePatch.notes              = dto.notes;
      if (dto.allProfessionals   !== undefined) profilePatch.allProfessionals   = dto.allProfessionals;
      if (dto.allServices        !== undefined) profilePatch.allServices        = dto.allServices;
      if (dto.serviceLimitCount  !== undefined) profilePatch.serviceLimitCount  = dto.serviceLimitCount;
      if (dto.serviceLimitPeriod !== undefined) profilePatch.serviceLimitPeriod = dto.serviceLimitPeriod;

      const [existingProfile] = await tx
        .select({ id: clientProfiles.id })
        .from(clientProfiles)
        .where(eq(clientProfiles.userId, userId));

      let profileId: string;
      if (existingProfile) {
        if (Object.keys(profilePatch).length) {
          await tx.update(clientProfiles).set(profilePatch).where(eq(clientProfiles.id, existingProfile.id));
        }
        profileId = existingProfile.id;
      } else {
        const [p] = await tx
          .insert(clientProfiles)
          .values({ tenantId, userId, ...profilePatch })
          .returning();
        profileId = p.id;
      }

      if (dto.professionalIds !== undefined) {
        await tx.delete(clientProfessionals).where(eq(clientProfessionals.clientProfileId, profileId));
        if (dto.professionalIds.length) {
          await tx.insert(clientProfessionals).values(
            dto.professionalIds.map((professionalId) => ({ tenantId, clientProfileId: profileId, professionalId })),
          );
        }
      }

      if (dto.serviceIds !== undefined) {
        await tx.delete(clientServices).where(eq(clientServices.clientProfileId, profileId));
        if (dto.serviceIds.length) {
          await tx.insert(clientServices).values(
            dto.serviceIds.map((serviceId) => ({ tenantId, clientProfileId: profileId, serviceId })),
          );
        }
      }

      return { updated: true };
    });
  }
```

- [ ] **Verificar compilação:**

```bash
cd packages/api && npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Commit:**

```bash
git add packages/api/src/clients/clients.service.ts
git commit -m "refactor: source avatarUrl and active from users in clients service"
```

---

## Task 5: Atualizar `appointments.service.ts`

**Files:**
- Modify: `packages/api/src/appointments/appointments.service.ts`

- [ ] **Remover `clientProfiles` dos imports:**

Alterar a linha de import:

```ts
import { appointments, services, tenants, professionals, users } from '@scheduler/shared';
```

- [ ] **Atualizar `FIELDS` em `findAll()`** — usar `users.avatarUrl` e `profUsers.avatarUrl`:

```ts
      const FIELDS = {
        id:                   appointments.id,
        startsAt:             appointments.startsAt,
        endsAt:               appointments.endsAt,
        status:               appointments.status,
        createdAt:            appointments.createdAt,
        professionalId:       appointments.professionalId,
        serviceId:            appointments.serviceId,
        clientId:             appointments.clientId,
        clientName:           users.name,
        clientAvatarUrl:      users.avatarUrl,
        serviceName:          services.name,
        professionalName:     profUsers.name,
        professionalAvatarUrl: profUsers.avatarUrl,
      };
```

- [ ] **Remover o `leftJoin(clientProfiles, ...)` na query `findAll()`:**

Substituir o bloco `.from(appointments)...` removendo a linha do leftJoin:

```ts
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
```

- [ ] **Verificar compilação:**

```bash
cd packages/api && npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Commit:**

```bash
git add packages/api/src/appointments/appointments.service.ts
git commit -m "refactor: source avatarUrl from users in appointments service"
```

---

## Task 6: Atualizar `auth.service.ts`

**Files:**
- Modify: `packages/api/src/auth/auth.service.ts`

- [ ] **Simplificar `validateUser()`** — remover query em `clientProfiles`; checar `user.active` para todos os roles:

```ts
  async validateUser(email: string, password: string, tenantId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.tenantId, tenantId)));

      if (!user) throw new UnauthorizedException();
      if (!await bcrypt.compare(password, user.passwordHash)) throw new UnauthorizedException();
      if (!user.active) throw new UnauthorizedException();

      return user;
    });
  }
```

- [ ] **Atualizar `listClients()`** — `avatarUrl` de `users`; remover `leftJoin(clientProfiles)`:

```ts
  async listClients(tenantId: string, q?: string) {
    return withTenant(this.db, tenantId, (tx) => {
      const base = and(eq(users.tenantId, tenantId), eq(users.role, 'client'));
      const where = q
        ? and(base, or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)))
        : base;
      return tx
        .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, createdAt: users.createdAt, avatarUrl: users.avatarUrl })
        .from(users)
        .where(where)
        .limit(20);
    });
  }
```

- [ ] **Verificar que `clientProfiles` ainda é importado** — ainda é usado em `register()`. Checar que o import está:

```ts
import { users, clientProfiles } from '@scheduler/shared';
```

- [ ] **Verificar compilação:**

```bash
cd packages/api && npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Commit:**

```bash
git add packages/api/src/auth/auth.service.ts
git commit -m "refactor: simplify validateUser and listClients after active/avatarUrl move to users"
```

---

## Task 7: Criar `AdminsModule`

**Files:**
- Create: `packages/api/src/admins/admins.service.ts`
- Create: `packages/api/src/admins/admins.controller.ts`
- Create: `packages/api/src/admins/admins.module.ts`

- [ ] **Criar `admins.service.ts`:**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import { users } from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';

const ADMIN_FIELDS = {
  id:        users.id,
  name:      users.name,
  email:     users.email,
  avatarUrl: users.avatarUrl,
  active:    users.active,
  createdAt: users.createdAt,
};

@Injectable()
export class AdminsService {
  constructor(@Inject(DB) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    page = 1,
    limit = 10,
    filters: { q?: string; active?: string } = {},
  ) {
    const offset = (page - 1) * limit;
    return withTenant(this.db, tenantId, async (tx) => {
      const where = and(
        eq(users.tenantId, tenantId),
        eq(users.role, 'tenant_admin'),
        filters.q
          ? or(ilike(users.name, `%${filters.q}%`), ilike(users.email, `%${filters.q}%`))
          : undefined,
        filters.active === 'true'  ? eq(users.active, true)  : undefined,
        filters.active === 'false' ? eq(users.active, false) : undefined,
      );

      const [{ total }] = await tx.select({ total: count() }).from(users).where(where);
      const data = await tx
        .select(ADMIN_FIELDS)
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      return { data, total, page, limit };
    });
  }
}
```

- [ ] **Criar `admins.controller.ts`:**

```ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('admins')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AdminsController {
  constructor(private readonly service: AdminsService) {}

  @Get()
  @Roles('tenant_admin')
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('active') active?: string,
  ) {
    return this.service.findAll(
      tenantId,
      Math.max(1, parseInt(page ?? '1', 10) || 1),
      Math.min(100, parseInt(limit ?? '10', 10) || 10),
      { q, active },
    );
  }
}
```

- [ ] **Criar `admins.module.ts`:**

```ts
import { Module } from '@nestjs/common';
import { AdminsController } from './admins.controller';
import { AdminsService } from './admins.service';

@Module({
  controllers: [AdminsController],
  providers: [AdminsService],
})
export class AdminsModule {}
```

- [ ] **Registrar em `app.module.ts`** — adicionar `AdminsModule` ao array de `imports`:

```ts
import { AdminsModule } from './admins/admins.module';

// No @Module imports array, adicionar:
AdminsModule,
```

- [ ] **Verificar compilação:**

```bash
cd packages/api && npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Commit:**

```bash
git add packages/api/src/admins/ packages/api/src/app.module.ts
git commit -m "feat: add AdminsModule with paginated GET /admins endpoint"
```

---

## Task 8: Aplicar schema e verificar API

- [ ] **Reconstruir e subir a API:**

```bash
docker compose build api && docker compose up -d api
```

- [ ] **Aplicar migrations e seed:**

```bash
docker compose exec api pnpm --filter api db:migrate
docker compose exec api pnpm --filter api db:seed
```

Esperado: "Seed complete!" sem erros.

- [ ] **Obter token de admin para testes:**

```bash
curl -s -X POST http://localhost:3001/auth/login \
  -H 'Content-Type: application/json' \
  -H 'x-tenant-slug: clinica-demo' \
  -d '{"email":"admin@clinica-demo.com","password":"password123"}' \
  | jq .accessToken
```

Guardar o token retornado como `TOKEN`.

- [ ] **Verificar `GET /admins`:**

```bash
curl -s http://localhost:3001/admins \
  -H 'x-tenant-slug: clinica-demo' \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Esperado: `{ data: [{ id, name, email, avatarUrl, active, createdAt }], total: 1, page: 1, limit: 10 }`.

- [ ] **Verificar `GET /professionals`** — confirmar que `avatarUrl` e `active` ainda aparecem na resposta (agora vêm de `users`):

```bash
curl -s "http://localhost:3001/professionals?page=1" \
  -H 'x-tenant-slug: clinica-demo' \
  -H "Authorization: Bearer $TOKEN" | jq '.data[0] | {name, avatarUrl, active}'
```

Esperado: objeto com `avatarUrl: null` e `active: true`.

- [ ] **Verificar `GET /clients`** — confirmar que `avatarUrl` e `active` ainda aparecem:

```bash
curl -s "http://localhost:3001/clients?page=1" \
  -H 'x-tenant-slug: clinica-demo' \
  -H "Authorization: Bearer $TOKEN" | jq '.data[0] | {name, avatarUrl, active}'
```

Esperado: objeto com `active` booleano.

---

## Task 9: Frontend — tipos e hook

**Files:**
- Modify: `packages/web/src/types/index.ts`
- Create: `packages/web/src/hooks/useAdmins.ts`

- [ ] **Adicionar `Admin` e `AdminPage` em `types/index.ts`** e atualizar `Client.active` para `boolean`:

No fim do arquivo, adicionar:

```ts
export type Admin = {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  active: boolean
  createdAt: string
}

export type AdminPage = {
  data: Admin[]
  total: number
  page: number
  limit: number
}
```

Na definição de `Client`, alterar:

```ts
  active: boolean
```

(era `boolean | null` — agora vem de `users.active NOT NULL`)

- [ ] **Criar `packages/web/src/hooks/useAdmins.ts`:**

```ts
import { useQuery } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useTenant } from '@/providers/TenantProvider'
import type { AdminPage } from '@/types'

type AdminFilters = { q?: string; active?: string }

export function useAdmins(page = 1, filters: AdminFilters = {}) {
  const api = useApi()
  const { slug } = useTenant()
  const params = new URLSearchParams({ page: String(page), limit: '10' })
  if (filters.q)      params.set('q', filters.q)
  if (filters.active) params.set('active', filters.active)
  return useQuery<AdminPage>({
    queryKey: ['admins', slug, page, filters],
    queryFn: async () => (await api(`/admins?${params}`)).json(),
  })
}
```

- [ ] **Commit:**

```bash
git add packages/web/src/types/index.ts packages/web/src/hooks/useAdmins.ts
git commit -m "feat: add Admin types and useAdmins hook"
```

---

## Task 10: Sidebar — adicionar item Administradores

**Files:**
- Modify: `packages/web/src/components/AppShell/Sidebar.tsx`

- [ ] **Adicionar `ShieldIcon`** antes de `type NavItem`:

```tsx
function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-2-8 2v7c0 6 8 10 8 10z"/>
    </svg>
  )
}
```

- [ ] **Adicionar entrada em `NAV_ITEMS`** após o item "Profissionais":

```ts
  { label: 'Administradores', href: '/admins', icon: <ShieldIcon />, roles: ['tenant_admin'] },
```

- [ ] **Commit:**

```bash
git add packages/web/src/components/AppShell/Sidebar.tsx
git commit -m "feat: add Administradores nav item to sidebar"
```

---

## Task 11: Página de Administradores

**Files:**
- Create: `packages/web/src/app/(tenant)/(app)/admins/page.tsx`

- [ ] **Criar `packages/web/src/app/(tenant)/(app)/admins/page.tsx`:**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdmins } from '@/hooks/useAdmins'
import { AvatarName } from '@/components/ui/AvatarName'
import { DateTimeCell } from '@/components/ui/DateTimeCell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Admin } from '@/types'

function AdminStatusBadge({ active }: { active: boolean }) {
  return <StatusBadge label={active ? 'Ativo' : 'Inativo'} variant={active ? 'success' : 'error'} />
}

export default function AdminsPage() {
  const router = useRouter()

  const [page, setPage]     = useState(1)
  const [q, setQ]           = useState('')
  const [active, setActive] = useState('')
  const filters = { q: q || undefined, active: active || undefined }
  const { data, isLoading } = useAdmins(page, filters)

  const admins     = data?.data ?? []
  const total      = data?.total ?? 0
  const limit      = data?.limit ?? 10
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const hasFilters = !!(q || active)

  useEffect(() => { setPage(1) }, [q, active])

  const COLS = ['Nome', 'E-mail', 'Cadastrado Em', 'Status', 'Ações']

  return (
    <div className="w-full">

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 mb-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">

          {/* Search */}
          <div className="relative min-w-[240px] [flex:2_1_240px]">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.05em] mb-1">Busca</label>
            <div className="relative">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Nome ou e-mail…"
                value={q}
                onChange={e => setQ(e.target.value)}
                className="h-9 w-full pl-[30px] pr-3 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
              />
            </div>
          </div>

          {/* Status */}
          <div className="min-w-[160px] [flex:1_1_160px]">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.05em] mb-1">Status</label>
            <div className="relative">
              <select
                value={active}
                onChange={e => setActive(e.target.value)}
                className="h-9 w-full pl-3 pr-8 text-[13px] text-gray-900 bg-white border border-gray-200 rounded-lg appearance-none cursor-pointer outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
              >
                <option value="">Todos</option>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>

          {/* Clear */}
          {hasFilters && (
            <div className="flex items-end">
              <button
                className="h-9 px-3.5 bg-white text-gray-500 border border-gray-200 rounded-lg text-[13px] font-medium cursor-pointer hover:bg-gray-100 hover:text-gray-700 whitespace-nowrap transition-colors"
                onClick={() => { setQ(''); setActive('') }}
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Carregando...</div>
        ) : !admins.length ? (
          <EmptyState
            title="Nenhum administrador"
            description={hasFilters ? 'Nenhum administrador encontrado para os filtros aplicados.' : 'Administradores aparecerão aqui após serem cadastrados.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {COLS.map((col, i) => (
                      <th key={i} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em] whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin: Admin) => (
                    <tr key={admin.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <AvatarName name={admin.name} size={32} avatarUrl={admin.avatarUrl} />
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{admin.email}</td>
                      <td className="px-4 py-3"><DateTimeCell iso={admin.createdAt} /></td>
                      <td className="px-4 py-3">
                        <AdminStatusBadge active={admin.active} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="px-3 py-[5px] border border-indigo-100 bg-white text-indigo-500 rounded-md text-xs font-medium cursor-pointer hover:bg-indigo-50 transition-colors"
                          onClick={() => router.push(`/admins/${admin.id}`)}
                        >
                          Visualizar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-[13px] text-gray-500 m-0">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-md text-[13px] font-medium cursor-pointer hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  onClick={() => setPage(p => p - 1)}
                  disabled={page <= 1}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Anterior
                </button>
                <button
                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-md text-[13px] font-medium cursor-pointer hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages}
                >
                  Próxima
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Commit:**

```bash
git add packages/web/src/app/(tenant)/(app)/admins/
git commit -m "feat: add Administradores listing page"
```

---

## Task 12: Build e verificação final do frontend

- [ ] **Reconstruir o container web:**

```bash
docker compose build web && docker compose up -d web
```

- [ ] **Verificar no browser:**

1. Logar como `admin@clinica-demo.com` / `password123`
2. Menu lateral deve exibir "Administradores" com ícone de escudo
3. Navegar para `/clinica-demo/admins` — deve exibir a tabela com o admin seeded
4. Testar filtro de busca por nome
5. Testar filtro de status
6. Verificar que o botão "Visualizar" existe (pode dar 404 ao clicar — página não criada ainda)
7. Testar paginação com limites de página
8. Logar como professional — "Administradores" não deve aparecer no menu

- [ ] **Verificar que as outras telas não regrediram:**

1. `/clinica-demo/clients` — `active` e `avatarUrl` ainda exibem corretamente
2. `/clinica-demo/professionals` — idem
3. `/clinica-demo/appointments` — avatares de cliente e profissional ainda aparecem
