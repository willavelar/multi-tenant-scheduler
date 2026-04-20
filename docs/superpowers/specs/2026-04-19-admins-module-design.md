# Design: Módulo Administradores + Centralização de `active`/`avatarUrl`

## Contexto

Atualmente `active` e `avatarUrl` vivem em tabelas satélite (`client_profiles.active`, `professionals.active`, `client_profiles.avatar_url`, `professionals.avatar_url`). O objetivo é:

1. Centralizar `active` e `avatarUrl` na tabela `users` — válido para todos os roles.
2. Criar o módulo `Admins` com listagem paginada de usuários `tenant_admin`.
3. Adicionar item "Administradores" no menu lateral (somente `tenant_admin`).

O banco de dados ainda não está em produção, então as migrations existentes serão editadas diretamente — sem data migration.

---

## 1. Schema

### `packages/shared/src/schema/users.schema.ts`

Adicionar dois campos à tabela `users`:

| Campo | Tipo | Padrão |
|---|---|---|
| `active` | `boolean NOT NULL` | `true` |
| `avatarUrl` | `text` | `null` |

### `packages/shared/src/schema/client-profiles.schema.ts`

Remover os campos `active` e `avatarUrl`.

### `packages/shared/src/schema/professionals.schema.ts`

Remover os campos `active` e `avatarUrl`.

### Migrations

Editar diretamente as migrations existentes que criam as tabelas `users`, `client_profiles` e `professionals` para refletir o novo schema. Rodar `pnpm db:migrate` após as edições (e re-seed).

---

## 2. Backend — Serviços Existentes

### `professionals.service.ts`

- `PROF_FIELDS`: `avatarUrl` → `users.avatarUrl`; `active` → `users.active`
- `create()`: inserir `avatarUrl` no insert de `users` (campo novo); remover do insert de `professionals`
- `update()`: mover `avatarUrl` e `active` de `profPatch` para `userPatch`
- `findAll()`: filtro `active` aponta para `users.active`

### `clients.service.ts`

- `FIELDS` em `findAll` e `findOne`: `avatarUrl` e `active` de `clientProfiles.*` → `users.*`
- `create()`: inserir `active` e `avatarUrl` no insert de `users`; remover do insert de `clientProfiles`
- `update()`: mover `active` e `avatarUrl` de `profilePatch` para `userPatch`
- `findAll()`: filtro `active` aponta para `users.active`

### `appointments.service.ts`

- `FIELDS`: `clientAvatarUrl` → `users.avatarUrl`; `professionalAvatarUrl` → `profUsers.avatarUrl`
- Remover o `leftJoin(clientProfiles, ...)` em `findAll` — nenhum campo de `clientProfiles` é mais necessário nessa query

### `auth.service.ts`

- `validateUser()`: remover a query em `clientProfiles.active`; checar `user.active` diretamente (aplica a todos os roles, não só clientes)
- `listClients()`: `avatarUrl` → `users.avatarUrl`; remover `leftJoin(clientProfiles, ...)`

---

## 3. Backend — Novo Módulo `AdminsModule`

### Arquivos

```
packages/api/src/admins/
  admins.module.ts
  admins.controller.ts
  admins.service.ts
```

Registrar em `app.module.ts`.

### Endpoint

```
GET /admins
Guards: JwtAuthGuard, TenantGuard, RolesGuard
Roles: tenant_admin

Query params:
  page    number  default 1
  limit   number  default 10
  q       string  busca por nome ou email (ilike)
  active  string  'true' | 'false' | undefined
```

### Resposta

```ts
{
  data: Admin[]
  total: number
  page: number
  limit: number
}

Admin {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  active: boolean
  createdAt: string
}
```

### Service `findAll`

Query em `users` onde `tenantId = tenantId` AND `role = 'tenant_admin'`, com filtros opcionais de busca (`ilike` em `name` e `email`) e `active`. Retorna paginado.

---

## 4. Frontend

### `packages/web/src/types/index.ts`

Adicionar:

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

### `packages/web/src/hooks/useAdmins.ts`

Novo hook `useAdmins(page, filters)` seguindo o padrão de `useClients`.

### `packages/web/src/components/AppShell/Sidebar.tsx`

Adicionar item "Administradores" com ícone de escudo, `href: '/admins'`, `roles: ['tenant_admin']`.

### `packages/web/src/app/(tenant)/(app)/admins/page.tsx`

Página de listagem com:

- **Filtros**: busca por nome (ilike), select de Status (Todos / Ativo / Inativo)
- **Colunas**: Nome (com avatar), E-mail, Cadastrado Em, Status, Ações
- **Paginação**: Anterior / Próxima
- **Botão "Visualizar"**: navega para `/admins/:id` (página não criada nesta entrega)
- Visível apenas para `tenant_admin` (rota protegida pelo guard de roles já presente)

---

## Fora do escopo desta entrega

- Página de detalhe/edição do administrador (`/admins/:id`)
- Criação de novos administradores via UI
