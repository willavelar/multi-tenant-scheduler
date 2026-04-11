# Scheduler — Design Spec (Revisado)

**Data:** 2026-04-10
**Stack:** NestJS · Next.js · PostgreSQL · Redis · Docker
**ORM:** Drizzle (SQL-first)
**UI:** shadcn/ui + Tailwind CSS
**Estrutura:** Monorepo com pnpm workspaces

---

## Visão Geral

Sistema de agendamento multi-tenant voltado para clínicas e personal trainers. O super admin (operador do sistema) cadastra os tenants via seed/script na fase 1. Cada tenant configura seus profissionais, serviços e disponibilidade. Os clientes finais criam conta e fazem agendamentos diretamente pelo subdomínio do tenant.

---

## Atores

| Ator | Descrição |
|------|-----------|
| **Super Admin** | Operador do sistema — cria tenants via seed/script (fase 1), painel próprio na fase 2 |
| **Tenant Admin** | Dono da clínica/academia — configura profissionais, serviços e agenda |
| **Profissional** | Membro do tenant com agenda própria — faz login para gerenciar disponibilidade e agendamentos. Um `tenant_admin` pode opcionalmente ter um registro em `professionals` se também atender clientes, mas isso não é automático nem obrigatório. |
| **Cliente** | Paciente/aluno — cria conta, visualiza slots livres e faz agendamentos |

---

## Estrutura do Repositório

Monorepo com pnpm workspaces:

```
scheduler/
  packages/
    api/        ← NestJS (porta 3001)
    web/        ← Next.js App Router (porta 3000)
    shared/     ← Tipos TypeScript compartilhados (DTOs, enums, schemas Drizzle)
  docker-compose.yml
  pnpm-workspace.yaml
```

O pacote `shared` elimina duplicação de tipos entre backend e frontend — DTOs de request/response, enums de status e role, e os schemas Drizzle são definidos aqui e importados pelos dois lados.

---

## URLs e Roteamento

- `app.lvh.me` — painel super admin (fase 2)
- `{slug}.lvh.me` — área pública + admin do tenant

`*.lvh.me` resolve para `127.0.0.1` sem configuração local — ideal para desenvolvimento com Docker.

O middleware Next.js detecta o subdomínio em cada request:
- Subdomínio `app` → contexto super admin
- Qualquer outro subdomínio → resolve o slug como tenant, injeta header `X-Tenant-Slug` nas chamadas à API
- Root domain → redireciona

---

## Estratégia Multi-Tenant

**Row-level isolation** com tabelas compartilhadas e `tenant_id` em cada entidade. Isolamento reforçado em duas camadas:

1. **PostgreSQL Row Level Security (RLS)** — políticas no banco que impedem acesso a linhas de outro tenant
2. **TenantMiddleware no NestJS** — resolve o `tenant_id` a partir do header `X-Tenant-Slug` (com cache Redis), injeta no contexto da request, e um `TenantGuard` garante que toda query filtra pelo `tenant_id` correto

---

## Modelo de Dados

```sql
tenants
  id, slug, name, logo_url, confirmation_mode (auto|manual), created_at

users
  id, tenant_id (NULL para super_admin), email, password_hash
  role (super_admin|tenant_admin|professional|client)
  name, phone, created_at

professionals
  id, tenant_id, user_id, bio, avatar_url, active

services
  id, tenant_id, name, duration_minutes, description, active

weekly_availability
  id, professional_id, day_of_week (0-6), start_time, end_time, slot_duration_minutes

schedule_exceptions
  id, professional_id, date, type (block|extra), start_time, end_time, reason

appointments
  id, tenant_id, professional_id, service_id, client_id
  starts_at, ends_at
  status (pending|confirmed|cancelled|completed)
  notes, created_at

notifications_log                          -- fase 2
  id, appointment_id, channel (email|whatsapp)
  type (confirmation|reminder|cancellation)
  sent_at, status (sent|failed), payload
```

### Geração de Slots Disponíveis

Slots são calculados dinamicamente — não há tabela pré-gerada. Para uma data solicitada:

1. Busca `weekly_availability` do profissional para o dia da semana
2. Remove intervalos bloqueados em `schedule_exceptions` (type=block)
3. Adiciona intervalos extras de `schedule_exceptions` (type=extra)
4. Subtrai agendamentos com status `pending` ou `confirmed`
5. Retorna os slots livres

---

## Backend — Módulos NestJS

| Módulo | Fase | Responsabilidades |
|--------|------|------------------|
| `AuthModule` | 1 | Login, registro, JWT, refresh token, guard de tenant |
| `TenantsModule` | 1 | Resolução do slug por request (cache Redis), seed |
| `UsersModule` | 1 | CRUD de usuários dentro do tenant |
| `ProfessionalsModule` | 1 | CRUD de profissionais, vínculo com usuário |
| `ServicesModule` | 1 | CRUD de serviços (nome, duração) |
| `AvailabilityModule` | 1 | Grade semanal + exceções (bloqueios e horários extras) + geração de slots |
| `AppointmentsModule` | 1 | Criação, confirmação, cancelamento, listagem de slots livres. Verifica `confirmation_mode`: se `auto` → `confirmed`; se `manual` → `pending` até admin aprovar. |
| `NotificationsModule` | 2 | Filas Bull/Redis, envio via Nodemailer e Evolution API |

---

## Frontend — Estrutura de Rotas (Next.js App Router)

```
app/
  (admin)/                        # Super admin — app.lvh.me (fase 2)
    dashboard/
    tenants/

  (tenant)/                       # Contexto do tenant — {slug}.lvh.me
    page.tsx                      # Página pública de agendamento
    login/
    register/
    dashboard/                    # Tenant admin
      professionals/
      services/
      availability/
      appointments/
    professional/                 # Área do profissional
      appointments/
      availability/
    client/                       # Área do cliente
      appointments/
```

### Fluxo do Cliente (agendamento)

1. Acessa `clinica-xyz.lvh.me`
2. Seleciona profissional → serviço → data → slot horário
3. Se não tiver conta, faz registro (nome, email, senha, telefone)
4. Confirma o agendamento
5. Recebe confirmação (notificações na fase 2)

---

## Infraestrutura Docker

```yaml
services:
  api:        # NestJS — porta 3001, hot reload via @nestjs/cli watch
  web:        # Next.js — porta 3000, Turbopack dev mode
  db:         # PostgreSQL 16, volume persistido
  redis:      # Redis 7 — cache de tenant (fase 1) + filas Bull (fase 2)
  evolution:  # Evolution API (WhatsApp) — fase 2
```

Todos os serviços se comunicam pela rede interna Docker. Apenas `web` (3000) e `api` (3001) são expostos ao host. Em produção, um reverse proxy (Nginx ou Traefik) cuida do roteamento de subdomínios com SSL.

---

## Escopo por Fase

### Fase 1 — MVP

- Monorepo scaffolding (pnpm workspaces, packages/api, packages/web, packages/shared)
- Docker Compose com api, web, db, redis
- Multi-tenancy: seed de tenant, TenantMiddleware, RLS no PostgreSQL, cache Redis
- Autenticação JWT (login, registro, refresh token) para todos os roles
- Painel Tenant Admin: CRUD profissionais, serviços, disponibilidade (grade semanal + exceções)
- Página pública de agendamento: seleção de profissional → serviço → data → slot → confirmação
- Área do profissional: visualizar e gerenciar agendamentos
- Área do cliente: histórico e cancelamento de agendamentos

### Fase 2 — Pós-MVP

- Notificações: Nodemailer (email), Evolution API (WhatsApp), Bull queues, notifications_log
- Lembretes automáticos via cron job
- Painel Super Admin com interface (CRUD de tenants)
- Pagamento online, app mobile, relatórios, multi-idioma: fora do escopo

---

## Decisões Técnicas

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Estrutura de repo | Monorepo pnpm workspaces | Compartilhar tipos TS entre api e web via `packages/shared` |
| ORM | Drizzle | SQL-first, excelente com PostgreSQL e RLS, type-safe |
| UI | shadcn/ui + Tailwind CSS | Padrão atual do ecossistema Next.js, componentes sem lock-in |
| Local dev subdomain | `*.lvh.me` | Wildcard DNS para 127.0.0.1 sem configuração local |
| Redis no MVP | Sim | Cache de tenant já justifica; Bull entra na fase 2 sem mudança de infra |
| Super admin fase 1 | Seed/script | Desbloqueio o MVP sem bloquear em painel admin |
