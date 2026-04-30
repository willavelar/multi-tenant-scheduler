# Forgot Password — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement fluxo completo de "Esqueceu a senha?" com reset via e-mail (Resend), token armazenado no Redis (24h, single-use) e páginas Next.js para solicitar e confirmar nova senha.

**Architecture:** Backend — 3 novos endpoints em `AuthController` (`POST /auth/forgot-password`, `GET /auth/reset-password/validate`, `POST /auth/reset-password`) implementados em `AuthService` com injeção de Redis e novo `EmailService`. Frontend — 2 novas páginas (`/forgot-password`, `/reset-password`) e ajustes na tela de login. Regra de senha unificada em 6 chars.

**Tech Stack:** NestJS, Drizzle ORM, ioredis, Resend SDK (`resend`), Next.js 16, react-hook-form, zod/v3, TanStack Query (não usado nas novas páginas — chamadas diretas via `apiFetch`).

---

## Mapa de arquivos

| Arquivo | Ação |
|---|---|
| `packages/api/src/email/email.module.ts` | Criar |
| `packages/api/src/email/email.service.ts` | Criar |
| `packages/api/src/email/email.service.spec.ts` | Criar |
| `packages/api/src/auth/dto/forgot-password.dto.ts` | Criar |
| `packages/api/src/auth/dto/reset-password.dto.ts` | Criar |
| `packages/api/src/auth/auth.service.ts` | Modificar — constructor + 3 métodos |
| `packages/api/src/auth/auth.service.spec.ts` | Modificar — novos describes + fix buildService |
| `packages/api/src/auth/auth.controller.ts` | Modificar — 3 endpoints |
| `packages/api/src/auth/auth.module.ts` | Modificar — importar EmailModule |
| `packages/api/src/auth/dto/register.dto.ts` | Modificar — MinLength 8 → 6 |
| `packages/api/.env` | Modificar — 3 novas vars |
| `packages/web/src/app/(tenant)/forgot-password/page.tsx` | Criar |
| `packages/web/src/app/(tenant)/reset-password/page.tsx` | Criar |
| `packages/web/src/app/(tenant)/login/page.tsx` | Modificar — link + banner |
| `packages/web/src/app/(tenant)/register/page.tsx` | Modificar — min 8 → 6 |

---

### Task 1: Instalar resend e configurar variáveis de ambiente

**Files:**
- Modify: `packages/api/package.json` (via pnpm)
- Modify: `packages/api/.env`

- [ ] **Step 1: Instalar o pacote resend na API**

```bash
pnpm --filter api add resend
```

Resultado esperado: linha `"resend": "^4.x"` adicionada em `packages/api/package.json`.

- [ ] **Step 2: Adicionar variáveis de ambiente**

Abra `packages/api/.env` e adicione ao final:

```env
RESEND_API_KEY=re_COLOQUE_SUA_CHAVE_AQUI
RESEND_FROM_EMAIL=noreply@scheduler.app
FRONTEND_BASE_DOMAIN=localhost:3000
```

> Em produção, `FRONTEND_BASE_DOMAIN` seria o domínio real (ex: `scheduler.app`). Localmente, pode usar qualquer valor — o e-mail não é enviado de verdade com a chave de teste do Resend.

- [ ] **Step 3: Commit**

```bash
git add packages/api/package.json packages/api/pnpm-lock.yaml packages/api/.env
git commit -m "chore(api): add resend dependency and env vars for forgot-password"
```

---

### Task 2: EmailService (TDD)

**Files:**
- Create: `packages/api/src/email/email.service.spec.ts`
- Create: `packages/api/src/email/email.service.ts`
- Create: `packages/api/src/email/email.module.ts`

- [ ] **Step 1: Escrever o teste com falha**

Crie `packages/api/src/email/email.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

const mockSend = jest.fn().mockResolvedValue({ data: { id: 'msg-1' }, error: null });

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'RESEND_API_KEY') return 're_test';
              if (key === 'RESEND_FROM_EMAIL') return 'noreply@test.com';
              return undefined;
            }),
          },
        },
      ],
    }).compile();
    service = module.get(EmailService);
    jest.clearAllMocks();
  });

  it('envia e-mail com link de reset via Resend', async () => {
    await service.sendPasswordReset(
      'user@example.com',
      'https://acme.scheduler.app/reset-password?token=abc123',
    );
    expect(mockSend).toHaveBeenCalledWith({
      from: 'noreply@test.com',
      to: 'user@example.com',
      subject: 'Redefinição de senha',
      html: expect.stringContaining('https://acme.scheduler.app/reset-password?token=abc123'),
    });
  });
});
```

- [ ] **Step 2: Executar o teste — deve falhar**

```bash
pnpm test:api --testPathPattern=email.service.spec
```

Resultado esperado: FAIL — `Cannot find module './email.service'`.

- [ ] **Step 3: Criar EmailService**

Crie `packages/api/src/email/email.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(config.get<string>('RESEND_API_KEY'));
    this.from = config.get<string>('RESEND_FROM_EMAIL') ?? 'noreply@scheduler.app';
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Redefinição de senha',
      html: `
        <p>Você solicitou a redefinição de senha.</p>
        <p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a></p>
        <p>Este link é válido por 24 horas. Se você não solicitou isso, ignore este e-mail.</p>
      `,
    });
  }
}
```

- [ ] **Step 4: Criar EmailModule**

Crie `packages/api/src/email/email.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
```

- [ ] **Step 5: Executar o teste — deve passar**

```bash
pnpm test:api --testPathPattern=email.service.spec
```

Resultado esperado: PASS — 1 teste passando.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/email/
git commit -m "feat(api): add EmailService with Resend integration"
```

---

### Task 3: Unificar regra de senha (min 6 chars)

**Files:**
- Modify: `packages/api/src/auth/dto/register.dto.ts`
- Modify: `packages/web/src/app/(tenant)/register/page.tsx`

- [ ] **Step 1: Atualizar register.dto.ts**

Em `packages/api/src/auth/dto/register.dto.ts`, troque `@MinLength(8)` por `@MinLength(6)`:

```ts
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
```

- [ ] **Step 2: Atualizar schema Zod do register/page.tsx**

Em `packages/web/src/app/(tenant)/register/page.tsx`, linha 15, troque:

```ts
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
```

por:

```ts
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
```

Também troque o placeholder no campo de senha (linha ~165):

```tsx
placeholder="Mínimo 6 caracteres"
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/auth/dto/register.dto.ts packages/web/src/app/\(tenant\)/register/page.tsx
git commit -m "fix(api/web): unify password minimum length to 6 chars"
```

---

### Task 4: AuthService.forgotPassword (TDD)

**Files:**
- Modify: `packages/api/src/auth/auth.service.spec.ts`
- Modify: `packages/api/src/auth/auth.service.ts`

- [ ] **Step 1: Adicionar imports e novo describe ao arquivo de testes**

No topo de `packages/api/src/auth/auth.service.spec.ts`, adicione os novos imports:

```ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { REDIS } from '../redis/redis.module';
```

> Os imports `Test`, `UnauthorizedException`, `JwtService`, `ConfigService`, `bcrypt`, `createHash`, `AuthService`, `DB` já existem — não duplique.

Ainda em `auth.service.spec.ts`, adicione ao final do arquivo o novo describe block:

```ts
describe('AuthService.forgotPassword', () => {
  const mockRedis = {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    del: jest.fn(),
  };
  const mockEmailService = { sendPasswordReset: jest.fn().mockResolvedValue(undefined) };

  async function buildService(db: unknown) {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: db },
        { provide: REDIS, useValue: mockRedis },
        { provide: EmailService, useValue: mockEmailService },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('scheduler.app') } },
      ],
    }).compile();
    return module.get(AuthService);
  }

  beforeEach(() => jest.clearAllMocks());

  it('lança NotFoundException quando e-mail não existe no tenant', async () => {
    const service = await buildService(makeSimpleDb([]));
    await expect(service.forgotPassword('x@y.com', 'tenant-1', 'acme'))
      .rejects.toThrow(NotFoundException);
  });

  it('gera token Redis e envia e-mail quando usuário existe', async () => {
    const service = await buildService(makeSimpleDb([{ id: 'user-1', email: 'a@b.com' }]));
    await service.forgotPassword('a@b.com', 'tenant-1', 'acme');

    expect(mockRedis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^password:reset:/),
      expect.stringContaining('"userId":"user-1"'),
      'EX',
      86400,
    );
    expect(mockEmailService.sendPasswordReset).toHaveBeenCalledWith(
      'a@b.com',
      expect.stringContaining('/reset-password?token='),
    );
  });
});
```

- [ ] **Step 2: Executar — deve falhar**

```bash
pnpm test:api --testPathPattern=auth.service.spec
```

Resultado esperado: FAIL — `service.forgotPassword is not a function`.

- [ ] **Step 3: Atualizar auth.service.ts**

**3a. Substituir a linha de imports do NestJS** (linha 1) para incluir `BadRequestException`, `NotFoundException`:

```ts
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
```

**3b. Adicionar novos imports após os existentes**:

```ts
import { randomBytes } from 'crypto';
import Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';
import { EmailService } from '../email/email.service';
```

**3c. Atualizar o constructor** para incluir Redis e EmailService:

```ts
constructor(
  @Inject(DB) private readonly db: DrizzleDB,
  private readonly jwtService: JwtService,
  private readonly config: ConfigService,
  @Inject(REDIS) private readonly redis: Redis,
  private readonly emailService: EmailService,
) {}
```

**3d. Adicionar o método `forgotPassword`** após o método `listClients`:

```ts
async forgotPassword(email: string, tenantId: string, slug: string): Promise<void> {
  const user = await withTenant(this.db, tenantId, async (tx) => {
    const [found] = await tx
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(and(eq(users.email, email), eq(users.tenantId, tenantId)));
    return found ?? null;
  });

  if (!user) throw new NotFoundException('Nenhum usuário encontrado com este e-mail');

  const token = randomBytes(32).toString('hex');
  await this.redis.set(
    `password:reset:${token}`,
    JSON.stringify({ userId: user.id, email: user.email, tenantId }),
    'EX',
    86400,
  );

  const domain = this.config.get<string>('FRONTEND_BASE_DOMAIN');
  const resetUrl = `https://${slug}.${domain}/reset-password?token=${token}`;
  await this.emailService.sendPasswordReset(user.email, resetUrl);
}
```

**3e. Corrigir buildService nos describes existentes** — como o constructor agora requer `REDIS` e `EmailService`, todos os `buildService` existentes precisam provê-los. Atualize CADA função `buildService` nos describes já existentes (`validateUser`, `generateTokens`, `refresh`, `logout`) adicionando:

```ts
{ provide: REDIS, useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() } },
{ provide: EmailService, useValue: { sendPasswordReset: jest.fn() } },
```

Exemplo — describe `AuthService.validateUser`, o `buildService` deve ficar:

```ts
async function buildService(db: unknown) {
  const module = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: DB, useValue: db },
      { provide: REDIS, useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() } },
      { provide: EmailService, useValue: { sendPasswordReset: jest.fn() } },
      { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
      { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
    ],
  }).compile();
  return module.get(AuthService);
}
```

Repita esse padrão para os describes: `generateTokens`, `refresh` e `logout`.

> Atenção: o describe `refresh` tem um segundo buildService inline para o teste de JWT inválido — atualize-o também.

- [ ] **Step 4: Executar — deve passar**

```bash
pnpm test:api --testPathPattern=auth.service.spec
```

Resultado esperado: todos os testes PASS (incluindo os pré-existentes).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/auth/auth.service.ts packages/api/src/auth/auth.service.spec.ts
git commit -m "feat(api): add AuthService.forgotPassword with Redis token and email"
```

---

### Task 5: AuthService.validateResetToken + resetPassword (TDD)

**Files:**
- Modify: `packages/api/src/auth/auth.service.spec.ts`
- Modify: `packages/api/src/auth/auth.service.ts`

- [ ] **Step 1: Adicionar testes para validateResetToken e resetPassword**

Adicione ao final de `auth.service.spec.ts`:

```ts
describe('AuthService.validateResetToken', () => {
  const mockRedis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

  async function buildService() {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: makeSimpleDb([]) },
        { provide: REDIS, useValue: mockRedis },
        { provide: EmailService, useValue: { sendPasswordReset: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();
    return module.get(AuthService);
  }

  beforeEach(() => jest.clearAllMocks());

  it('lança BadRequestException quando token não existe no Redis', async () => {
    mockRedis.get.mockResolvedValue(null);
    const service = await buildService();
    await expect(service.validateResetToken('invalid-token'))
      .rejects.toThrow(BadRequestException);
  });

  it('retorna email quando token é válido', async () => {
    mockRedis.get.mockResolvedValue(
      JSON.stringify({ userId: 'u1', email: 'a@b.com', tenantId: 't1' }),
    );
    const service = await buildService();
    const result = await service.validateResetToken('valid-token');
    expect(result).toEqual({ email: 'a@b.com' });
    expect(mockRedis.get).toHaveBeenCalledWith('password:reset:valid-token');
  });
});

describe('AuthService.resetPassword', () => {
  const mockRedis = { get: jest.fn(), set: jest.fn(), del: jest.fn().mockResolvedValue(1) };

  async function buildService(db: unknown) {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: db },
        { provide: REDIS, useValue: mockRedis },
        { provide: EmailService, useValue: { sendPasswordReset: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();
    return module.get(AuthService);
  }

  beforeEach(() => jest.clearAllMocks());

  it('lança BadRequestException quando token não existe', async () => {
    mockRedis.get.mockResolvedValue(null);
    const service = await buildService(makeSimpleDb([]));
    await expect(service.resetPassword('bad-token', 'newpass123'))
      .rejects.toThrow(BadRequestException);
  });

  it('atualiza passwordHash e deleta o token do Redis', async () => {
    mockRedis.get.mockResolvedValue(
      JSON.stringify({ userId: 'u1', email: 'a@b.com', tenantId: 't1' }),
    );
    const chain = makeChain((resolve) => resolve([]));
    const db = makeMockDb(chain);
    const updateSpy = db['update'] as jest.Mock;

    const service = await buildService(db);
    await service.resetPassword('valid-token', 'newpass123');

    expect(updateSpy).toHaveBeenCalled();
    expect(mockRedis.del).toHaveBeenCalledWith('password:reset:valid-token');
  });
});
```

- [ ] **Step 2: Executar — deve falhar**

```bash
pnpm test:api --testPathPattern=auth.service.spec
```

Resultado esperado: FAIL — `service.validateResetToken is not a function`.

- [ ] **Step 3: Implementar os dois métodos em auth.service.ts**

Adicione após `forgotPassword`:

```ts
async validateResetToken(token: string): Promise<{ email: string }> {
  const raw = await this.redis.get(`password:reset:${token}`);
  if (!raw) throw new BadRequestException('Token inválido ou expirado');
  const { email } = JSON.parse(raw) as { userId: string; email: string; tenantId: string };
  return { email };
}

async resetPassword(token: string, newPassword: string): Promise<void> {
  const raw = await this.redis.get(`password:reset:${token}`);
  if (!raw) throw new BadRequestException('Token inválido ou expirado');
  const { userId, tenantId } = JSON.parse(raw) as { userId: string; email: string; tenantId: string };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await withTenant(this.db, tenantId, (tx) =>
    tx.update(users).set({ passwordHash }).where(eq(users.id, userId)),
  );
  await this.redis.del(`password:reset:${token}`);
}
```

- [ ] **Step 4: Executar — deve passar**

```bash
pnpm test:api --testPathPattern=auth.service.spec
```

Resultado esperado: todos os testes PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/auth/auth.service.ts packages/api/src/auth/auth.service.spec.ts
git commit -m "feat(api): add validateResetToken and resetPassword to AuthService"
```

---

### Task 6: DTOs, Controller endpoints e wiring do módulo

**Files:**
- Create: `packages/api/src/auth/dto/forgot-password.dto.ts`
- Create: `packages/api/src/auth/dto/reset-password.dto.ts`
- Modify: `packages/api/src/auth/auth.controller.ts`
- Modify: `packages/api/src/auth/auth.module.ts`

- [ ] **Step 1: Criar forgot-password.dto.ts**

```ts
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}
```

- [ ] **Step 2: Criar reset-password.dto.ts**

```ts
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
```

- [ ] **Step 3: Adicionar os 3 endpoints ao auth.controller.ts**

Adicione os imports necessários no topo de `auth.controller.ts`:

```ts
import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
```

> Substitua a linha de import existente do `@nestjs/common` pela versão acima (que adiciona `Headers` e `Get`). Os demais imports já existem.

Adicione os 3 métodos ao `AuthController` (após o método `logout`):

```ts
@Post('forgot-password')
@HttpCode(204)
forgotPassword(
  @Body() dto: ForgotPasswordDto,
  @TenantId() tenantId: string | undefined,
  @Headers('x-tenant-slug') slug: string,
) {
  if (!tenantId) throw new BadRequestException('x-tenant-slug header is required');
  return this.authService.forgotPassword(dto.email, tenantId, slug);
}

@Get('reset-password/validate')
validateResetToken(@Query('token') token: string) {
  if (!token) throw new BadRequestException('token query param is required');
  return this.authService.validateResetToken(token);
}

@Post('reset-password')
@HttpCode(204)
resetPassword(@Body() dto: ResetPasswordDto) {
  return this.authService.resetPassword(dto.token, dto.newPassword);
}
```

- [ ] **Step 4: Importar EmailModule em auth.module.ts**

Em `packages/api/src/auth/auth.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    EmailModule,
  ],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 5: Verificar que os testes ainda passam**

```bash
pnpm test:api
```

Resultado esperado: todos os testes PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/auth/dto/forgot-password.dto.ts \
        packages/api/src/auth/dto/reset-password.dto.ts \
        packages/api/src/auth/auth.controller.ts \
        packages/api/src/auth/auth.module.ts
git commit -m "feat(api): add forgot-password and reset-password endpoints"
```

---

### Task 7: Frontend — página /forgot-password

**Files:**
- Create: `packages/web/src/app/(tenant)/forgot-password/page.tsx`

- [ ] **Step 1: Criar a página**

Crie `packages/web/src/app/(tenant)/forgot-password/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useTenant } from '@/providers/TenantProvider'
import { apiFetch, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const schema = z.object({
  email: z.string().email('Informe um e-mail válido'),
})

type FormData = z.infer<typeof schema>

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  )
}

export default function ForgotPasswordPage() {
  const { slug } = useTenant()
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await apiFetch('/auth/forgot-password', {
        slug,
        method: 'POST',
        body: JSON.stringify({ email: data.email }),
      })
      setSubmittedEmail(data.email)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('email', { message: 'Nenhum usuário encontrado com este e-mail' })
      } else {
        setError('root', { message: 'Erro ao enviar o e-mail. Tente novamente.' })
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-3 duration-300">

        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-gray-900 m-0 mb-2 tracking-[-0.015em]">
            Esqueceu a senha?
          </h1>
          <p className="text-sm text-gray-500 m-0">
            Informe seu e-mail para receber o link de redefinição
          </p>
        </div>

        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]">

          {submittedEmail ? (
            <div className="text-center py-2">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-2">Verifique seu e-mail</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Enviamos um link para <strong className="text-gray-700">{submittedEmail}</strong>.
                O link é válido por 24 horas.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>

              <div className="mb-5">
                <label htmlFor="email" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  {...register('email')}
                  className={cn(
                    'w-full h-[46px] px-3.5 text-sm text-gray-900 bg-white rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 box-border',
                    errors.email ? 'border-red-400' : 'border-gray-200',
                  )}
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-500 animate-in fade-in slide-in-from-top-1.5 duration-200">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {errors.root && (
                <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-1.5 duration-200">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {errors.root.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[46px] bg-blue-600 text-white font-semibold rounded-lg border-0 cursor-pointer flex items-center justify-center gap-2 hover:bg-blue-700 hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-65 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? <><Spinner />Enviando...</> : 'Enviar link'}
              </button>

            </form>
          )}

        </div>

        <p className="text-center mt-5 text-[13px] text-gray-500">
          Lembrou a senha?{' '}
          <a href="./login" className="text-blue-600 font-semibold no-underline hover:underline">
            Entrar
          </a>
        </p>

      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/app/\(tenant\)/forgot-password/
git commit -m "feat(web): add forgot-password page"
```

---

### Task 8: Frontend — página /reset-password

**Files:**
- Create: `packages/web/src/app/(tenant)/reset-password/page.tsx`

- [ ] **Step 1: Criar a página**

Crie `packages/web/src/app/(tenant)/reset-password/page.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTenant } from '@/providers/TenantProvider'
import { apiFetch, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const schema = z.object({
  newPassword: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

type TokenState = 'loading' | 'invalid' | 'valid'

export default function ResetPasswordPage() {
  const { slug } = useTenant()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [tokenState, setTokenState] = useState<TokenState>('loading')
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!token) {
      setTokenState('invalid')
      return
    }
    apiFetch(`/auth/reset-password/validate?token=${encodeURIComponent(token)}`, { slug })
      .then((res) => res.json())
      .then(({ email: e }: { email: string }) => {
        setEmail(e)
        setTokenState('valid')
      })
      .catch(() => setTokenState('invalid'))
  }, [token, slug])

  async function onSubmit(data: FormData) {
    try {
      await apiFetch('/auth/reset-password', {
        slug,
        method: 'POST',
        body: JSON.stringify({ token, newPassword: data.newPassword }),
      })
      router.push('/login?reason=password_reset')
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError('root', { message: 'Token inválido ou expirado. Solicite um novo link.' })
      } else {
        setError('root', { message: 'Erro ao alterar a senha. Tente novamente.' })
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-3 duration-300">

        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-gray-900 m-0 mb-2 tracking-[-0.015em]">
            Nova senha
          </h1>
          <p className="text-sm text-gray-500 m-0">
            Crie uma nova senha para sua conta
          </p>
        </div>

        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]">

          {tokenState === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Spinner size={28} />
              <p className="text-sm text-gray-500">Validando link…</p>
            </div>
          )}

          {tokenState === 'invalid' && (
            <div className="text-center py-2">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-2">Link inválido ou expirado</p>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Este link de redefinição não é mais válido. Solicite um novo.
              </p>
              <a
                href="./forgot-password"
                className="inline-flex items-center justify-center w-full h-[46px] bg-blue-600 text-white font-semibold rounded-lg no-underline hover:bg-blue-700 hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:-translate-y-px transition-all"
              >
                Solicitar novo link
              </a>
            </div>
          )}

          {tokenState === 'valid' && (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>

              <div className="mb-4">
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full h-[46px] px-3.5 text-sm text-gray-400 bg-gray-50 rounded-lg border border-gray-200 box-border cursor-not-allowed"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="newPassword" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    {...register('newPassword')}
                    className={cn(
                      'w-full h-[46px] pl-3.5 pr-[42px] text-sm text-gray-900 bg-white rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 box-border',
                      errors.newPassword ? 'border-red-400' : 'border-gray-200',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-gray-400 hover:text-gray-700 hover:scale-110 active:scale-90 transition-all bg-transparent border-0 p-0 cursor-pointer"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="mt-1.5 text-xs text-red-500 animate-in fade-in slide-in-from-top-1.5 duration-200">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="mb-5">
                <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                    className={cn(
                      'w-full h-[46px] pl-3.5 pr-[42px] text-sm text-gray-900 bg-white rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 box-border',
                      errors.confirmPassword ? 'border-red-400' : 'border-gray-200',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-gray-400 hover:text-gray-700 hover:scale-110 active:scale-90 transition-all bg-transparent border-0 p-0 cursor-pointer"
                    aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-500 animate-in fade-in slide-in-from-top-1.5 duration-200">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {errors.root && (
                <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-1.5 duration-200">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {errors.root.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[46px] bg-blue-600 text-white font-semibold rounded-lg border-0 cursor-pointer flex items-center justify-center gap-2 hover:bg-blue-700 hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-65 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? <><Spinner />Salvando...</> : 'Salvar nova senha'}
              </button>

            </form>
          )}

        </div>

      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/app/\(tenant\)/reset-password/
git commit -m "feat(web): add reset-password page with token validation"
```

---

### Task 9: Frontend — atualizar login page e register page

**Files:**
- Modify: `packages/web/src/app/(tenant)/login/page.tsx`

- [ ] **Step 1: Corrigir o link "Esqueceu a senha?" no login**

Em `packages/web/src/app/(tenant)/login/page.tsx`, linha ~141, troque:

```tsx
                <a
                  href="#"
                  className="text-xs text-blue-600 no-underline font-medium hover:underline"
                >
                  Esqueceu a senha?
                </a>
```

por:

```tsx
                <a
                  href="./forgot-password"
                  className="text-xs text-blue-600 no-underline font-medium hover:underline"
                >
                  Esqueceu a senha?
                </a>
```

- [ ] **Step 2: Adicionar banner de senha alterada ao login**

No login, há o banner de sessão expirada (linhas ~97-106) que usa `reason === 'session_expired'`. Logo após esse bloco, adicione o banner verde:

```tsx
        {reason === 'password_reset' && (
          <div className="mb-5 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-[13px] text-green-800 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 text-green-600">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Senha alterada com sucesso. Faça login para continuar.
          </div>
        )}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/\(tenant\)/login/page.tsx
git commit -m "feat(web): wire forgot-password link and add password_reset banner to login"
```

---

## Self-review

**Cobertura da spec:**
- ✅ Tela "Esqueceu a senha?" — mesmo template do login
- ✅ Validação de e-mail não encontrado no tenant (404 inline)
- ✅ Token Redis 24h, single-use (deletado após reset)
- ✅ Link de e-mail com token (`/reset-password?token=…`)
- ✅ Tela "Nova senha" — validação do token na carga (GET validate)
- ✅ Token inválido/expirado → estado de erro com botão para novo link
- ✅ E-mail desabilitado informativo
- ✅ Nova senha + Confirmar nova senha (mín. 6 chars)
- ✅ Após reset → redirect `/login?reason=password_reset`
- ✅ Banner verde "Senha alterada" no login
- ✅ Regra de senha mín. 6 chars unificada (register.dto, register/page)
- ✅ EmailService com Resend
- ✅ Novas variáveis de ambiente documentadas
