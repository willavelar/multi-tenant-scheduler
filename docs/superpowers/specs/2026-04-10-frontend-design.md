# Frontend — Design Spec

**Data:** 2026-04-10
**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · TanStack Query

---

## Escopo

Este spec cobre o frontend do contexto de tenant: fluxo de agendamento público (booking wizard) e dashboard administrativo. O painel super admin (`app.meuapp.com`) é escopo de uma fase posterior.

---

## Arquitetura

### Multi-tenancy via middleware

`middleware.ts` roda no Edge Runtime em toda request:

1. Extrai o slug do subdomínio (`clinica-demo.lvh.me` → `clinica-demo`)
2. Verifica o cookie `refreshToken` para rotas protegidas — redireciona para `/login` se ausente
3. Reescreve o request com header `x-tenant-slug` para que Server Components possam lê-lo via `headers()`

Rotas protegidas (matcher): `/dashboard/:path*`, `/appointments/:path*`
Rotas públicas (sem auth): `/`, `/login`, `/register`

### Estrutura de arquivos

```
packages/web/
  middleware.ts
  src/
    app/
      (tenant)/
        layout.tsx              # TenantProvider + QueryClientProvider
        page.tsx                # Booking wizard (público)
        login/
          page.tsx
        register/
          page.tsx
        dashboard/
          layout.tsx            # Sidebar fixa + auth guard por role
          page.tsx              # Lista de agendamentos
          professionals/
            page.tsx            # CRUD de profissionais
          services/
            page.tsx            # CRUD de serviços
          availability/
            page.tsx            # Grade semanal + exceções
        appointments/
          page.tsx              # Meus agendamentos (cliente)
    lib/
      api.ts                    # Wrapper de fetch com tenant + auth headers
      queryClient.ts            # Instância global do QueryClient
    hooks/
      useProfessionals.ts
      useServices.ts
      useSlots.ts
      useAppointments.ts
    providers/
      TenantProvider.tsx        # Context com slug e dados do tenant
      AuthProvider.tsx          # Context com user, tokens e logout
    components/
      ui/                       # shadcn/ui re-exports
      Sidebar.tsx
      BookingWizard/
        BookingPage.tsx
        StepProfessional.tsx
        StepService.tsx
        StepDateTime.tsx
        StepConfirm.tsx
```

---

## Seção 1 — Booking Wizard

### Fluxo

Wizard de 4 etapas na página raiz do tenant (`/`). Estado gerenciado por `useReducer` localizado em `BookingPage` — componentes filhos recebem props e chamam callbacks, sem Context ou estado global.

```typescript
type BookingState = {
  step: 1 | 2 | 3 | 4
  professionalId: string | null
  serviceId: string | null
  date: string | null       // "YYYY-MM-DD"
  startTime: string | null  // "HH:MM"
}
```

### Etapas

| Etapa | Componente | API | Comportamento |
|-------|-----------|-----|---------------|
| 1 — Profissional | `StepProfessional` | `GET /professionals` | Grid de cards. Selecionar avança para etapa 2. |
| 2 — Serviço | `StepService` | `GET /services` | Lista com nome, duração e descrição. Selecionar avança para etapa 3. |
| 3 — Data & Horário | `StepDateTime` | `GET /availability/slots?professionalId=&date=` | Calendário de dias + grade de slots. Query revalida ao trocar data. Selecionar slot avança para etapa 4. |
| 4 — Confirmação | `StepConfirm` | `POST /appointments` | Resumo do agendamento. Se não autenticado: modal de login/registro inline antes de confirmar. Sucesso: tela de confirmação com status (`pending` ou `confirmed`). |

### Autenticação no wizard

O cliente pode navegar pelas etapas 1–3 sem estar logado. Na etapa 4, ao clicar em "Confirmar":

- Se autenticado: chama `POST /appointments` diretamente
- Se não autenticado: exibe modal com tabs Login / Cadastro. Após autenticar, retoma a confirmação automaticamente.

---

## Seção 2 — Dashboard

### Layout

`dashboard/layout.tsx` renderiza a sidebar fixa e o conteúdo à direita. A sidebar adapta os itens por role:

| Item | tenant_admin | professional |
|------|:---:|:---:|
| Agendamentos | ✅ | ✅ |
| Profissionais | ✅ | ❌ |
| Serviços | ✅ | ❌ |
| Disponibilidade | ✅ (todos) | ✅ (só o seu) |

O layout verifica o role via `AuthProvider`. Itens não permitidos não aparecem na sidebar. Acesso direto à URL redireciona para `/dashboard` com mensagem de erro.

### Páginas

**`/dashboard` — Agendamentos**
- Lista de agendamentos filtrada por data (padrão: hoje)
- `tenant_admin` vê todos os agendamentos do tenant
- `professional` vê apenas os seus
- Botões confirmar/cancelar inline nos agendamentos com status `pending`
- Mutation: `PATCH /appointments/:id/confirm` e `PATCH /appointments/:id/cancel`
- Após mutation: invalida query de agendamentos

**`/dashboard/professionals` — Profissionais** *(tenant_admin only)*
- Tabela com nome, bio, status ativo
- Botão criar: sheet/drawer lateral com formulário (`POST /professionals`)
- Editar inline ou sheet (`PATCH /professionals/:id`)
- Desativar: toggle de status (`PATCH /professionals/:id` com `active: false`)

**`/dashboard/services` — Serviços** *(tenant_admin only)*
- Tabela com nome, duração, descrição, status ativo
- Criar/editar via sheet lateral
- Desativar via toggle

**`/dashboard/availability` — Disponibilidade**
- Seletor de profissional no topo (tenant_admin vê todos; professional vê só o seu, sem seletor)
- Grade semanal: 7 linhas (Seg–Dom) com horário início, fim e duração do slot
- Criar/deletar entradas de `weekly_availability`
- Lista de exceções abaixo: criar bloqueio ou horário extra por data

**`/appointments` — Meus agendamentos** *(client only)*
- Lista dos agendamentos do cliente logado
- Status badge: pendente / confirmado / cancelado / concluído
- Botão cancelar nos agendamentos futuros com status `pending` ou `confirmed`

---

## Seção 3 — Camada de dados

### API Client (`src/lib/api.ts`)

Wrapper de `fetch` com injeção automática de headers em toda chamada:

```typescript
// Injeta automaticamente:
// - x-tenant-slug: lido do TenantContext
// - Authorization: Bearer <accessToken> (lido do AuthContext)
async function api(path: string, options?: RequestInit): Promise<Response>
```

Nenhum componente faz `fetch` diretamente — toda chamada passa pelo `api()`.

### TanStack Query

`QueryClientProvider` no `(tenant)/layout.tsx`. Hooks organizados por domínio:

- `useProfessionals()` — `GET /professionals`
- `useServices()` — `GET /services`
- `useSlots(professionalId, date)` — `GET /availability/slots` (habilitado só quando ambos os params existem)
- `useAppointments(filters?)` — `GET /appointments`
- `useWeeklyAvailability(professionalId)` — `GET /availability/weekly/:professionalId`

Mutations invalidam as queries relevantes via `queryClient.invalidateQueries`.

### Autenticação

- `POST /auth/login` → `{ accessToken, refreshToken }`
- `accessToken` salvo em memória (`AuthContext`) — não persiste entre reloads (15min TTL)
- `refreshToken` salvo em `localStorage`. O frontend também seta um cookie httpOnly via route handler Next.js (`/api/auth/session`) para que o middleware possa verificar autenticação no servidor sem expor o token ao JS
- Ao recarregar a página: tenta renovar o `accessToken` com o `refreshToken` automaticamente via `POST /auth/refresh` (a implementar no backend)
- Logout: limpa tokens e redireciona para `/login`

---

## Seção 4 — Stack e scaffolding

```bash
# Criar app Next.js
pnpm create next-app packages/web --typescript --tailwind --app --no-src-dir

# Dependências
pnpm --filter web add @tanstack/react-query @tanstack/react-query-devtools

# shadcn/ui
cd packages/web && pnpm dlx shadcn@latest init
# Componentes usados: button, card, sheet, dialog, badge, calendar, input, label, select, tabs, table
```

**Docker:** O serviço `web` no `docker-compose.yml` está comentado — será descomentado após o scaffolding:
```yaml
web:
  build:
    context: .
    dockerfile: packages/web/Dockerfile
  ports:
    - "3000:3000"
  environment:
    NEXT_PUBLIC_API_URL: http://localhost:3001
  depends_on:
    - api
```

---

## Fora do escopo (desta fase)

- Painel super admin (`app.meuapp.com`)
- Notificações push / email no frontend
- Tema customizável por tenant
- Internacionalização
