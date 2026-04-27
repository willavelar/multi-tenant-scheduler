# Service Delete Blocking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bloquear exclusão de serviço quando há agendamentos futuros vinculados, com opção de cancelar todos e excluir.

**Architecture:** Mesmo padrão dos clientes e profissionais: `DELETE /services/:id` retorna 409 com lista de agendamentos bloqueantes; `?cancelFuture=true` cancela todos e deleta em uma transação. O `DangerZone` já suporta `onForceDelete` — apenas precisamos conectar os novos hooks e props.

**Tech Stack:** NestJS (ConflictException, Drizzle ORM), Next.js 16, TanStack Query, Tailwind.

---

## Files

| Ação | Arquivo |
|---|---|
| Modify | `packages/api/src/services/services.service.ts` |
| Create | `packages/api/src/services/services.service.spec.ts` |
| Modify | `packages/api/src/services/services.controller.ts` |
| Modify | `packages/web/src/hooks/useServices.ts` |
| Modify | `packages/web/src/app/(tenant)/(app)/settings/services/_components/ServiceDetailView.tsx` |
| Modify | `packages/web/src/app/(tenant)/(app)/settings/services/[id]/page.tsx` |

---

## Task 1: API — services service blocking check (TDD)

**Files:**
- Modify: `packages/api/src/services/services.service.ts`
- Create: `packages/api/src/services/services.service.spec.ts`

- [ ] **Step 1: Criar o arquivo de testes**

Criar `packages/api/src/services/services.service.spec.ts` com o seguinte conteúdo:

```ts
import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ServicesService } from './services.service';
import { DB } from '../database/database.module';

function makeChainSequence(responses: unknown[]) {
  let call = 0;
  const thenable: Record<string, unknown> = {};
  const methods = [
    'select', 'from', 'innerJoin', 'leftJoin', 'where',
    'insert', 'values', 'returning', 'update', 'set', 'delete',
    'orderBy', 'limit', 'offset',
  ];
  methods.forEach((m) => { thenable[m] = jest.fn().mockReturnValue(thenable); });
  thenable['then'] = jest.fn().mockImplementation((resolve: (v: unknown) => void) => {
    resolve(responses[call] ?? responses[responses.length - 1]);
    call++;
  });
  thenable['execute'] = jest.fn().mockResolvedValue(undefined);
  return thenable;
}

function makeMockDbSequence(responses: unknown[]) {
  const chain = makeChainSequence(responses);
  const db: Record<string, unknown> = {};
  const methods = ['select', 'from', 'innerJoin', 'where', 'insert', 'values', 'returning', 'update', 'set', 'delete'];
  methods.forEach((m) => { db[m] = jest.fn().mockReturnValue(chain); });
  db['execute'] = jest.fn().mockResolvedValue(undefined);
  db['transaction'] = jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(chain));
  return db;
}

describe('ServicesService', () => {
  it('remove throws NotFoundException when service not found', async () => {
    const db = makeMockDbSequence([[]]); // empty result
    const module = await Test.createTestingModule({
      providers: [ServicesService, { provide: DB, useValue: db }],
    }).compile();
    await expect(
      module.get(ServicesService).remove('svc-1', 'tenant-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('remove throws ConflictException with blockingAppointments when future appointments exist', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const db = makeMockDbSequence([
      [{ id: 'svc-1' }],
      [{ id: 'apt-1', startsAt: future, endsAt: future, status: 'confirmed', clientName: 'João', professionalName: 'Maria' }],
    ]);
    const module = await Test.createTestingModule({
      providers: [ServicesService, { provide: DB, useValue: db }],
    }).compile();
    const err = await module.get(ServicesService)
      .remove('svc-1', 'tenant-1')
      .catch(e => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse().blockingAppointments).toHaveLength(1);
    expect(err.getResponse().blockingAppointments[0].id).toBe('apt-1');
  });

  it('remove with cancelFuture=true cancels appointments and deletes', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const db = makeMockDbSequence([
      [{ id: 'svc-1' }],
      [{ id: 'apt-1', startsAt: future, endsAt: future, status: 'confirmed', clientName: 'João', professionalName: 'Maria' }],
      undefined,
      undefined,
    ]);
    const module = await Test.createTestingModule({
      providers: [ServicesService, { provide: DB, useValue: db }],
    }).compile();
    await expect(
      module.get(ServicesService).remove('svc-1', 'tenant-1', true),
    ).resolves.toBeUndefined();
  });

  it('remove succeeds when no future appointments exist', async () => {
    const db = makeMockDbSequence([
      [{ id: 'svc-1' }],
      [],
      undefined,
    ]);
    const module = await Test.createTestingModule({
      providers: [ServicesService, { provide: DB, useValue: db }],
    }).compile();
    await expect(
      module.get(ServicesService).remove('svc-1', 'tenant-1'),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que 3 falham**

```bash
cd /home/willavelar/Projects/MyOwn/NODEJS/scheduler
pnpm test:api --testPathPattern=services.service.spec 2>&1 | tail -20
```

Esperado: `remove throws NotFoundException` passa; os outros 3 falham.

- [ ] **Step 3: Atualizar imports em `services.service.ts`**

Substituir as linhas de import atuais:

```ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { services } from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
```

Por:

```ts
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, gt, notInArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { appointments, professionals, services, users } from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

const profUsers = alias(users, 'prof_users');
```

- [ ] **Step 4: Substituir o método `remove` em `services.service.ts`**

Substituir o método `remove` completo (linhas 51–61):

```ts
async remove(id: string, tenantId: string, cancelFuture = false) {
  return withTenant(this.db, tenantId, async (tx) => {
    const [existing] = await tx
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.id, id), eq(services.tenantId, tenantId)));
    if (!existing) throw new NotFoundException('Service not found');

    const now = new Date();
    const blocking = await tx
      .select({
        id:               appointments.id,
        startsAt:         appointments.startsAt,
        endsAt:           appointments.endsAt,
        status:           appointments.status,
        clientName:       users.name,
        professionalName: profUsers.name,
      })
      .from(appointments)
      .innerJoin(users, eq(appointments.clientId, users.id))
      .innerJoin(professionals, eq(appointments.professionalId, professionals.id))
      .innerJoin(profUsers, eq(professionals.userId, profUsers.id))
      .where(and(
        eq(appointments.serviceId, id),
        gt(appointments.startsAt, now),
        notInArray(appointments.status, ['cancelled', 'completed']),
      ));

    if (blocking.length > 0) {
      if (!cancelFuture) {
        throw new ConflictException({
          message: 'Existem agendamentos futuros vinculados a este serviço.',
          blockingAppointments: blocking,
        });
      }
      await tx
        .update(appointments)
        .set({ status: 'cancelled' })
        .where(and(
          eq(appointments.serviceId, id),
          gt(appointments.startsAt, now),
          notInArray(appointments.status, ['cancelled', 'completed']),
        ));
    }

    await tx.delete(services).where(and(eq(services.id, id), eq(services.tenantId, tenantId)));
  });
}
```

- [ ] **Step 5: Rodar os testes e confirmar que todos passam**

```bash
pnpm test:api --testPathPattern=services.service.spec 2>&1 | tail -20
```

Esperado: 4 testes passando.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/services/services.service.ts packages/api/src/services/services.service.spec.ts
git commit -m "feat(api): block service deletion when future appointments exist"
```

---

## Task 2: API — controller aceita `?cancelFuture=true`

**Files:**
- Modify: `packages/api/src/services/services.controller.ts`

- [ ] **Step 1: Adicionar `Query` ao import e atualizar o método `remove`**

Adicionar `Query` ao import existente de `@nestjs/common`:
```ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
```

Substituir o método `remove` atual:
```ts
@Delete(':id')
@Roles('tenant_admin')
remove(@Param('id') id: string, @TenantId() tenantId: string) {
  return this.service.remove(id, tenantId);
}
```

Por:
```ts
@Delete(':id')
@Roles('tenant_admin')
remove(
  @Param('id') id: string,
  @TenantId() tenantId: string,
  @Query('cancelFuture') cancelFuture?: string,
) {
  return this.service.remove(id, tenantId, cancelFuture === 'true');
}
```

- [ ] **Step 2: Verificar build**

```bash
cd /home/willavelar/Projects/MyOwn/NODEJS/scheduler
pnpm --filter api build 2>&1 | tail -10
```

Esperado: sem erros de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/services/services.controller.ts
git commit -m "feat(api): expose cancelFuture query param on services delete endpoint"
```

---

## Task 3: Frontend — hook, view e página

**Files:**
- Modify: `packages/web/src/hooks/useServices.ts`
- Modify: `packages/web/src/app/(tenant)/(app)/settings/services/_components/ServiceDetailView.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/settings/services/[id]/page.tsx`

- [ ] **Step 1: Adicionar `useForceDeleteService` em `useServices.ts`**

Adicionar ao final do arquivo (após `useDeleteService`):

```ts
export function useForceDeleteService() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (id: string) => api(`/services/${id}?cancelFuture=true`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['services', slug] })
      queryClient.invalidateQueries({ queryKey: ['service', slug, id] })
    },
  })
}
```

- [ ] **Step 2: Atualizar `ServiceDetailView`**

Atualizar o tipo `Props` e passar `onForceDelete` ao `DangerZone`:

```tsx
type Props = {
  service:       Service
  onDelete:      () => Promise<void>
  onForceDelete?: () => Promise<void>
}

export function ServiceDetailView({ service, onDelete, onForceDelete }: Props) {
```

Substituir o bloco `<DangerZone>` atual:
```tsx
      <DangerZone
        title="Excluir serviço"
        description="Esta ação excluirá permanentemente o serviço. Agendamentos existentes vinculados a ele podem ser afetados. Não pode ser desfeita."
        onDelete={onDelete}
        deleteLabel="Excluir serviço"
      />
```

Por:
```tsx
      <DangerZone
        title="Excluir serviço"
        description="Esta ação excluirá permanentemente o serviço. Agendamentos existentes vinculados a ele podem ser afetados. Não pode ser desfeita."
        onDelete={onDelete}
        onForceDelete={onForceDelete}
        deleteLabel="Excluir serviço"
      />
```

- [ ] **Step 3: Substituir `settings/services/[id]/page.tsx` inteiramente**

```tsx
'use client'

import { useParams, useRouter } from 'next/navigation'
import { useService, useDeleteService, useForceDeleteService } from '@/hooks/useServices'
import { ServiceDetailView } from '../_components/ServiceDetailView'

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data: service, isLoading } = useService(id)
  const del      = useDeleteService()
  const forceDel = useForceDeleteService()

  if (isLoading) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>
  if (!service)  return <div className="p-12 text-gray-400 text-sm">Serviço não encontrado.</div>

  async function handleDelete() {
    await del.mutateAsync(service!.id)
    router.push('/settings/services')
  }

  async function handleForceDelete() {
    await forceDel.mutateAsync(service!.id)
    router.push('/settings/services')
  }

  return <ServiceDetailView service={service} onDelete={handleDelete} onForceDelete={handleForceDelete} />
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd /home/willavelar/Projects/MyOwn/NODEJS/scheduler
pnpm --filter web build 2>&1 | grep -E "error TS|Type error" | head -10
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add \
  packages/web/src/hooks/useServices.ts \
  packages/web/src/app/(tenant)/(app)/settings/services/_components/ServiceDetailView.tsx \
  "packages/web/src/app/(tenant)/(app)/settings/services/[id]/page.tsx"
git commit -m "feat(web): wire force-delete flow in service detail page"
```
