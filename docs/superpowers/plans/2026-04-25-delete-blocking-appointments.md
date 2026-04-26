# Delete Blocking Appointments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Impedir exclusão de clientes/profissionais quando há agendamentos futuros, exibindo quais são e oferecendo opção de cancelar todos e excluir.

**Architecture:** O `DELETE` padrão faz a checagem e retorna 409 com lista de agendamentos bloqueantes; `?cancelFuture=true` cancela todos e deleta em uma única transação. O frontend estende `ApiError` para carregar o corpo da resposta e o `DangerZone` trata o estado de bloqueio internamente.

**Tech Stack:** NestJS (ConflictException, Drizzle ORM — `gt`, `notInArray`), Next.js 16, TanStack Query, Tailwind, shadcn/ui.

---

## Files

| Ação | Arquivo |
|---|---|
| Modify | `packages/api/src/professionals/professionals.service.ts` |
| Modify | `packages/api/src/professionals/professionals.controller.ts` |
| Modify | `packages/api/src/professionals/professionals.service.spec.ts` |
| Modify | `packages/api/src/clients/clients.service.ts` |
| Modify | `packages/api/src/clients/clients.controller.ts` |
| Modify | `packages/web/src/lib/api.ts` |
| Modify | `packages/web/src/components/ui/DangerZone.tsx` |
| Modify | `packages/web/src/hooks/useProfessionals.ts` |
| Modify | `packages/web/src/hooks/useClients.ts` |
| Modify | `packages/web/src/app/(tenant)/(app)/professionals/_components/ProfessionalDetailView.tsx` |
| Modify | `packages/web/src/app/(tenant)/(app)/clients/_components/ClientDetailView.tsx` |
| Modify | `packages/web/src/app/(tenant)/(app)/professionals/[id]/page.tsx` |
| Modify | `packages/web/src/app/(tenant)/(app)/clients/[id]/page.tsx` |

---

## Task 1: API — professionals service: bloqueio e cancelamento forçado

**Files:**
- Modify: `packages/api/src/professionals/professionals.service.ts`
- Test: `packages/api/src/professionals/professionals.service.spec.ts`

- [ ] **Step 1: Escrever os testes que falham**

Abrir `packages/api/src/professionals/professionals.service.spec.ts` e substituir o conteúdo completo por:

```ts
import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
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

describe('ProfessionalsService', () => {
  it('remove throws ForbiddenException when deleting own account', async () => {
    const db = makeMockDbSequence([[{ id: 'prof-1', userId: 'user-1' }]]);
    const module = await Test.createTestingModule({
      providers: [ProfessionalsService, { provide: DB, useValue: db }],
    }).compile();
    await expect(
      module.get(ProfessionalsService).remove('prof-1', 'tenant-1', 'user-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('remove throws ConflictException with blockingAppointments when future appointments exist', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const db = makeMockDbSequence([
      [{ id: 'prof-1', userId: 'user-2' }],
      [{ id: 'apt-1', startsAt: future, endsAt: future, status: 'confirmed', serviceName: 'Corte', clientName: 'João' }],
    ]);
    const module = await Test.createTestingModule({
      providers: [ProfessionalsService, { provide: DB, useValue: db }],
    }).compile();
    const err = await module.get(ProfessionalsService)
      .remove('prof-1', 'tenant-1', 'user-1')
      .catch(e => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse().blockingAppointments).toHaveLength(1);
    expect(err.getResponse().blockingAppointments[0].id).toBe('apt-1');
  });

  it('remove with cancelFuture=true cancels appointments and deletes', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const db = makeMockDbSequence([
      [{ id: 'prof-1', userId: 'user-2' }],
      [{ id: 'apt-1', startsAt: future, endsAt: future, status: 'confirmed', serviceName: 'Corte', clientName: 'João' }],
      undefined,
      undefined,
    ]);
    const module = await Test.createTestingModule({
      providers: [ProfessionalsService, { provide: DB, useValue: db }],
    }).compile();
    await expect(
      module.get(ProfessionalsService).remove('prof-1', 'tenant-1', 'user-1', true),
    ).resolves.toBeUndefined();
  });

  it('remove succeeds when no future appointments exist', async () => {
    const db = makeMockDbSequence([
      [{ id: 'prof-1', userId: 'user-2' }],
      [],
      undefined,
    ]);
    const module = await Test.createTestingModule({
      providers: [ProfessionalsService, { provide: DB, useValue: db }],
    }).compile();
    await expect(
      module.get(ProfessionalsService).remove('prof-1', 'tenant-1', 'user-1'),
    ).resolves.toBeUndefined();
  });

  it('update throws ForbiddenException when professional tries to change another user', async () => {
    const db = makeMockDbSequence([[{ id: 'prof-1', userId: 'user-2' }]]);
    const module = await Test.createTestingModule({
      providers: [ProfessionalsService, { provide: DB, useValue: db }],
    }).compile();
    await expect(
      module.get(ProfessionalsService).update('prof-1', { name: 'X' }, 'tenant-1', 'user-1', 'professional'),
    ).rejects.toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que 3 deles falham**

```bash
cd /home/willavelar/Projects/MyOwn/NODEJS/scheduler
pnpm test:api --testPathPattern=professionals.service.spec
```

Esperado: `remove throws ForbiddenException` passa, `update throws ForbiddenException` passa, os outros 3 falham (método `remove` não aceita `cancelFuture`).

- [ ] **Step 3: Implementar a checagem no `professionals.service.ts`**

Atualizar o topo do arquivo — adicionar `gt` e `notInArray` ao import do drizzle-orm, e `appointments` e `services` ao import do shared:

```ts
import { and, count, desc, eq, gt, ilike, notInArray, or } from 'drizzle-orm';
import { appointments, professionals, services, users, weeklyAvailability } from '@scheduler/shared';
```

Substituir o método `remove` completo (linhas 197–209):

```ts
async remove(id: string, tenantId: string, requestingUserId: string, cancelFuture = false) {
  return withTenant(this.db, tenantId, async (tx) => {
    const [prof] = await tx
      .select({ id: professionals.id, userId: professionals.userId })
      .from(professionals)
      .where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId)));
    if (!prof) throw new NotFoundException('Professional not found');
    if (prof.userId === requestingUserId) throw new ForbiddenException('Cannot delete your own account');

    const now = new Date();
    const blocking = await tx
      .select({
        id:          appointments.id,
        startsAt:    appointments.startsAt,
        endsAt:      appointments.endsAt,
        status:      appointments.status,
        serviceName: services.name,
        clientName:  users.name,
      })
      .from(appointments)
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .innerJoin(users, eq(appointments.clientId, users.id))
      .where(and(
        eq(appointments.professionalId, prof.id),
        gt(appointments.startsAt, now),
        notInArray(appointments.status, ['cancelled', 'completed']),
      ));

    if (blocking.length > 0) {
      if (!cancelFuture) {
        throw new ConflictException({
          message: 'Existem agendamentos futuros vinculados a este profissional.',
          blockingAppointments: blocking,
        });
      }
      await tx
        .update(appointments)
        .set({ status: 'cancelled' })
        .where(and(
          eq(appointments.professionalId, prof.id),
          gt(appointments.startsAt, now),
          notInArray(appointments.status, ['cancelled', 'completed']),
        ));
    }

    await tx.delete(users).where(eq(users.id, prof.userId));
  });
}
```

- [ ] **Step 4: Rodar os testes e confirmar que todos passam**

```bash
pnpm test:api --testPathPattern=professionals.service.spec
```

Esperado: 5 testes passando.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/professionals/professionals.service.ts packages/api/src/professionals/professionals.service.spec.ts
git commit -m "feat(api): block professional deletion when future appointments exist"
```

---

## Task 2: API — clients service: bloqueio e cancelamento forçado

**Files:**
- Modify: `packages/api/src/clients/clients.service.ts`

- [ ] **Step 1: Adicionar imports em `clients.service.ts`**

Na linha 1, o import atual do drizzle é `import { and, count, desc, eq, ilike, or } from 'drizzle-orm';`.
Substituir por:

```ts
import { and, count, desc, eq, gt, ilike, notInArray, or } from 'drizzle-orm';
```

Na linha de import do shared, adicionar `appointments`:

```ts
import {
  appointments,
  clientProfiles,
  clientProfessionals,
  clientServices,
  professionals,
  services,
  users,
} from '@scheduler/shared';
```

- [ ] **Step 2: Substituir o método `remove` em `clients.service.ts`**

Substituir o método `remove` completo (linhas 258–269):

```ts
async remove(id: string, tenantId: string, cancelFuture = false) {
  return withTenant(this.db, tenantId, async (tx) => {
    const [user] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId), eq(users.role, 'client')));
    if (!user) throw new NotFoundException('Client not found');

    const now = new Date();
    const blocking = await tx
      .select({
        id:               appointments.id,
        startsAt:         appointments.startsAt,
        endsAt:           appointments.endsAt,
        status:           appointments.status,
        serviceName:      services.name,
        professionalName: profUsers.name,
      })
      .from(appointments)
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .innerJoin(professionals, eq(appointments.professionalId, professionals.id))
      .innerJoin(profUsers, eq(professionals.userId, profUsers.id))
      .where(and(
        eq(appointments.clientId, id),
        gt(appointments.startsAt, now),
        notInArray(appointments.status, ['cancelled', 'completed']),
      ));

    if (blocking.length > 0) {
      if (!cancelFuture) {
        throw new ConflictException({
          message: 'Existem agendamentos futuros vinculados a este cliente.',
          blockingAppointments: blocking,
        });
      }
      await tx
        .update(appointments)
        .set({ status: 'cancelled' })
        .where(and(
          eq(appointments.clientId, id),
          gt(appointments.startsAt, now),
          notInArray(appointments.status, ['cancelled', 'completed']),
        ));
    }

    await tx.delete(users).where(eq(users.id, id));
    return { deleted: true };
  });
}
```

O `profUsers` já existe no topo do arquivo como `const profUsers = alias(users, 'prof_users');`. Também adicionar `ConflictException` ao import do `@nestjs/common` (que já tem `ConflictException, Inject, Injectable, NotFoundException`).

- [ ] **Step 3: Verificar que o build compila sem erros**

```bash
cd /home/willavelar/Projects/MyOwn/NODEJS/scheduler
pnpm --filter api build 2>&1 | tail -20
```

Esperado: sem erros de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/clients/clients.service.ts
git commit -m "feat(api): block client deletion when future appointments exist"
```

---

## Task 3: API — controllers aceitam `?cancelFuture=true`

**Files:**
- Modify: `packages/api/src/professionals/professionals.controller.ts`
- Modify: `packages/api/src/clients/clients.controller.ts`

- [ ] **Step 1: Atualizar `professionals.controller.ts`**

Adicionar `Query` aos imports do `@nestjs/common` (já está) e substituir o método `remove`:

```ts
@Delete(':id')
@Roles('tenant_admin')
remove(
  @Param('id') id: string,
  @TenantId() tenantId: string,
  @CurrentUser() user: { id: string; role: string },
  @Query('cancelFuture') cancelFuture?: string,
) {
  return this.service.remove(id, tenantId, user.id, cancelFuture === 'true');
}
```

- [ ] **Step 2: Atualizar `clients.controller.ts`**

Adicionar `Query` ao import do `@nestjs/common` (já tem) e substituir o método `remove`:

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

- [ ] **Step 3: Verificar build**

```bash
pnpm --filter api build 2>&1 | tail -20
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/professionals/professionals.controller.ts packages/api/src/clients/clients.controller.ts
git commit -m "feat(api): expose cancelFuture query param on delete endpoints"
```

---

## Task 4: Frontend — estender `ApiError` para carregar o body completo

**Files:**
- Modify: `packages/web/src/lib/api.ts`

- [ ] **Step 1: Atualizar `ApiError` e `apiFetch`**

Substituir o conteúdo completo de `packages/web/src/lib/api.ts`:

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message)
  }
}

export async function apiFetch(
  path: string,
  {
    slug,
    token,
    ...options
  }: RequestInit & { slug: string; token?: string | null }
): Promise<Response> {
  const headers: Record<string, string> = {
    'x-tenant-slug': slug,
    ...(options.headers as Record<string, string>),
  }
  if (options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(res.status, body.message ?? res.statusText, body)
  }

  return res
}
```

A única mudança é: `ApiError` recebe `public body?: unknown` e o `throw` passa `body` como terceiro argumento.

- [ ] **Step 2: Verificar que o TypeScript compila**

```bash
pnpm --filter web build 2>&1 | tail -20
```

Esperado: sem erros (mudança retrocompatível — `body` é opcional).

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/lib/api.ts
git commit -m "feat(web): extend ApiError with response body for structured error handling"
```

---

## Task 5: Frontend — `DangerZone` com UI de bloqueio

**Files:**
- Modify: `packages/web/src/components/ui/DangerZone.tsx`

- [ ] **Step 1: Substituir o componente completo**

```tsx
'use client'

import { useState } from 'react'
import { ApiError } from '@/lib/api'

type BlockingAppointment = {
  id: string
  startsAt: string
  endsAt: string
  status: string
  serviceName: string
  clientName?: string
  professionalName?: string
}

type Props = {
  title: string
  description: string
  onDelete: () => Promise<void>
  onForceDelete?: () => Promise<void>
  deleteLabel?: string
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function isBlockingBody(body: unknown): body is { blockingAppointments: BlockingAppointment[] } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'blockingAppointments' in body &&
    Array.isArray((body as Record<string, unknown>).blockingAppointments)
  )
}

export function DangerZone({ title, description, onDelete, onForceDelete, deleteLabel = 'Excluir' }: Props) {
  const [confirm, setConfirm]           = useState(false)
  const [pending, setPending]           = useState(false)
  const [error, setError]               = useState('')
  const [blocking, setBlocking]         = useState<BlockingAppointment[] | null>(null)
  const [forceConfirm, setForceConfirm] = useState(false)
  const [forcePending, setForcePending] = useState(false)

  async function handleDelete() {
    setPending(true)
    setError('')
    try {
      await onDelete()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && isBlockingBody(err.body)) {
        setBlocking(err.body.blockingAppointments)
        setConfirm(false)
      } else {
        setError('Não foi possível excluir. Tente novamente.')
        setConfirm(false)
      }
    } finally {
      setPending(false)
    }
  }

  async function handleForceDelete() {
    setForcePending(true)
    setError('')
    try {
      await onForceDelete!()
    } catch {
      setError('Não foi possível excluir. Tente novamente.')
      setForceConfirm(false)
    } finally {
      setForcePending(false)
    }
  }

  if (blocking !== null) {
    return (
      <div className="mt-2">
        <h3 className="text-sm font-bold text-red-600 m-0 mb-3">Zona de perigo</h3>
        <div className="bg-white border border-red-200 rounded-xl px-6 py-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-900 m-0 mb-1.5">{title}</p>
          <p className="text-[13px] text-red-600 m-0 mb-3">
            Não é possível excluir: {blocking.length} agendamento{blocking.length !== 1 ? 's' : ''} futuro{blocking.length !== 1 ? 's' : ''} vinculado{blocking.length !== 1 ? 's' : ''}.
          </p>

          <ul className="m-0 mb-4 p-0 list-none flex flex-col gap-2">
            {blocking.map(apt => (
              <li key={apt.id} className="text-[13px] text-gray-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <span className="font-medium">{formatDateTime(apt.startsAt)}</span>
                {' — '}{apt.serviceName}
                {apt.clientName      && <span className="text-gray-500"> · {apt.clientName}</span>}
                {apt.professionalName && <span className="text-gray-500"> · {apt.professionalName}</span>}
              </li>
            ))}
          </ul>

          {onForceDelete && !forceConfirm && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setForceConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 transition-colors"
              >
                Cancelar todos e excluir
              </button>
              <button
                onClick={() => setBlocking(null)}
                className="px-4 py-2 bg-white text-gray-700 text-[13px] font-medium rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                Manter
              </button>
            </div>
          )}

          {onForceDelete && forceConfirm && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[13px] text-red-700 font-medium">
                Isso cancelará {blocking.length} agendamento{blocking.length !== 1 ? 's' : ''}. Confirma?
              </span>
              <button
                onClick={handleForceDelete}
                disabled={forcePending}
                className="px-4 py-2 bg-red-600 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
              >
                {forcePending ? 'Excluindo...' : 'Sim, cancelar e excluir'}
              </button>
              <button
                onClick={() => setForceConfirm(false)}
                className="px-4 py-2 bg-white text-gray-700 text-[13px] font-medium rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                Não
              </button>
            </div>
          )}

          {!onForceDelete && (
            <button
              onClick={() => setBlocking(null)}
              className="px-4 py-2 bg-white text-gray-700 text-[13px] font-medium rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              Fechar
            </button>
          )}

          {error && <p className="text-xs text-red-600 mt-2.5 m-0">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <h3 className="text-sm font-bold text-red-600 m-0 mb-3">Zona de perigo</h3>
      <div className="bg-white border border-red-200 rounded-xl px-6 py-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-900 m-0 mb-1.5">{title}</p>
        <p className="text-[13px] text-gray-500 m-0 mb-4">{description}</p>

        {!confirm ? (
          <button
            onClick={() => setConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 transition-colors"
          >
            {deleteLabel}
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-red-700 font-medium">Tem certeza?</span>
            <button
              onClick={handleDelete}
              disabled={pending}
              className="px-4 py-2 bg-red-600 text-white text-[13px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-red-700 disabled:opacity-65 disabled:cursor-not-allowed transition-colors"
            >
              {pending ? 'Excluindo...' : 'Sim, excluir'}
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="px-4 py-2 bg-white text-gray-700 text-[13px] font-medium rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {error && <p className="text-xs text-red-600 mt-2.5 m-0">{error}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
pnpm --filter web build 2>&1 | tail -20
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/ui/DangerZone.tsx
git commit -m "feat(web): DangerZone shows blocking appointments and force-delete option"
```

---

## Task 6: Frontend — hooks de force delete e wire-up nas páginas

**Files:**
- Modify: `packages/web/src/hooks/useProfessionals.ts`
- Modify: `packages/web/src/hooks/useClients.ts`
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/_components/ProfessionalDetailView.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/clients/_components/ClientDetailView.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/[id]/page.tsx`
- Modify: `packages/web/src/app/(tenant)/(app)/clients/[id]/page.tsx`

- [ ] **Step 1: Adicionar `useForceDeleteProfessional` em `useProfessionals.ts`**

Adicionar ao final do arquivo (após `useDeleteProfessional`):

```ts
export function useForceDeleteProfessional() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (id: string) => api(`/professionals/${id}?cancelFuture=true`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals', slug] })
      queryClient.invalidateQueries({ queryKey: ['professionals-page', slug] })
    },
  })
}
```

- [ ] **Step 2: Adicionar `useForceDeleteClient` em `useClients.ts`**

Adicionar ao final do arquivo (após `useDeleteClient`):

```ts
export function useForceDeleteClient() {
  const api = useApi()
  const queryClient = useQueryClient()
  const { slug } = useTenant()
  return useMutation({
    mutationFn: (id: string) => api(`/clients/${id}?cancelFuture=true`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients', slug] }),
  })
}
```

- [ ] **Step 3: Adicionar `onForceDelete` em `ProfessionalDetailView`**

No tipo `Props`, adicionar `onForceDelete?: () => Promise<void>`:

```ts
type Props = {
  prof:           Professional
  isAdmin:        boolean
  isOwnProfile:   boolean
  profilePage?:   boolean
  onDelete?:      () => Promise<void>
  onForceDelete?: () => Promise<void>
}
```

No JSX, passar `onForceDelete` para `DangerZone`:

```tsx
{canDelete && onDelete && (
  <DangerZone
    title="Excluir profissional"
    description="Esta ação excluirá permanentemente o profissional e todos os seus dados. Não pode ser desfeita."
    onDelete={onDelete}
    onForceDelete={onForceDelete}
    deleteLabel="Excluir profissional"
  />
)}
```

- [ ] **Step 4: Adicionar `onForceDelete` em `ClientDetailView`**

No tipo `Props`, adicionar `onForceDelete?: () => Promise<void>`:

```ts
type Props = {
  client:         ClientDetail
  isAdmin:        boolean
  isOwnProfile:   boolean
  profilePage?:   boolean
  onDelete?:      () => Promise<void>
  onForceDelete?: () => Promise<void>
}
```

No JSX, passar `onForceDelete` para `DangerZone`:

```tsx
{canDelete && onDelete && (
  <DangerZone
    title="Excluir cliente"
    description="Esta ação excluirá permanentemente o cliente e todos os seus dados. Não pode ser desfeita."
    onDelete={onDelete}
    onForceDelete={onForceDelete}
    deleteLabel="Excluir cliente"
  />
)}
```

- [ ] **Step 5: Atualizar `professionals/[id]/page.tsx`**

Substituir o conteúdo completo:

```tsx
'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useProfessional, useDeleteProfessional, useForceDeleteProfessional } from '@/hooks/useProfessionals'
import { ProfessionalDetailView } from '../_components/ProfessionalDetailView'

export default function ProfessionalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const isAdmin = me?.role === 'tenant_admin'

  const { data: prof, isLoading } = useProfessional(id)
  const del      = useDeleteProfessional()
  const forceDel = useForceDeleteProfessional()

  if (isLoading) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>
  if (!prof)     return <div className="p-12 text-gray-400 text-sm">Profissional não encontrado.</div>

  const isOwnProfile = prof.userId === me?.id
  const canDelete    = isAdmin && !isOwnProfile

  async function handleDelete() {
    await del.mutateAsync(prof!.id)
    router.push('/professionals')
  }

  async function handleForceDelete() {
    await forceDel.mutateAsync(prof!.id)
    router.push('/professionals')
  }

  return (
    <ProfessionalDetailView
      prof={prof}
      isAdmin={isAdmin}
      isOwnProfile={isOwnProfile}
      onDelete={canDelete ? handleDelete : undefined}
      onForceDelete={canDelete ? handleForceDelete : undefined}
    />
  )
}
```

- [ ] **Step 6: Atualizar `clients/[id]/page.tsx`**

Substituir o conteúdo completo:

```tsx
'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useClient, useDeleteClient, useForceDeleteClient } from '@/hooks/useClients'
import { ClientDetailView } from '../_components/ClientDetailView'

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: me } = useAuth()
  const isAdmin      = me?.role === 'tenant_admin'
  const isOwnProfile = id === me?.id

  const { data: client, isLoading } = useClient(id)
  const del      = useDeleteClient()
  const forceDel = useForceDeleteClient()

  if (isLoading) return <div className="p-12 text-gray-400 text-sm">Carregando...</div>
  if (!client)   return <div className="p-12 text-gray-400 text-sm">Cliente não encontrado.</div>

  const canDelete = isAdmin && !isOwnProfile

  async function handleDelete() {
    await del.mutateAsync(client!.id)
    router.push('/clients')
  }

  async function handleForceDelete() {
    await forceDel.mutateAsync(client!.id)
    router.push('/clients')
  }

  return (
    <ClientDetailView
      client={client}
      isAdmin={isAdmin}
      isOwnProfile={isOwnProfile}
      onDelete={canDelete ? handleDelete : undefined}
      onForceDelete={canDelete ? handleForceDelete : undefined}
    />
  )
}
```

- [ ] **Step 7: Verificar TypeScript**

```bash
pnpm --filter web build 2>&1 | tail -20
```

Esperado: sem erros.

- [ ] **Step 8: Commit**

```bash
git add \
  packages/web/src/hooks/useProfessionals.ts \
  packages/web/src/hooks/useClients.ts \
  packages/web/src/app/(tenant)/(app)/professionals/_components/ProfessionalDetailView.tsx \
  packages/web/src/app/(tenant)/(app)/clients/_components/ClientDetailView.tsx \
  packages/web/src/app/(tenant)/(app)/professionals/[id]/page.tsx \
  packages/web/src/app/(tenant)/(app)/clients/[id]/page.tsx
git commit -m "feat(web): wire force-delete flow in professional and client detail pages"
```
