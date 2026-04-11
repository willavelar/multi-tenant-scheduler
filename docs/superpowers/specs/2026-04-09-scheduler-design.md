# Scheduler — Design Spec

**Data:** 2026-04-09  
**Stack:** NestJS · Next.js · PostgreSQL · Redis · Docker  

---

## Visão Geral

Sistema de agendamento multi-tenant voltado para clínicas e personal trainers. O super admin (operador do sistema) cadastra os tenants. Cada tenant configura seus profissionais, serviços e disponibilidade. Os clientes finais criam conta e fazem agendamentos diretamente pelo subdomínio do tenant.

---

## Atores

| Ator | Descrição |
|------|-----------|
| **Super Admin** | Operador do sistema — cadastra e gerencia tenants via painel próprio |
| **Tenant Admin** | Dono da clínica/academia — configura profissionais, serviços e agenda |
| **Profissional** | Membro do tenant com agenda própria — faz login para gerenciar disponibilidade e agendamentos. O `tenant_admin` pode também ser um profissional (ter seu próprio registro em `professionals`). |
| **Cliente** | Paciente/aluno — cria conta, visualiza slots livres e faz agendamentos |

---

## URLs e Roteamento

- `app.meuapp.com` — painel super admin
- `{slug}.meuapp.com` — área pública + admin do tenant

O middleware Next.js detecta o subdomínio em cada request:
- Subdomínio `app` → contexto super admin
- Qualquer outro subdomínio → resolve o slug como tenant, injeta header `X-Tenant-Slug` nas chamadas à API

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

notifications_log
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

| Módulo | Responsabilidades |
|--------|------------------|
| `AuthModule` | Login, registro, JWT, refresh token, guard de tenant |
| `TenantsModule` | CRUD de tenants (super admin), resolução do slug por request |
| `UsersModule` | CRUD de usuários dentro do tenant |
| `ProfessionalsModule` | CRUD de profissionais, vínculo com usuário |
| `ServicesModule` | CRUD de serviços (nome, duração) |
| `AvailabilityModule` | Grade semanal + exceções (bloqueios e horários extras) |
| `AppointmentsModule` | Criação, confirmação, cancelamento, listagem de slots livres. Ao criar, verifica `confirmation_mode` do tenant: se `auto`, status vai direto para `confirmed`; se `manual`, fica `pending` até o tenant admin aprovar. |
| `NotificationsModule` | Filas Bull/Redis, envio via Nodemailer e Evolution API |

---

## Frontend — Estrutura de Rotas (Next.js)

```
app/
  (admin)/                        # Super admin — app.meuapp.com
    dashboard/
    tenants/

  (tenant)/                       # Contexto do tenant — {slug}.meuapp.com
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

1. Acessa `clinica-xyz.meuapp.com`
2. Seleciona profissional → serviço → data → slot horário
3. Se não tiver conta, faz registro (nome, email, senha, telefone)
4. Confirma o agendamento
5. Recebe confirmação por email + WhatsApp

---

## Notificações

### Arquitetura

Toda notificação passa por uma fila Bull (Redis) antes de ser enviada, evitando bloqueio da resposta da API e permitindo retry automático.

```
AppointmentsModule
  → publica evento na fila (appointment.confirmed | cancelled | reminder)

NotificationsModule (worker)
  → consome a fila
  → envia email via Nodemailer (SMTP)
  → envia WhatsApp via Evolution API
  → registra resultado em notifications_log
```

### Lembretes Automáticos

Job agendado (Bull cron) roda diariamente e enfileira lembretes para agendamentos das próximas 24h.

### Configuração por Tenant

Cada tenant pode configurar:
- SMTP próprio ou usar o SMTP padrão do sistema
- Instância Evolution API própria (número de WhatsApp)

---

## Infraestrutura Docker

```yaml
services:
  api:        # NestJS — porta 3001
  web:        # Next.js — porta 3000
  db:         # PostgreSQL 16
  redis:      # Redis 7 (filas Bull)
  evolution:  # Evolution API (WhatsApp)
```

Todos os serviços se comunicam pela rede interna Docker. Apenas `web` (3000) e `api` (3001) são expostos ao host. Em produção, um reverse proxy (Nginx ou Traefik) cuida do roteamento de subdomínios com SSL.

---

## Fora do Escopo (desta fase)

- Pagamento online
- App mobile
- Relatórios e analytics
- Multi-idioma
