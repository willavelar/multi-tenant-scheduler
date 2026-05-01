# Design: Convite por E-mail no Cadastro de Usuários

**Data:** 2026-05-01  
**Status:** Aprovado

---

## Visão Geral

Ao cadastrar um usuário (admin, professional ou client), o formulário oferece a opção "Enviar convite por e-mail" — marcada por padrão. Quando ativa, o campo de senha é ocultado: o sistema gera uma senha aleatória, cria o usuário como inativo (`active = false`) e envia um e-mail com um link de ativação válido por 24h. O usuário clica no link, cadastra sua própria senha e é redirecionado para o login. Usuários inativos não conseguem fazer login (já verificado no `AuthService.validateUser`).

O e-mail de convite é disparado via fila BullMQ para não bloquear a requisição de cadastro.

---

## Arquitetura

### Fila de E-mail (BullMQ)

**Dependências novas:** `@nestjs/bullmq`, `bullmq`

**Módulo:** `packages/api/src/email-queue/`
- `email-queue.module.ts` — registra a fila `email` via `BullModule.registerQueue`, importa `EmailModule`, exporta o producer
- `email-queue.producer.ts` — `EmailQueueProducer` com método `addInviteJob(data)` que enfileira job do tipo `send-invite`
- `email-queue.processor.ts` — `@Processor('email')` que processa jobs `send-invite`, chama `EmailService.sendInvite()`

**Configuração Redis:** `BullModule.forRootAsync` no `AppModule`, reutilizando `REDIS_URL` do ambiente. O worker sobe automaticamente com o processo NestJS — nenhuma mudança no `docker-compose.yml` necessária.

**Retentativas:** 3 tentativas com backoff exponencial (`{ attempts: 3, backoff: { type: 'exponential', delay: 5000 } }`).

### EmailService

Novo método:
```
sendInvite(to: string, inviteUrl: string): Promise<void>
```
HTML do e-mail: título "Você foi convidado", instrução para cadastrar senha, link de ativação válido por 24h.

---

## Fluxo de Convite (Backend)

### DTOs

Cada create DTO (`CreateAdminDto`, `CreateProfessionalDto`, `CreateClientDto`) recebe:
- `sendInvite?: boolean` — opcional, padrão implícito `false` no DTO (o frontend envia `true` por padrão)
- `password` — passa a ser condicional: obrigatório quando `sendInvite` é falso, ignorado quando `sendInvite` é verdadeiro

Validação com class-validator: usar `@ValidateIf(o => !o.sendInvite)` no campo `password`.

### Services (admins, professionals, clients)

Quando `sendInvite = true`:
1. Gerar senha aleatória: `randomBytes(16).toString('hex')`
2. Criar usuário com `active = false` e a senha aleatória hasheada
3. Gerar token: `randomBytes(32).toString('hex')`
4. Salvar no Redis: chave `password:invite:${token}`, TTL 86400s, payload `{ userId, email, tenantId }`
5. Enfileirar job `send-invite` via `EmailQueueProducer`

Quando `sendInvite = false` (comportamento atual):
- Criar usuário com `active = true` e a senha fornecida

### Endpoint de Ativação

`POST /auth/activate-account` (sem autenticação)  
Body: `{ token: string, newPassword: string }`

1. `redis.getdel('password:invite:${token}')` — atômico, uso único
2. Se nulo: `BadRequestException('Token inválido ou expirado')`
3. `newPassword.length < 6`: `BadRequestException('A senha deve ter no mínimo 6 caracteres')`
4. Atualizar usuário: `passwordHash = bcrypt.hash(newPassword)`, `active = true`
5. Retornar `{ message: 'Conta ativada com sucesso' }`

**Validação de token** (já existe): `GET /auth/reset-password/validate?token=` — reutilizado pela página de ativação para verificar o token antes de exibir o formulário. O prefixo Redis é diferente (`password:invite:` vs `password:reset:`), então é necessário que o validate endpoint consulte ambos os prefixos, ou criar um endpoint de validação separado.

> **Decisão:** Criar `GET /auth/invite/validate?token=` separado para evitar acoplamento entre os dois fluxos.

---

## Frontend

### Formulários de Cadastro

Nos três formulários (`/admins/new`, `/professionals/new`, `/clients/new`):
- Adicionar toggle/checkbox "Enviar convite por e-mail" com `defaultChecked={true}` (marcado por padrão)
- Quando marcado: campo de senha desaparece, `sendInvite: true` vai no body
- Quando desmarcado: campo de senha aparece, `sendInvite: false` vai no body

### Nova Página `/[slug]/activate-account`

Baseada em `/[slug]/reset-password`. Diferenças:
- Título: "Cadastrar senha" em vez de "Nova senha"
- Valida token via `GET /auth/invite/validate?token=`
- Submete para `POST /auth/activate-account`
- Banner de sucesso: "Senha cadastrada com sucesso. Faça login para continuar."
- Ao sucesso: redireciona para `/login?banner=account_activated`

**Estados da página:**
- Carregando validação do token
- Token inválido/expirado: mensagem de erro, sem formulário
- Formulário: dois campos ("Nova senha", "Confirmar senha") + botão "Cadastrar senha"
- Sucesso: redireciona para login

---

## Segurança

- Token de 256 bits (32 bytes hex) — mesma entropia do reset de senha
- `getdel` garante uso único atômico
- TTL de 24h no Redis
- Usuário permanece inativo até ativar — não consegue fazer login
- Senha aleatória gerada com `crypto.randomBytes` — nunca exposta
- Prefixo `password:invite:` separado do `password:reset:` — evita cross-use de tokens

---

## Não está no escopo

- Reenvio de convite
- Expiração da conta se o convite nunca for aceito
- Notificação ao admin quando o convite é aceito
