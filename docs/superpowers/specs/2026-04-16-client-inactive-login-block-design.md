# Design: Bloqueio de login para cliente inativo

**Data:** 2026-04-16

## Contexto

A tabela `client_profiles` já possui um campo `active boolean NOT NULL DEFAULT true`. O objetivo é impedir que clientes com `active = false` façam login, retornando o mesmo erro genérico de credenciais inválidas (sem revelar que a conta existe mas está bloqueada).

## Escopo

Mudança pontual em `packages/api/src/auth/auth.service.ts`, método `validateUser`.

Não há alteração de schema, migrations, DTOs ou frontend.

## Design

### `validateUser` — lógica atualizada

1. Buscar o usuário por `email` + `tenantId` (já existe).
2. Comparar senha com `bcrypt.compare` (já existe).
3. **Novo:** se `user.role === 'client'`, buscar `clientProfiles` pelo `userId` e verificar `active`.
   - Se `active = false` → `throw new UnauthorizedException()`.
4. Retornar o usuário para o Passport (fluxo normal).

### Comportamento de erro

- Cliente inativo recebe HTTP 401 com `"Unauthorized"` — idêntico ao erro de senha errada.
- `tenant_admin` e `professional` não são verificados contra `clientProfiles.active`.

### Query adicional

```ts
const [profile] = await tx
  .select({ active: clientProfiles.active })
  .from(clientProfiles)
  .where(eq(clientProfiles.userId, user.id));

if (profile && !profile.active) throw new UnauthorizedException();
```

A query roda dentro do `withTenant` já existente, respeitando RLS.

## Fora do escopo

- Mensagem de erro específica para conta inativa (decisão: manter mensagem genérica).
- Bloqueio de `tenant_admin` ou `professional` via `active`.
- Qualquer mudança no frontend.
