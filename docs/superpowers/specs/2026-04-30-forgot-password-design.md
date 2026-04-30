# Forgot Password — Design Spec

**Data:** 2026-04-30

## Visão geral

Fluxo completo de redefinição de senha, acessível pela tela de login. O tenant é identificado pelo subdomínio (`acme.scheduler.app`), sem slug no path. Tokens de reset são armazenados no Redis com TTL de 24h. E-mails são enviados via Resend.

---

## Fluxo

```
Login → /forgot-password → [e-mail enviado] → /reset-password?token=… → /login?reason=password_reset
```

1. Usuário clica em "Esqueceu a senha?" no login.
2. É levado a `/forgot-password`.
3. Informa o e-mail. API valida se existe no tenant:
   - Não existe → erro de validação inline.
   - Existe → gera token aleatório, salva no Redis (TTL 24h), envia e-mail via Resend.
4. Tela muda para estado de confirmação ("Verifique seu e-mail").
5. Usuário abre e-mail e clica no link: `https://{slug}.{FRONTEND_BASE_DOMAIN}/reset-password?token=…`
6. Página `/reset-password` valida o token na carga:
   - Token ausente ou inválido → estado de erro "Link inválido ou expirado" com botão para `/forgot-password`.
   - Token expirado (TTL Redis esgotado) → mesmo estado de erro.
   - Token válido → exibe formulário.
7. Formulário tem campo de e-mail desabilitado (informativo), "Nova senha" e "Confirmar nova senha".
8. Ao salvar: API atualiza `passwordHash`, deleta token do Redis (single-use). Frontend redireciona para `/login?reason=password_reset`.
9. Tela de login exibe banner verde: "Senha alterada com sucesso. Faça login para continuar."

---

## Regra de senha unificada

Mínimo **6 caracteres** — aplicada em:

- `register.dto.ts` (hoje usa 8, será ajustado para 6)
- `login/page.tsx` schema Zod (já usa 6 — sem mudança)
- `forgot-password/page.tsx` schema Zod (novo)
- `reset-password/page.tsx` schema Zod (novo)

---

## Novas variáveis de ambiente

```env
RESEND_API_KEY=re_…
RESEND_FROM_EMAIL=noreply@scheduler.app
FRONTEND_BASE_DOMAIN=scheduler.app
```

URL do link de reset montada pela API: `https://{tenantSlug}.{FRONTEND_BASE_DOMAIN}/reset-password?token={token}`

---

## Backend (NestJS)

### EmailModule

Novo módulo global `packages/api/src/email/`:

- `email.module.ts` — importa `ConfigModule`, exporta `EmailService`
- `email.service.ts` — injeta `ConfigService`, usa `resend` npm package
- Método: `sendPasswordReset(to: string, resetUrl: string): Promise<void>`
- Template HTML simples inline (sem motor de templates externo)

### Redis — estrutura do token

```
Chave:  password:reset:{token}
Valor:  JSON { userId, email, tenantId }
TTL:    86400s (24h)
```

`slug` não é armazenado — `tenantId` é suficiente para o lookup no banco. O slug é resolvido a partir do subdomínio pelo `TenantMiddleware` e não precisa ser persistido no Redis.

Token gerado com `crypto.randomBytes(32).toString('hex')`.

### Novos endpoints em `AuthController`

#### `POST /auth/forgot-password`

- Header obrigatório: `x-tenant-slug`
- Body: `{ email: string }`
- Busca usuário por `(email, tenantId)` dentro de `withTenant`.
- Se não encontrado: `404 NotFoundException` com mensagem "Nenhum usuário encontrado com este e-mail".
- Se encontrado: gera token, salva no Redis, envia e-mail via `EmailService`, retorna `204`.
- Guard: nenhum (rota pública). `TenantMiddleware` já resolve `tenantId`.

#### `POST /auth/reset-password`

- Body: `{ token: string, newPassword: string }`
- Sem header de tenant (o token Redis já contém `tenantId`).
- Busca chave `password:reset:{token}` no Redis.
- Se não encontrada (inválido ou expirado): `400 BadRequestException`.
- Se encontrada: atualiza `passwordHash` com bcrypt(10) dentro de `withTenant`, deleta a chave do Redis.
- Retorna `204`.
- Guard: nenhum (rota pública).

### DTOs

```ts
// forgot-password.dto.ts
export class ForgotPasswordDto {
  @IsEmail() email: string;
}

// reset-password.dto.ts
export class ResetPasswordDto {
  @IsString() @IsNotEmpty() token: string;
  @IsString() @MinLength(6) newPassword: string;
}
```

---

## Frontend (Next.js)

### Novas páginas

Ambas dentro de `packages/web/src/app/(tenant)/` — mesma rota group do login/register.

#### `/forgot-password/page.tsx`

Estados:
1. **Formulário** — campo de e-mail + botão "Enviar link". Schema Zod: `email` válido.
2. **Erro inline** — campo com borda vermelha + mensagem de validação quando API retorna 404.
3. **Confirmação** — card com ícone verde, texto "Verifique seu e-mail. Enviamos um link para `{email}`. O link é válido por 24 horas." Footer com "Lembrou a senha? Entrar".

Sem estado de loading separado — botão usa `isSubmitting` do react-hook-form.

#### `/reset-password/page.tsx`

Lê `?token` da query string via `useSearchParams`.

Na montagem (`useEffect`): chama `GET /auth/reset-password/validate?token=…` para obter o e-mail associado e validar o token antes de exibir o formulário.

> **Nota:** requer endpoint adicional de validação (ver abaixo).

Estados:
1. **Carregando** — spinner centralizado enquanto valida token.
2. **Inválido/expirado** — card de erro com botão "Solicitar novo link" → `/forgot-password`.
3. **Formulário** — e-mail desabilitado (pré-preenchido com valor retornado pela validação), "Nova senha", "Confirmar nova senha". Schema Zod: `min(6)`, senhas iguais.
4. Ao submit bem-sucedido → `router.push('/login?reason=password_reset')`.

#### Endpoint adicional de validação

`GET /auth/reset-password/validate?token={token}`

- Lê o Redis sem deletar a chave.
- Se válido: retorna `200 { email: string }`.
- Se inválido/expirado: retorna `400`.
- Guard: nenhum (público).

### Login — novo banner

`login/page.tsx` já lida com `?reason=session_expired`. Adicionar caso `password_reset`:

```tsx
{reason === 'password_reset' && (
  <div className="… bg-green-50 border-green-200 text-green-800">
    <CheckIcon />
    Senha alterada com sucesso. Faça login para continuar.
  </div>
)}
```

### Link "Esqueceu a senha?" no login

Trocar `href="#"` por `href="./forgot-password"`.

---

## Regra de senha — ajuste no register

`register.dto.ts`: `@MinLength(8)` → `@MinLength(6)`  
`register/page.tsx` schema Zod: `min(8, …)` → `min(6, …)`, ajustar placeholder de "Mínimo 8 caracteres" para "Mínimo 6 caracteres".

---

## Segurança

- Token Redis é deletado imediatamente após uso (single-use).
- Token gerado com `crypto.randomBytes(32)` — 256 bits de entropia.
- A API retorna 404 explícito quando e-mail não é encontrado (decisão intencional de UX do produto, breaking the "don't reveal user existence" best practice — aceito pelo dono do produto).
- Nenhum endpoint de reset requer autenticação.
- `newPassword` nunca é logado.

---

## Dependências novas

```json
// packages/api
"resend": "^4.x"
```

Sem novas dependências no `packages/web`.
