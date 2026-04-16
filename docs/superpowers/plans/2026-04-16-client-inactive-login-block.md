# Client Inactive Login Block — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Impedir que clientes com `active = false` na tabela `client_profiles` façam login, retornando o mesmo HTTP 401 genérico de credenciais inválidas.

**Architecture:** A verificação é adicionada ao método `validateUser` em `auth.service.ts`. Após confirmar a senha, se `user.role === 'client'`, uma segunda query busca `clientProfiles.active` para o usuário; se `false`, lança `UnauthorizedException`. Nenhuma outra camada (frontend, schema, migrations) precisa mudar.

**Tech Stack:** NestJS, Drizzle ORM, bcryptjs, Jest

---

### Task 1: Escrever testes para `validateUser` com cliente inativo

**Files:**
- Create: `packages/api/src/auth/auth.service.spec.ts`

- [ ] **Step 1: Criar o arquivo de teste**

```typescript
// packages/api/src/auth/auth.service.spec.ts
import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { DB } from '../database/database.module';

// Mesmo padrão de mock usado em professionals.service.spec.ts:
// um proxy thenable que encadeia todos os métodos de query builder.
function makeChain(resolveWith: unknown): Record<string, unknown> {
  const thenable: Record<string, unknown> = {};
  const methods = ['select', 'from', 'where', 'innerJoin', 'leftJoin',
                   'insert', 'values', 'returning', 'update', 'set', 'delete', 'limit'];
  methods.forEach((m) => { thenable[m] = jest.fn().mockReturnValue(thenable); });
  thenable['then'] = jest.fn().mockImplementation((resolve: (v: unknown) => void) => resolve(resolveWith));
  thenable['execute'] = jest.fn().mockResolvedValue(undefined);
  return thenable;
}

function makeMockDb(resolveWith: unknown) {
  const chain = makeChain(resolveWith);
  const db: Record<string, unknown> = {};
  const methods = ['select', 'from', 'where', 'innerJoin', 'leftJoin',
                   'insert', 'values', 'returning', 'update', 'set', 'delete'];
  methods.forEach((m) => { db[m] = jest.fn().mockReturnValue(chain); });
  db['execute'] = jest.fn().mockResolvedValue(undefined);
  db['transaction'] = jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(chain));
  return db;
}

describe('AuthService.validateUser', () => {
  async function buildService(dbResolveWith: unknown) {
    const mockDb = makeMockDb(dbResolveWith);
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: mockDb },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    return { service: module.get(AuthService), mockDb };
  }

  it('lança UnauthorizedException quando o cliente está inativo', async () => {
    const passwordHash = await bcrypt.hash('senha123', 10);

    // Primeira chamada retorna o usuário; segunda retorna perfil inativo.
    // withTenant chama db.transaction → fn(tx); tx encadeia os métodos.
    // Para controlar múltiplas queries, fazemos o chain.then alternar as respostas.
    let callCount = 0;
    const chain: Record<string, unknown> = {};
    const methods = ['select', 'from', 'where', 'innerJoin', 'leftJoin',
                     'insert', 'values', 'returning', 'update', 'set', 'delete', 'limit'];
    methods.forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain); });
    chain['execute'] = jest.fn().mockResolvedValue(undefined);
    chain['then'] = jest.fn().mockImplementation((resolve: (v: unknown) => void) => {
      callCount++;
      if (callCount === 1) {
        // set_config (withTenant internals) — resolve com undefined
        return resolve(undefined);
      }
      if (callCount === 2) {
        // SELECT users — retorna o usuário com role client
        return resolve([{ id: 'user-1', email: 'a@b.com', passwordHash, role: 'client', tenantId: 'tenant-1', name: 'A', phone: null, lastLoginAt: null, createdAt: new Date() }]);
      }
      // SELECT client_profiles — retorna perfil inativo
      return resolve([{ active: false }]);
    });

    const db: Record<string, unknown> = {};
    methods.forEach((m) => { db[m] = jest.fn().mockReturnValue(chain); });
    db['execute'] = jest.fn().mockResolvedValue(undefined);
    db['transaction'] = jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(chain));

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: db },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();
    const service = module.get(AuthService);

    await expect(service.validateUser('a@b.com', 'senha123', 'tenant-1'))
      .rejects.toThrow(UnauthorizedException);
  });

  it('lança UnauthorizedException quando usuário não existe', async () => {
    // chain.then sempre resolve com array vazio (usuário não encontrado)
    const { service } = await buildService([]);

    await expect(service.validateUser('x@y.com', 'pass', 'tenant-1'))
      .rejects.toThrow(UnauthorizedException);
  });

  it('lança UnauthorizedException quando senha está errada', async () => {
    const passwordHash = await bcrypt.hash('correta', 10);
    const { service } = await buildService([
      { id: 'user-1', email: 'a@b.com', passwordHash, role: 'client', tenantId: 'tenant-1', name: 'A', phone: null, lastLoginAt: null, createdAt: new Date() },
    ]);

    await expect(service.validateUser('a@b.com', 'errada', 'tenant-1'))
      .rejects.toThrow(UnauthorizedException);
  });
});
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
cd /home/willavelar/Projects/MyOwn/NODEJS/scheduler
pnpm test:api --testPathPattern=auth.service.spec
```

Esperado: o teste "lança UnauthorizedException quando o cliente está inativo" **FALHA** (o `validateUser` atual não verifica `active`). Os outros dois devem passar.

---

### Task 2: Implementar a verificação de `active` em `validateUser`

**Files:**
- Modify: `packages/api/src/auth/auth.service.ts:52-61`

- [ ] **Step 1: Atualizar `validateUser`**

Substituir o método existente (linhas 52–61) por:

```typescript
async validateUser(email: string, password: string, tenantId: string) {
  return withTenant(this.db, tenantId, async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.tenantId, tenantId)));

    if (!user) throw new UnauthorizedException();
    if (!await bcrypt.compare(password, user.passwordHash)) throw new UnauthorizedException();

    if (user.role === 'client') {
      const [profile] = await tx
        .select({ active: clientProfiles.active })
        .from(clientProfiles)
        .where(eq(clientProfiles.userId, user.id));

      if (profile && !profile.active) throw new UnauthorizedException();
    }

    return user;
  });
}
```

O `withTenant` já envolvia a query anterior — agora a função inteira roda na mesma transação, permitindo as duas queries (users + clientProfiles) dentro do mesmo contexto RLS.

- [ ] **Step 2: Rodar os testes**

```bash
pnpm test:api --testPathPattern=auth.service.spec
```

Esperado: todos os 3 testes **PASS**.

- [ ] **Step 3: Rodar a suite completa para garantir ausência de regressões**

```bash
pnpm test:api
```

Esperado: todos os testes existentes continuam **PASS**.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/auth/auth.service.ts packages/api/src/auth/auth.service.spec.ts
git commit -m "feat: block login for inactive clients"
```
