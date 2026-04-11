# Scheduler

Sistema de agendamento online multi-tenant. Clientes agendam serviços com profissionais, administradores gerenciam a agenda, e cada estabelecimento opera de forma completamente isolada.

## Stack

| Camada | Tecnologia |
|---|---|
| **API** | NestJS · Drizzle ORM · Passport JWT |
| **Web** | Next.js 16 (App Router) · TanStack Query · React Hook Form · Zod |
| **Banco** | PostgreSQL 16 com Row-Level Security (RLS) |
| **Cache** | Redis 7 |
| **UI** | shadcn/ui (base-nova) · Tailwind v4 |
| **Infra** | Docker Compose · pnpm workspaces |

## Estrutura do monorepo

```
scheduler/
├── packages/
│   ├── api/          # NestJS REST API (porta 3001)
│   ├── web/          # Next.js frontend (porta 3000)
│   └── shared/       # Schema Drizzle + tipos compartilhados
├── docker-compose.yml
└── .env
```

## Funcionalidades

- **Multi-tenancy** — cada tenant tem slug próprio, dados isolados por RLS no PostgreSQL
- **Wizard de agendamento** — escolha de profissional → serviço → data/horário → confirmação
- **Painel do profissional/admin** — visão da agenda do dia, próximos agendamentos, estatísticas
- **Disponibilidade** — grade semanal por profissional + exceções (folgas, feriados)
- **Controle de acesso** — três roles: `tenant_admin`, `professional`, `client`
- **Modo de confirmação** — `auto` (confirmado imediatamente) ou `manual` (requer aprovação)
- **Auth com JWT** — access token + refresh token, persistência em `localStorage` e cookie

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [pnpm](https://pnpm.io/installation) (para rodar fora do Docker)

## Rodando com Docker

```bash
# Clone o repositório
git clone <repo-url>
cd scheduler

# Crie o arquivo de variáveis de ambiente
cp .env.example .env
# Edite .env e preencha JWT_SECRET e JWT_REFRESH_SECRET

# Suba todos os serviços
docker compose up --build

# Em outro terminal, rode as migrations e o seed
docker compose exec api pnpm --filter api db:migrate
docker compose exec api pnpm --filter api db:seed
```

Acesse:
- **Frontend:** http://localhost:3000
- **API:** http://localhost:3001
- **Banco (externo):** `postgresql://scheduler:scheduler@localhost:5432/scheduler`

## Rodando localmente (sem Docker)

```bash
pnpm install

# Suba apenas banco e Redis via Docker
docker compose up db redis -d

# Copie e edite o .env
cp .env.example .env

# Migrations e seed
pnpm db:migrate
pnpm db:seed

# API e web em paralelo
pnpm dev:api   # terminal 1
pnpm dev:web   # terminal 2
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz com base no exemplo abaixo:

```env
# Banco de dados
DATABASE_URL=postgres://scheduler:scheduler@db:5432/scheduler

# Redis
REDIS_URL=redis://redis:6379

# JWT — use strings longas e aleatórias
JWT_SECRET=troque-por-um-secret-seguro
JWT_REFRESH_SECRET=troque-por-outro-secret-seguro
```

> `NEXT_PUBLIC_API_URL` é definido como build arg no `docker-compose.yml` e baked no bundle do Next.js. Para desenvolvimento local, o padrão `http://localhost:3001` é usado automaticamente.

## Contas de demonstração

Após rodar o seed, o tenant `clinica-demo` é criado com as seguintes contas:

| Role | E-mail | Senha |
|---|---|---|
| Admin | `admin@clinica-demo.com` | `password123` |
| Profissional | `prof@clinica-demo.com` | `password123` |

Acesse: **http://localhost:3000/clinica-demo**

## Comandos úteis

```bash
# Gerar nova migration após alterar o schema
pnpm db:generate

# Aplicar migrations pendentes
pnpm db:migrate

# Rodar o seed (dados de demonstração)
pnpm db:seed

# Testes da API
pnpm test:api

# Testes e2e da API
pnpm test:api:e2e

# Build de produção (via Docker)
docker compose build
```

## Arquitetura

### Multi-tenancy e RLS

Cada requisição à API carrega o header `x-tenant-slug`, resolvido pelo `TenantGuard` para o UUID do tenant. Todas as queries são executadas dentro de uma transação que define `app.current_tenant_id` via `set_config` — ativando as políticas de RLS do PostgreSQL que filtram automaticamente os dados por tenant.

```
Request → TenantGuard (resolve slug → tenantId)
        → withTenant(db, tenantId, fn)
            → BEGIN
            → SELECT set_config('app.current_tenant_id', tenantId, true)
            → fn(tx)   ← RLS filtra automaticamente
            → COMMIT
```

### Módulos da API

| Módulo | Responsabilidade |
|---|---|
| `auth` | Registro, login, geração de JWT |
| `appointments` | CRUD de agendamentos, validação de slot |
| `availability` | Grade semanal e exceções por profissional |
| `professionals` | Gerenciamento de profissionais |
| `services` | Gerenciamento de serviços oferecidos |
| `tenants` | Resolução de tenant por slug |

### Rotas do frontend

| Rota | Acesso | Descrição |
|---|---|---|
| `/:slug` | Público | Wizard de agendamento |
| `/:slug/login` | Público | Login |
| `/:slug/register` | Público | Cadastro (cria cliente) |
| `/:slug/appointments` | Cliente | Lista de agendamentos |
| `/:slug/dashboard` | Admin / Profissional | Painel de controle |

## Licença

MIT
