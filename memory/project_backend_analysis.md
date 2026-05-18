---
name: project-backend-analysis
description: Análise do backend scheduler — bugs críticos identificados e specs criadas por item
metadata:
  type: project
---

Análise gerada em 2026-05-17 cobre módulos: auth, oauth, professionals, clients, appointments, availability, services, tenants, admins, notifications, email, email-queue.

**Why:** Auditoria de segurança e corretude antes de escalar o produto — foco em RLS/multi-tenancy e race conditions.

**How to apply:** Ao trabalhar em qualquer módulo listado abaixo, verificar se o item crítico associado já foi resolvido antes de propor mudanças na mesma área.

## Itens Críticos — Status de Specs

| # | Item | Spec |
|---|---|---|
| 1 | [AUTH] refresh/logout fora de withTenant | `.specs/features/auth-refresh-tenant-context/` |
| 2 | [TENANTS] findCurrent/update fora de withTenant | `.specs/features/tenants-rls-coverage/` |
| 3 | [OAUTH] resolveTenantId fora de withTenant | `.specs/features/oauth-resolve-tenant-bootstrap/` |
| 4 | [APPOINTMENTS] Race condition slot check vs insert | `.specs/features/appointments-double-booking-fix/` ← spec criada hoje |
| 5 | [APPOINTMENTS] completed bloqueado por allowPaidStatus | Sem spec ainda |

## Itens Importantes sem Spec

- [AVAILABILITY] exceptions expostas a qualquer client (falta @Roles)
- [AUTH] GET /auth/clients no módulo errado + limite hardcoded 20 → `.specs/features/clients-search-endpoint-relocation/` ← spec criada hoje
- [SERVICES] DELETE sem filtro explícito de tenantId em appointments
- [CLIENTS] professional acessa dados de qualquer client sem ownership check
- [AVAILABILITY] assertOwnsProfessional sem tenantId
- [AUTH] activateAccount/resetPassword sem cross-check tenantId
