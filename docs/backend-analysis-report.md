# Relatório de Análise do Backend

> Gerado em: 2026-05-17  
> Módulos analisados: `auth`, `oauth`, `professionals`, `clients`, `appointments`, `availability`, `services`, `tenants`, `admins`, `notifications`, `email`, `email-queue`

## Resumo Executivo

| Severidade | Quantidade |
|------------|-----------|
| 🔴 Crítico | 5 |
| 🟡 Importante | 6 |
| 🔵 Minor | 5 |

---

## 🔴 Crítico

### [AUTH] — `refresh`/`logout`/`revokeChain` operam fora de `withTenant`

**Arquivo**: `packages/api/src/auth/auth.service.ts` ~linhas 186–256

**Problema**: Updates em `refresh_tokens` usam `this.db` diretamente. `persistRefreshToken` aceita `db = this.db` como default — funciona corretamente quando chamado dentro de uma transaction existente (`generateTokens`), mas quando chamado por `refresh` (linha 213) vai no banco sem contexto de tenant.

**Impacto**: Se a tabela `refresh_tokens` tiver RLS, operações de refresh/logout falham silenciosamente.

**Sugestão de fix**: Usar `withTenant` nas operações de refresh e logout quando o `tenantId` estiver disponível, ou documentar explicitamente que `refresh_tokens` é uma tabela global fora de RLS.

---

### [TENANTS] — `findCurrent` e `update` operam fora de `withTenant`

**Arquivo**: `packages/api/src/tenants/tenants.service.ts` ~linhas 35–98

**Problema**: Queries diretas em `this.db` na tabela `tenants` — a tabela raiz do sistema.

**Impacto**: Um bug de lógica no controller poderia modificar o registro do tenant errado sem que o banco bloqueie, pois o RLS não está ativo na conexão.

**Sugestão de fix**:
```ts
async findCurrent(tenantId: string) {
  const [tenant] = await withTenant(this.db, tenantId, (tx) =>
    tx.select({ ... }).from(tenants).where(eq(tenants.id, tenantId))
  );
  if (!tenant) throw new NotFoundException('Tenant not found');
  return tenant;
}
```

---

### [OAUTH] — `resolveTenantId` opera fora de `withTenant`

**Arquivo**: `packages/api/src/auth/oauth.service.ts` ~linhas 253–260

**Problema**: Chamado dentro do callback OAuth sem contexto de tenant.

**Impacto**: Se a política RLS de `tenants` estiver ativa, toda autenticação OAuth quebra silenciosamente (redirect para `?reason=oauth_error` sem causa clara no log).

**Sugestão de fix**: Criar um utilitário compartilhado de resolução de tenant que use `withTenant`, ou usar uma conexão com `bypassRls` exclusivamente para lookups de tenant (prática comum em setups multi-tenant).

---

### [APPOINTMENTS] — Race condition no check de slot vs. insert

**Arquivo**: `packages/api/src/appointments/appointments.service.ts` ~linhas 50–57

**Problema**: A verificação de disponibilidade (`getAvailableSlots`) e o insert do agendamento acontecem em duas `withTenant` separadas — sem lock ou constraint atômica entre as operações.

**Impacto**: **Double-booking** sob carga concorrente. Dois clientes tentando o mesmo slot ao mesmo tempo podem ambos passar pela validação.

**Sugestão de fix**: Mover `getAvailableSlots` para dentro da mesma transaction do insert, ou adicionar constraint `UNIQUE (professionalId, startsAt)` no banco e tratar `UniqueViolationError` na aplicação.

---

### [APPOINTMENTS] — Lógica `completed` bloqueada pelo flag `allowPaidStatus`

**Arquivo**: `packages/api/src/appointments/appointments.service.ts` ~linhas 360–368

**Problema**: `if (!tenant?.allowPaidStatus)` bloqueia o status `completed`. `completed` é um status operacional normal e não deveria depender de `allowPaidStatus`, que semanticamente controla um status de "pago".

**Impacto**: Tenants com `allowPaidStatus = false` nunca conseguem finalizar um agendamento — funcionalmente bloqueante.

**Sugestão de fix**: Verificar a intenção do campo. Se `allowPaidStatus` controla apenas um status especial `paid`, mover a validação para aquele status e liberar `completed`.

---

## 🟡 Importante

### [AVAILABILITY] — Exceções de agenda expostas a qualquer `client`

**Arquivo**: `packages/api/src/availability/availability.controller.ts` ~linhas 16–30

**Problema**: `GET /availability/exceptions/:professionalId` não tem `@Roles(...)` declarado. Qualquer `client` autenticado vê bloqueios, férias e horários extras de qualquer profissional.

**Sugestão de fix**: Adicionar `@Roles('tenant_admin', 'professional')` no handler de exceções.

---

### [AUTH] — `GET /auth/clients` no módulo errado + limite hardcoded de 20

**Arquivo**: `packages/api/src/auth/auth.controller.ts` ~linhas 58–63

**Problema**: Endpoint de listagem de clients dentro do `AuthController`. Duplica lógica do `ClientsService.findAll`, sem paginação, retornando no máximo 20 registros sem metadados de total.

**Sugestão de fix**: Remover o endpoint e usar `GET /clients` com os filtros adequados. Se necessário para autocomplete, adicionar paginação consistente com o restante da API.

---

### [SERVICES] — `DELETE /services/:id` cancela appointments sem filtro explícito de `tenantId`

**Arquivo**: `packages/api/src/services/services.service.ts` ~linhas 77–95

**Problema**: Dentro do `withTenant` mas sem `eq(appointments.tenantId, tenantId)` explícito no `WHERE`. Todos os outros módulos incluem o filtro defensivo (ver `professionals.service.ts` linhas 249–256).

**Sugestão de fix**: Adicionar `eq(appointments.tenantId, tenantId)` nas queries de `appointments` dentro de `ServicesService.remove`.

---

### [CLIENTS] — Professional acessa dados de qualquer client do tenant sem isolamento de ownership

**Arquivo**: `packages/api/src/clients/clients.controller.ts` ~linhas 41–52

**Problema**: Um `professional` pode `GET /clients/:id` com qualquer UUID do tenant, sem verificação de vínculo. Dados pessoais (birthDate, notes, phone, linkedProfessionals, linkedServices) ficam expostos.

**Sugestão de fix**: Para `professional`, verificar se existe um `clientProfessional` link entre o professional e o client antes de retornar os dados. Se o acesso amplo for intencional, documentar explicitamente.

---

### [AVAILABILITY] — `assertOwnsProfessional` sem filtro de `tenantId`

**Arquivo**: `packages/api/src/availability/availability.service.ts` ~linhas 58–65

**Problema**: Query de ownership usa `and(eq(professionals.id, professionalId), eq(professionals.userId, userId))` sem `tenantId` explícito. Em caso de `userId` ambíguo entre tenants, o check poderia validar o profissional errado.

**Sugestão de fix**: Adicionar `eq(professionals.tenantId, tenantId)` ao `where` de `assertOwnsProfessional`.

---

### [AUTH] — `activateAccount`/`resetPassword` sem verificação cruzada de `users.tenantId`

**Arquivo**: `packages/api/src/auth/auth.service.ts` ~linhas 121–149

**Problema**: O update de `passwordHash` usa apenas `eq(users.id, userId)`. Padrão defensivo: o update deveria verificar também que o user pertence ao tenant do token.

**Sugestão de fix**:
```ts
tx.update(users)
  .set({ passwordHash })
  .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
  .returning(...)
```

---

## 🔵 Minor

### [APPOINTMENTS] — `as any` em `filters.status`

**Arquivo**: `packages/api/src/appointments/appointments.service.ts` linha 279

`eq(appointments.status, filters.status as any)` — bypassa o type-check do enum Drizzle.

**Sugestão**: Tipar `filters.status` com o tipo correto do enum do schema.

---

### [APPOINTMENTS] — `findOne` retorna `null` em vez de lançar `NotFoundException`

**Arquivo**: `packages/api/src/appointments/appointments.service.ts` linha 348

`findOne` retorna `appt ?? null`. Todos os outros módulos lançam `NotFoundException`. O controller não testa o retorno, então a resposta ao client é `200 { body: null }` em vez de `404`.

**Sugestão**: Lançar `new NotFoundException('Appointment not found')`.

---

### [ADMINS] — `update` re-seleciona sem filtro de role

**Arquivo**: `packages/api/src/admins/admins.service.ts` linha 139

Select de retorno do `update` sem `eq(users.role, 'tenant_admin')` — inconsistente com `findOne` (linha 73) que inclui o filtro.

---

### [TENANTS] — `resolveTenantId` sem `withTenant` não está documentado como exceção intencional

**Arquivo**: `packages/api/src/tenants/tenants.service.ts` linhas 22–31

É uma exceção legítima à regra (bootstrap do middleware — não há `tenantId` ainda para passar), mas indistinguível de uma violação acidental.

**Sugestão**: Adicionar comentário explicativo na função.

---

### [OAUTH] — Check de duplicidade em `linkProvider` filtrado pelo RLS do tenant

**Arquivo**: `packages/api/src/auth/oauth.service.ts` linhas 305–313

A query de verificação de provider account duplicado roda dentro de `withTenant`, então o RLS filtra por tenant. O mesmo Google account poderia ser linkado a usuários em dois tenants diferentes sem gerar o erro `already_linked_to_another_user`.

**Sugestão**: Definir se a unicidade de provider accounts é por-tenant ou global. Se global, mover essa query para fora do `withTenant`.

---

## Módulos sem anomalias

- `src/main.ts` — `ValidationPipe` com `whitelist: true` e `transform: true` corretos
- `src/app.module.ts` — `TenantMiddleware` aplicado globalmente
- `src/common/guards/` — triple guard stack implementada corretamente
- `src/common/decorators/` — `@CurrentUser` e `@TenantId` corretos
- `src/database/with-tenant.ts` — `set_config(..., true)` (is_local) garante escopo de transação
- `src/professionals/` — guards, ownership check e separação admin/professional corretos
- `src/notifications/` — todo acesso ao banco via `withTenant`, design de fila bem estruturado
- `src/email/` e `src/email-queue/` — sem acesso ao banco
- `src/availability/slots.service.ts` — lógica pura sem efeitos colaterais
- `src/auth/invite.helper.ts` — helper puro sem acesso ao banco
