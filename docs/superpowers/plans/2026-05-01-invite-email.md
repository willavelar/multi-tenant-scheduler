# Invite Email Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Enviar convite por e-mail" option (checked by default) to admin/professional/client registration forms; when selected, generate a random password, create the user as inactive, and send an invite email via BullMQ queue with a 24h token for the user to set their own password.

**Architecture:** BullMQ is wired into the NestJS process (same `api` container) using the existing Redis instance. A `EmailQueueModule` (producer + processor) is imported by the three feature modules that need to enqueue invite jobs. The auth service gains two new endpoints for validating and consuming invite tokens (separate Redis key prefix from password reset). The frontend gains a new `/activate-account` page modeled after `/reset-password`.

**Tech Stack:** NestJS 10, BullMQ + @nestjs/bullmq, ioredis (existing), Resend (existing), Next.js 16 App Router, React Hook Form / Zod (existing patterns)

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `packages/api/src/email-queue/email-queue.module.ts` | Registers BullMQ `email` queue, exports producer |
| `packages/api/src/email-queue/email-queue.producer.ts` | `EmailQueueProducer.addInviteJob()` |
| `packages/api/src/email-queue/email-queue.processor.ts` | Worker: processes `send-invite` jobs |
| `packages/api/src/auth/dto/activate-account.dto.ts` | `{ token, newPassword }` |
| `packages/api/src/auth/dto/validate-invite-token.dto.ts` | `{ token }` |
| `packages/web/src/app/(tenant)/activate-account/page.tsx` | Set-password page for invited users |

### Modified files
| File | Change |
|---|---|
| `packages/api/package.json` | Add `@nestjs/bullmq`, `bullmq` |
| `packages/api/src/app.module.ts` | Add `BullModule.forRootAsync`, import `EmailQueueModule` |
| `packages/api/src/email/email.service.ts` | Add `sendInvite()` |
| `packages/api/src/email/email.service.spec.ts` | Test `sendInvite()` |
| `packages/api/src/auth/auth.service.ts` | Add `validateInviteToken()`, `activateAccount()` |
| `packages/api/src/auth/auth.service.spec.ts` | Tests for new methods |
| `packages/api/src/auth/auth.controller.ts` | Add `GET /auth/invite/validate`, `POST /auth/activate-account` |
| `packages/api/src/admins/dto/create-admin.dto.ts` | Add `sendInvite?`, `@ValidateIf` on `password` |
| `packages/api/src/admins/admins.module.ts` | Import `EmailQueueModule` |
| `packages/api/src/admins/admins.service.ts` | Inject REDIS, ConfigService, EmailQueueProducer; update `create()` |
| `packages/api/src/admins/admins.controller.ts` | Extract slug, pass to `create()` |
| `packages/api/src/professionals/dto/create-professional.dto.ts` | Add `sendInvite?`, `@ValidateIf` on `password` |
| `packages/api/src/professionals/professionals.module.ts` | Import `EmailQueueModule` |
| `packages/api/src/professionals/professionals.service.ts` | Inject REDIS, ConfigService, EmailQueueProducer; update `create()` |
| `packages/api/src/professionals/professionals.controller.ts` | Extract slug, pass to `create()` |
| `packages/api/src/clients/dto/create-client.dto.ts` | Add `sendInvite?`, `@ValidateIf` on `password` |
| `packages/api/src/clients/clients.module.ts` | Import `EmailQueueModule` |
| `packages/api/src/clients/clients.service.ts` | Inject REDIS, ConfigService, EmailQueueProducer; update `create()` |
| `packages/api/src/clients/clients.controller.ts` | Extract slug, pass to `create()` |
| `packages/web/src/hooks/useAdmins.ts` | Make `password?` optional, add `sendInvite?` |
| `packages/web/src/hooks/useProfessionals.ts` | Make `password?` optional, add `sendInvite?` |
| `packages/web/src/hooks/useClients.ts` | Make `password?` optional, add `sendInvite?` |
| `packages/web/src/app/(tenant)/(app)/admins/new/page.tsx` | Pass `sendInvite` to mutation |
| `packages/web/src/app/(tenant)/(app)/admins/_components/AdminForm.tsx` | Add invite toggle, conditional password field |
| `packages/web/src/app/(tenant)/(app)/professionals/new/page.tsx` | Pass `sendInvite` to mutation |
| `packages/web/src/app/(tenant)/(app)/professionals/_components/ProfessionalForm.tsx` | Add invite toggle, conditional password field |
| `packages/web/src/app/(tenant)/(app)/clients/new/page.tsx` | Pass `sendInvite` to mutation |
| `packages/web/src/app/(tenant)/(app)/clients/_components/ClientForm.tsx` | Add invite toggle, conditional password field |
| `packages/web/src/app/(tenant)/login/page.tsx` | Add `account_activated` banner |

---

## Task 1: Install BullMQ and create email-queue infrastructure

**Files:**
- Create: `packages/api/src/email-queue/email-queue.module.ts`
- Create: `packages/api/src/email-queue/email-queue.producer.ts`
- Create: `packages/api/src/email-queue/email-queue.processor.ts`
- Modify: `packages/api/package.json`

- [ ] **Step 1: Install BullMQ packages**

```bash
cd packages/api && pnpm add @nestjs/bullmq bullmq
```

Expected: packages installed, `package.json` updated with both dependencies.

- [ ] **Step 2: Create `email-queue.producer.ts`**

```typescript
// packages/api/src/email-queue/email-queue.producer.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const EMAIL_QUEUE = 'email';

export interface InviteJobData {
  to: string;
  inviteUrl: string;
}

@Injectable()
export class EmailQueueProducer {
  constructor(@InjectQueue(EMAIL_QUEUE) private readonly queue: Queue) {}

  async addInviteJob(data: InviteJobData): Promise<void> {
    await this.queue.add('send-invite', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }
}
```

- [ ] **Step 3: Create `email-queue.processor.ts`**

```typescript
// packages/api/src/email-queue/email-queue.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailService } from '../email/email.service';
import { EMAIL_QUEUE, InviteJobData } from './email-queue.producer';

@Processor(EMAIL_QUEUE)
export class EmailQueueProcessor extends WorkerHost {
  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<InviteJobData>): Promise<void> {
    if (job.name === 'send-invite') {
      await this.emailService.sendInvite(job.data.to, job.data.inviteUrl);
    }
  }
}
```

- [ ] **Step 4: Create `email-queue.module.ts`**

```typescript
// packages/api/src/email-queue/email-queue.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailModule } from '../email/email.module';
import { EMAIL_QUEUE, EmailQueueProducer } from './email-queue.producer';
import { EmailQueueProcessor } from './email-queue.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
    EmailModule,
  ],
  providers: [EmailQueueProducer, EmailQueueProcessor],
  exports: [EmailQueueProducer],
})
export class EmailQueueModule {}
```

- [ ] **Step 5: Commit**

```bash
git add packages/api/package.json packages/api/pnpm-lock.yaml packages/api/src/email-queue/
git commit -m "feat(api): install bullmq and scaffold email-queue module"
```

---

## Task 2: Wire BullMQ into AppModule + add EmailService.sendInvite()

**Files:**
- Modify: `packages/api/src/app.module.ts`
- Modify: `packages/api/src/email/email.service.ts`
- Modify: `packages/api/src/email/email.service.spec.ts`

- [ ] **Step 1: Write the failing test for `sendInvite`**

Add to `packages/api/src/email/email.service.spec.ts`:

```typescript
it('envia e-mail de convite com link de ativação via Resend', async () => {
  await service.sendInvite(
    'invited@example.com',
    'https://acme.scheduler.app/activate-account?token=xyz789',
  );
  expect(mockSend).toHaveBeenCalledWith({
    from: 'noreply@test.com',
    to: 'invited@example.com',
    subject: 'Você foi convidado',
    html: expect.stringContaining('https://acme.scheduler.app/activate-account?token=xyz789'),
  });
});

it('lança erro quando Resend retorna error no envio do convite', async () => {
  mockSend.mockResolvedValueOnce({ data: null, error: { message: 'Quota exceeded' } });
  await expect(
    service.sendInvite('invited@example.com', 'https://acme.scheduler.app/activate-account?token=xyz789'),
  ).rejects.toThrow('Email delivery failed: Quota exceeded');
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd packages/api && pnpm test --testPathPattern=email.service.spec
```

Expected: FAIL — `service.sendInvite is not a function`

- [ ] **Step 3: Add `sendInvite()` to `EmailService`**

In `packages/api/src/email/email.service.ts`, add after `sendPasswordReset`:

```typescript
async sendInvite(to: string, inviteUrl: string): Promise<void> {
  const { error } = await this.resend.emails.send({
    from: this.from,
    to,
    subject: 'Você foi convidado',
    html: `
      <p>Você foi convidado para acessar o sistema.</p>
      <p><a href="${inviteUrl}">Clique aqui para cadastrar sua senha</a></p>
      <p>Este link é válido por 24 horas.</p>
    `,
  });
  if (error) throw new Error(`Email delivery failed: ${error.message}`);
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd packages/api && pnpm test --testPathPattern=email.service.spec
```

Expected: PASS (all 4 tests)

- [ ] **Step 5: Wire `BullModule.forRootAsync` into `AppModule`**

In `packages/api/src/app.module.ts`, replace the current content with:

```typescript
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { TenantsModule } from './tenants/tenants.module';
import { AuthModule } from './auth/auth.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { ServicesModule } from './services/services.module';
import { AvailabilityModule } from './availability/availability.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ClientsModule } from './clients/clients.module';
import { AdminsModule } from './admins/admins.module';
import { EmailQueueModule } from './email-queue/email-queue.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const urlStr = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
        const url = new URL(urlStr);
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port) || 6379,
            ...(url.password ? { password: url.password } : {}),
          },
        };
      },
    }),
    DatabaseModule,
    RedisModule,
    TenantsModule,
    AuthModule,
    ProfessionalsModule,
    ServicesModule,
    AvailabilityModule,
    AppointmentsModule,
    ClientsModule,
    AdminsModule,
    EmailQueueModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
```

- [ ] **Step 6: Verify the API boots**

```bash
cd packages/api && pnpm build 2>&1 | tail -20
```

Expected: build succeeds (no TypeScript errors).

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/app.module.ts packages/api/src/email/email.service.ts packages/api/src/email/email.service.spec.ts
git commit -m "feat(api): wire bullmq root config, add EmailService.sendInvite"
```

---

## Task 3: Add invite token endpoints to AuthService and AuthController

**Files:**
- Create: `packages/api/src/auth/dto/activate-account.dto.ts`
- Create: `packages/api/src/auth/dto/validate-invite-token.dto.ts`
- Modify: `packages/api/src/auth/auth.service.ts`
- Modify: `packages/api/src/auth/auth.service.spec.ts`
- Modify: `packages/api/src/auth/auth.controller.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// packages/api/src/auth/dto/validate-invite-token.dto.ts
import { IsString } from 'class-validator';

export class ValidateInviteTokenDto {
  @IsString()
  token: string;
}
```

```typescript
// packages/api/src/auth/dto/activate-account.dto.ts
import { IsString, MinLength } from 'class-validator';

export class ActivateAccountDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
```

- [ ] **Step 2: Write failing tests for new AuthService methods**

Add to `packages/api/src/auth/auth.service.spec.ts` (after the existing describe blocks):

```typescript
describe('AuthService.validateInviteToken', () => {
  async function buildService(redis: unknown) {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: makeSimpleDb([]) },
        { provide: REDIS, useValue: redis },
        { provide: EmailService, useValue: { sendPasswordReset: jest.fn(), sendInvite: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    return module.get(AuthService);
  }

  it('retorna email quando token existe', async () => {
    const redis = { get: jest.fn().mockResolvedValue(JSON.stringify({ userId: 'u1', email: 'a@b.com', tenantId: 't1' })) };
    const service = await buildService(redis);
    const result = await service.validateInviteToken('valid-token');
    expect(result).toEqual({ email: 'a@b.com' });
    expect(redis.get).toHaveBeenCalledWith('password:invite:valid-token');
  });

  it('lança BadRequestException quando token não existe', async () => {
    const redis = { get: jest.fn().mockResolvedValue(null) };
    const service = await buildService(redis);
    await expect(service.validateInviteToken('bad-token')).rejects.toThrow(BadRequestException);
  });
});

describe('AuthService.activateAccount', () => {
  async function buildService(db: unknown, redis: unknown) {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: db },
        { provide: REDIS, useValue: redis },
        { provide: EmailService, useValue: { sendPasswordReset: jest.fn(), sendInvite: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    return module.get(AuthService);
  }

  it('atualiza passwordHash e active=true quando token é válido', async () => {
    const payload = JSON.stringify({ userId: 'u1', email: 'a@b.com', tenantId: 't1' });
    const redis = { getdel: jest.fn().mockResolvedValue(payload) };
    const db = makeSimpleDb([{ id: 'u1' }]);
    const service = await buildService(db, redis);
    await expect(service.activateAccount('valid-token', 'novaSenha123')).resolves.toBeUndefined();
    expect(redis.getdel).toHaveBeenCalledWith('password:invite:valid-token');
  });

  it('lança BadRequestException quando token não existe', async () => {
    const redis = { getdel: jest.fn().mockResolvedValue(null) };
    const service = await buildService(makeSimpleDb([]), redis);
    await expect(service.activateAccount('bad-token', 'senha123')).rejects.toThrow(BadRequestException);
  });

  it('lança BadRequestException quando senha tem menos de 6 caracteres', async () => {
    const payload = JSON.stringify({ userId: 'u1', email: 'a@b.com', tenantId: 't1' });
    const redis = { getdel: jest.fn().mockResolvedValue(payload) };
    const service = await buildService(makeSimpleDb([{ id: 'u1' }]), redis);
    await expect(service.activateAccount('valid-token', '123')).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd packages/api && pnpm test --testPathPattern=auth.service.spec
```

Expected: FAIL — `service.validateInviteToken is not a function`

- [ ] **Step 4: Add `validateInviteToken()` and `activateAccount()` to `AuthService`**

In `packages/api/src/auth/auth.service.ts`, add after `resetPassword()`:

```typescript
async validateInviteToken(token: string): Promise<{ email: string }> {
  const raw = await this.redis.get(`password:invite:${token}`);
  if (!raw) throw new BadRequestException('Token inválido ou expirado');
  const { email } = JSON.parse(raw) as { userId: string; email: string; tenantId: string };
  return { email };
}

async activateAccount(token: string, newPassword: string): Promise<void> {
  const raw = await this.redis.getdel(`password:invite:${token}`);
  if (!raw) throw new BadRequestException('Token inválido ou expirado');
  const { userId, tenantId } = JSON.parse(raw) as { userId: string; email: string; tenantId: string };

  if (newPassword.length < 6) {
    throw new BadRequestException('A senha deve ter no mínimo 6 caracteres');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await withTenant(this.db, tenantId, (tx) =>
    tx.update(users).set({ passwordHash, active: true }).where(eq(users.id, userId)).returning({ id: users.id }),
  );
  if (!updated.length) throw new BadRequestException('Token inválido ou expirado');
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd packages/api && pnpm test --testPathPattern=auth.service.spec
```

Expected: PASS (all tests)

- [ ] **Step 6: Add endpoints to `AuthController`**

In `packages/api/src/auth/auth.controller.ts`, add imports and two new endpoints:

Add to imports at top:
```typescript
import { ValidateInviteTokenDto } from './dto/validate-invite-token.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';
```

Add endpoints after `resetPassword`:
```typescript
@Get('invite/validate')
async validateInviteToken(@Query() dto: ValidateInviteTokenDto): Promise<{ email: string }> {
  return this.authService.validateInviteToken(dto.token);
}

@Post('activate-account')
@HttpCode(200)
async activateAccount(@Body() dto: ActivateAccountDto): Promise<{ message: string }> {
  await this.authService.activateAccount(dto.token, dto.newPassword);
  return { message: 'Conta ativada com sucesso' };
}
```

- [ ] **Step 7: Run full auth tests**

```bash
cd packages/api && pnpm test --testPathPattern=auth
```

Expected: all pass

- [ ] **Step 8: Commit**

```bash
git add packages/api/src/auth/
git commit -m "feat(api): add invite token validation and account activation endpoints"
```

---

## Task 4: Update Admins module for invite flow

**Files:**
- Modify: `packages/api/src/admins/dto/create-admin.dto.ts`
- Modify: `packages/api/src/admins/admins.module.ts`
- Modify: `packages/api/src/admins/admins.service.ts`
- Modify: `packages/api/src/admins/admins.controller.ts`

- [ ] **Step 1: Update `CreateAdminDto`**

Replace the content of `packages/api/src/admins/dto/create-admin.dto.ts`:

```typescript
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class CreateAdminDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsBoolean()
  sendInvite?: boolean;

  @ValidateIf(o => !o.sendInvite)
  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(200_000)
  avatarUrl?: string;
}
```

- [ ] **Step 2: Update `AdminsModule` to import `EmailQueueModule`**

Replace `packages/api/src/admins/admins.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AdminsController } from './admins.controller';
import { AdminsService } from './admins.service';
import { EmailQueueModule } from '../email-queue/email-queue.module';

@Module({
  imports: [EmailQueueModule],
  controllers: [AdminsController],
  providers: [AdminsService],
})
export class AdminsModule {}
```

- [ ] **Step 3: Update `AdminsService` to support invite flow**

Replace `packages/api/src/admins/admins.service.ts` with the full updated file. Key changes: add imports for `randomBytes`, `Redis`, `ConfigService`, `REDIS`, `EmailQueueProducer`; update constructor; update `create()`:

```typescript
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import { users } from '@scheduler/shared';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';
import { REDIS } from '../redis/redis.module';
import { EmailQueueProducer } from '../email-queue/email-queue.producer';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

const ADMIN_FIELDS = {
  id:          users.id,
  name:        users.name,
  email:       users.email,
  phone:       users.phone,
  avatarUrl:   users.avatarUrl,
  active:      users.active,
  timezone:    users.timezone,
  timeFormat:  users.timeFormat,
  lastLoginAt: users.lastLoginAt,
  createdAt:   users.createdAt,
};

@Injectable()
export class AdminsService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly emailQueueProducer: EmailQueueProducer,
  ) {}

  async findAll(
    tenantId: string,
    page = 1,
    limit = 10,
    filters: { q?: string; active?: string } = {},
  ) {
    const offset = (page - 1) * limit;
    return withTenant(this.db, tenantId, async (tx) => {
      const where = and(
        eq(users.tenantId, tenantId),
        eq(users.role, 'tenant_admin'),
        filters.q
          ? or(ilike(users.name, `%${filters.q}%`), ilike(users.email, `%${filters.q}%`))
          : undefined,
        filters.active === 'true'  ? eq(users.active, true)  : undefined,
        filters.active === 'false' ? eq(users.active, false) : undefined,
      );

      const [{ total }] = await tx.select({ total: count() }).from(users).where(where);
      const data = await tx
        .select(ADMIN_FIELDS)
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      return { data, total, page, limit };
    });
  }

  async findOne(tenantId: string, id: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [admin] = await tx
        .select(ADMIN_FIELDS)
        .from(users)
        .where(and(eq(users.id, id), eq(users.tenantId, tenantId), eq(users.role, 'tenant_admin')));
      if (!admin) throw new NotFoundException('Administrador não encontrado');
      return admin;
    });
  }

  async create(dto: CreateAdminDto, tenantId: string, slug: string) {
    const rawPassword = dto.sendInvite ? randomBytes(16).toString('hex') : dto.password!;
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    return withTenant(this.db, tenantId, async (tx) => {
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, dto.email), eq(users.tenantId, tenantId)));
      if (existing) throw new ConflictException('E-mail já está em uso');

      const [user] = await tx.insert(users).values({
        tenantId,
        email:        dto.email,
        passwordHash,
        role:         'tenant_admin',
        name:         dto.name,
        avatarUrl:    dto.avatarUrl,
        active:       !dto.sendInvite,
      }).returning();

      if (dto.sendInvite) {
        const token = randomBytes(32).toString('hex');
        await this.redis.set(
          `password:invite:${token}`,
          JSON.stringify({ userId: user.id, email: user.email, tenantId }),
          'EX',
          86400,
        );
        const domain = this.config.get<string>('FRONTEND_BASE_DOMAIN') ?? 'localhost:3000';
        const protocol = domain.startsWith('localhost') ? 'http' : 'https';
        const inviteUrl = `${protocol}://${slug}.${domain}/activate-account?token=${token}`;
        await this.emailQueueProducer.addInviteJob({ to: user.email, inviteUrl });
      }

      return {
        id:          user.id,
        name:        user.name,
        email:       user.email,
        phone:       user.phone,
        avatarUrl:   user.avatarUrl ?? null,
        active:      user.active,
        lastLoginAt: null,
        createdAt:   user.createdAt,
      };
    });
  }

  async update(id: string, dto: UpdateAdminDto, tenantId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [admin] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, id), eq(users.tenantId, tenantId), eq(users.role, 'tenant_admin')));
      if (!admin) throw new NotFoundException('Administrador não encontrado');

      const patch: Record<string, unknown> = {};
      if (dto.name       !== undefined) patch.name       = dto.name;
      if (dto.avatarUrl  !== undefined) patch.avatarUrl  = dto.avatarUrl;
      if (dto.active     !== undefined) patch.active     = dto.active;
      if (dto.timezone   !== undefined) patch.timezone   = dto.timezone;
      if (dto.timeFormat !== undefined) patch.timeFormat = dto.timeFormat;

      if (Object.keys(patch).length) {
        await tx.update(users).set(patch).where(eq(users.id, id));
      }

      const [updated] = await tx.select(ADMIN_FIELDS).from(users).where(eq(users.id, id));
      if (!updated) throw new NotFoundException('Administrador não encontrado');
      return updated;
    });
  }
}
```

- [ ] **Step 4: Update `AdminsController` to extract slug and pass to `create()`**

In `packages/api/src/admins/admins.controller.ts`, update imports and the `create` method:

Change the import line from:
```typescript
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
```
To:
```typescript
import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
```

Change the `create` method from:
```typescript
@Post()
@Roles('tenant_admin')
create(@Body() dto: CreateAdminDto, @TenantId() tenantId: string) {
  return this.service.create(dto, tenantId);
}
```
To:
```typescript
@Post()
@Roles('tenant_admin')
create(@Body() dto: CreateAdminDto, @TenantId() tenantId: string, @Req() req: ExpressRequest) {
  const slugHeader = req.headers['x-tenant-slug'];
  const slug = Array.isArray(slugHeader) ? slugHeader[0] : (slugHeader ?? '');
  return this.service.create(dto, tenantId, slug);
}
```

- [ ] **Step 5: Build to verify no TypeScript errors**

```bash
cd packages/api && pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/admins/
git commit -m "feat(api): add invite flow to admins module"
```

---

## Task 5: Update Professionals module for invite flow

**Files:**
- Modify: `packages/api/src/professionals/dto/create-professional.dto.ts`
- Modify: `packages/api/src/professionals/professionals.module.ts`
- Modify: `packages/api/src/professionals/professionals.service.ts`
- Modify: `packages/api/src/professionals/professionals.controller.ts`

- [ ] **Step 1: Update `CreateProfessionalDto`**

Replace content of `packages/api/src/professionals/dto/create-professional.dto.ts`:

```typescript
import { IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleSlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsInt()
  @Min(15)
  @IsOptional()
  slotDurationMinutes?: number;
}

export class CreateProfessionalDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsBoolean()
  sendInvite?: boolean;

  @ValidateIf(o => !o.sendInvite)
  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200_000)
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsIn(['12h', '24h'])
  @IsOptional()
  timeFormat?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  schedule?: ScheduleSlotDto[];
}
```

- [ ] **Step 2: Update `ProfessionalsModule`**

Replace `packages/api/src/professionals/professionals.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsService } from './professionals.service';
import { EmailQueueModule } from '../email-queue/email-queue.module';

@Module({
  imports: [EmailQueueModule],
  controllers: [ProfessionalsController],
  providers: [ProfessionalsService],
  exports: [ProfessionalsService],
})
export class ProfessionalsModule {}
```

- [ ] **Step 3: Update `ProfessionalsService.create()`**

In `packages/api/src/professionals/professionals.service.ts`:

Add imports at the top (after existing ones):
```typescript
import { randomBytes } from 'crypto';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { REDIS } from '../redis/redis.module';
import { EmailQueueProducer } from '../email-queue/email-queue.producer';
```

Replace the constructor:
```typescript
constructor(
  @Inject(DB) private readonly db: DrizzleDB,
  @Inject(REDIS) private readonly redis: Redis,
  private readonly config: ConfigService,
  private readonly emailQueueProducer: EmailQueueProducer,
) {}
```

Replace the `create()` method:
```typescript
async create(dto: CreateProfessionalDto, tenantId: string, slug: string) {
  const rawPassword = dto.sendInvite ? randomBytes(16).toString('hex') : dto.password!;
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  return withTenant(this.db, tenantId, async (tx) => {
    const [existing] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, dto.email), eq(users.tenantId, tenantId)));
    if (existing) throw new ConflictException('Email already in use');

    const [user] = await tx.insert(users).values({
      tenantId,
      email:      dto.email,
      passwordHash,
      role:       'professional',
      name:       dto.name,
      avatarUrl:  dto.avatarUrl,
      timezone:   dto.timezone ?? 'America/Sao_Paulo',
      timeFormat: dto.timeFormat ?? '24h',
      active:     !dto.sendInvite,
    }).returning();

    const [prof] = await tx.insert(professionals).values({
      tenantId,
      userId:   user.id,
      bio:      dto.bio,
      position: dto.position,
      timezone: dto.timezone ?? 'America/Sao_Paulo',
    }).returning();

    if (dto.schedule?.length) {
      await tx.insert(weeklyAvailability).values(
        dto.schedule.map(s => ({
          professionalId:      prof.id,
          dayOfWeek:           s.dayOfWeek,
          startTime:           s.startTime,
          endTime:             s.endTime,
          slotDurationMinutes: s.slotDurationMinutes ?? 60,
        })),
      );
    }

    if (dto.sendInvite) {
      const token = randomBytes(32).toString('hex');
      await this.redis.set(
        `password:invite:${token}`,
        JSON.stringify({ userId: user.id, email: user.email, tenantId }),
        'EX',
        86400,
      );
      const domain = this.config.get<string>('FRONTEND_BASE_DOMAIN') ?? 'localhost:3000';
      const protocol = domain.startsWith('localhost') ? 'http' : 'https';
      const inviteUrl = `${protocol}://${slug}.${domain}/activate-account?token=${token}`;
      await this.emailQueueProducer.addInviteJob({ to: user.email, inviteUrl });
    }

    return {
      ...prof,
      name: user.name,
      email: user.email,
      phone: null,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
      active: user.active,
      lastLoginAt: null,
      createdAt: user.createdAt,
    };
  });
}
```

- [ ] **Step 4: Update `ProfessionalsController.create()` to pass slug**

In `packages/api/src/professionals/professionals.controller.ts`:

Add to imports:
```typescript
import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
```

Find the `create` method (currently at line ~61):
```typescript
create(@Body() dto: CreateProfessionalDto, @TenantId() tenantId: string) {
  return this.service.create(dto, tenantId);
}
```

Replace with:
```typescript
create(@Body() dto: CreateProfessionalDto, @TenantId() tenantId: string, @Req() req: ExpressRequest) {
  const slugHeader = req.headers['x-tenant-slug'];
  const slug = Array.isArray(slugHeader) ? slugHeader[0] : (slugHeader ?? '');
  return this.service.create(dto, tenantId, slug);
}
```

- [ ] **Step 5: Build to verify**

```bash
cd packages/api && pnpm build 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/professionals/
git commit -m "feat(api): add invite flow to professionals module"
```

---

## Task 6: Update Clients module for invite flow

**Files:**
- Modify: `packages/api/src/clients/dto/create-client.dto.ts`
- Modify: `packages/api/src/clients/clients.module.ts`
- Modify: `packages/api/src/clients/clients.service.ts`
- Modify: `packages/api/src/clients/clients.controller.ts`

- [ ] **Step 1: Update `CreateClientDto`**

In `packages/api/src/clients/dto/create-client.dto.ts`, add `sendInvite?` and `@ValidateIf` on `password`:

Replace the file content:
```typescript
import {
  IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID,
  Matches, MaxLength, Min, MinLength, ValidateIf, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceLimitItemDto } from './service-limit-item.dto';

export class CreateClientDto {
  @IsString() name: string;
  @IsEmail() email: string;

  @IsOptional() @IsBoolean() sendInvite?: boolean;

  @ValidateIf(o => !o.sendInvite)
  @IsString() @MinLength(6) password: string;

  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) birthDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() @MaxLength(200_000) avatarUrl?: string;

  @IsOptional() @IsInt() @Min(1) serviceLimitCount?: number;
  @IsOptional() @IsIn(['day', 'week', 'month']) serviceLimitPeriod?: 'day' | 'week' | 'month';

  @IsOptional() @IsBoolean() allProfessionals?: boolean;
  @IsOptional() @IsBoolean() allServices?: boolean;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) professionalIds?: string[];
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) serviceIds?: string[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ServiceLimitItemDto)
  serviceLimits?: ServiceLimitItemDto[];

  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() @IsIn(['12h', '24h']) timeFormat?: string;
}
```

- [ ] **Step 2: Update `ClientsModule`**

Replace `packages/api/src/clients/clients.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { EmailQueueModule } from '../email-queue/email-queue.module';

@Module({
  imports: [EmailQueueModule],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
```

- [ ] **Step 3: Update `ClientsService.create()`**

In `packages/api/src/clients/clients.service.ts`:

Add to existing imports at top:
```typescript
import { randomBytes } from 'crypto';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { REDIS } from '../redis/redis.module';
import { EmailQueueProducer } from '../email-queue/email-queue.producer';
```

Replace the constructor (currently `constructor(@Inject(DB) private readonly db: DrizzleDB) {}`):
```typescript
constructor(
  @Inject(DB) private readonly db: DrizzleDB,
  @Inject(REDIS) private readonly redis: Redis,
  private readonly config: ConfigService,
  private readonly emailQueueProducer: EmailQueueProducer,
) {}
```

Replace the `create()` method body. The method signature changes to `async create(dto: CreateClientDto, tenantId: string, slug: string)`. The interior changes:

```typescript
async create(dto: CreateClientDto, tenantId: string, slug: string) {
  return withTenant(this.db, tenantId, async (tx) => {
    const [existing] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, dto.email), eq(users.tenantId, tenantId)));
    if (existing) throw new ConflictException('Email already in use');

    const rawPassword = dto.sendInvite ? randomBytes(16).toString('hex') : dto.password!;
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const [user] = await tx
      .insert(users)
      .values({
        tenantId,
        email: dto.email,
        passwordHash,
        role: 'client',
        name: dto.name,
        phone: dto.phone,
        active: dto.sendInvite ? false : (dto.active ?? true),
        avatarUrl: dto.avatarUrl,
        timezone: dto.timezone,
        timeFormat: dto.timeFormat,
      })
      .returning();

    const [profile] = await tx
      .insert(clientProfiles)
      .values({
        tenantId,
        userId: user.id,
        birthDate: dto.birthDate,
        notes: dto.notes,
        allProfessionals: dto.allProfessionals ?? false,
        allServices: dto.allServices ?? false,
        serviceLimitCount: dto.serviceLimitCount,
        serviceLimitPeriod: dto.serviceLimitPeriod,
      })
      .returning();

    if (dto.professionalIds?.length) {
      await tx.insert(clientProfessionals).values(
        dto.professionalIds.map((professionalId) => ({ tenantId, clientProfileId: profile.id, professionalId })),
      );
    }

    if (dto.serviceIds?.length) {
      await tx.insert(clientServices).values(
        dto.serviceIds.map((serviceId) => ({ tenantId, clientProfileId: profile.id, serviceId })),
      );
    }

    if (dto.serviceLimits?.length) {
      await tx.insert(clientServiceLimits).values(
        dto.serviceLimits.map((sl) => ({
          tenantId,
          clientProfileId: profile.id,
          serviceId:  sl.serviceId,
          limitCount: sl.limitCount,
          limitPeriod: sl.limitPeriod,
        })),
      );
    }

    if (dto.sendInvite) {
      const token = randomBytes(32).toString('hex');
      await this.redis.set(
        `password:invite:${token}`,
        JSON.stringify({ userId: user.id, email: user.email, tenantId }),
        'EX',
        86400,
      );
      const domain = this.config.get<string>('FRONTEND_BASE_DOMAIN') ?? 'localhost:3000';
      const protocol = domain.startsWith('localhost') ? 'http' : 'https';
      const inviteUrl = `${protocol}://${slug}.${domain}/activate-account?token=${token}`;
      await this.emailQueueProducer.addInviteJob({ to: user.email, inviteUrl });
    }

    return { id: user.id };
  });
}
```

- [ ] **Step 4: Update `ClientsController.create()` to pass slug**

In `packages/api/src/clients/clients.controller.ts`:

Add to imports:
```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
```

Replace `create` method:
```typescript
@Post()
@Roles('tenant_admin', 'professional')
create(@Body() dto: CreateClientDto, @TenantId() tenantId: string, @Req() req: ExpressRequest) {
  const slugHeader = req.headers['x-tenant-slug'];
  const slug = Array.isArray(slugHeader) ? slugHeader[0] : (slugHeader ?? '');
  return this.service.create(dto, tenantId, slug);
}
```

- [ ] **Step 5: Build**

```bash
cd packages/api && pnpm build 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/clients/
git commit -m "feat(api): add invite flow to clients module"
```

---

## Task 7: Create frontend activate-account page

**Files:**
- Create: `packages/web/src/app/(tenant)/activate-account/page.tsx`

- [ ] **Step 1: Create the activate-account page**

Create `packages/web/src/app/(tenant)/activate-account/page.tsx`:

```tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTenant } from '@/providers/TenantProvider'
import { apiFetch, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const schema = z
  .object({
    newPassword: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

type PageState =
  | { status: 'loading' }
  | { status: 'valid'; email: string }
  | { status: 'invalid' }

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function ActivateAccountContent() {
  const { slug } = useTenant()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [pageState, setPageState] = useState<PageState>({ status: 'loading' })
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!token) {
      setPageState({ status: 'invalid' })
      return
    }

    apiFetch(`/auth/invite/validate?token=${encodeURIComponent(token)}`, {
      slug,
      method: 'GET',
    })
      .then((res) => res.json())
      .then((data: unknown) => {
        const email = (data as { email?: string }).email
        if (!email) { setPageState({ status: 'invalid' }); return }
        setPageState({ status: 'valid', email })
      })
      .catch(() => {
        setPageState({ status: 'invalid' })
      })
  }, [token, slug])

  async function onSubmit(data: FormData) {
    if (!token) return
    clearErrors('root')
    try {
      await apiFetch('/auth/activate-account', {
        slug,
        method: 'POST',
        body: JSON.stringify({ token, newPassword: data.newPassword }),
      })
      router.push('./login?reason=account_activated')
    } catch (err) {
      const message =
        err instanceof ApiError && err.status < 500
          ? 'Link inválido ou expirado.'
          : 'Ocorreu um erro. Tente novamente.'
      setError('root', { message })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-3 duration-300">

        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-gray-900 m-0 mb-2 tracking-[-0.015em]">
            Cadastrar senha
          </h1>
          <p className="text-sm text-gray-500 m-0">
            {pageState.status === 'loading'
              ? 'Verificando link...'
              : pageState.status === 'valid'
                ? 'Crie uma senha para acessar sua conta'
                : 'Link inválido'}
          </p>
        </div>

        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]">

          {pageState.status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Spinner />
              <p className="text-sm text-gray-500">Verificando link de convite...</p>
            </div>
          )}

          {pageState.status === 'invalid' && (
            <div className="flex flex-col items-center gap-3 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="text-sm text-gray-700 text-center leading-relaxed">
                Link inválido ou expirado. Entre em contato com o administrador para receber um novo convite.
              </p>
            </div>
          )}

          {pageState.status === 'valid' && (
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <div className="mb-4.5">
                <label htmlFor="email" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={pageState.email}
                  disabled
                  className="w-full h-[46px] px-3.5 text-sm text-gray-500 bg-gray-50 rounded-lg border border-gray-200 outline-none cursor-not-allowed box-border"
                />
              </div>

              <div className="mb-4.5">
                <label htmlFor="newPassword" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...register('newPassword')}
                    className={cn(
                      'w-full h-[46px] pl-3.5 pr-[42px] text-sm text-gray-900 bg-white rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 box-border',
                      errors.newPassword ? 'border-red-400' : 'border-gray-200',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-gray-400 hover:text-gray-700 hover:scale-110 active:scale-90 transition-all bg-transparent border-0 p-0 cursor-pointer"
                    aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    <EyeIcon open={showNewPassword} />
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
                  Confirmar senha
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                    className={cn(
                      'w-full h-[46px] pl-3.5 pr-[42px] text-sm text-gray-900 bg-white rounded-lg border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 box-border',
                      errors.confirmPassword ? 'border-red-400' : 'border-gray-200',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-gray-400 hover:text-gray-700 hover:scale-110 active:scale-90 transition-all bg-transparent border-0 p-0 cursor-pointer"
                    aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                  >
                    <EyeIcon open={showConfirmPassword} />
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
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {errors.root.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[46px] bg-blue-600 text-white font-semibold rounded-lg border-0 cursor-pointer flex items-center justify-center gap-2 hover:bg-blue-700 hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-65 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? <><Spinner />Cadastrando...</> : 'Cadastrar senha'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-5 text-[13px] text-gray-500">
          Já tem uma conta?{' '}
          <a href="./login" className="text-blue-600 font-semibold no-underline hover:underline">
            Entrar
          </a>
        </p>
      </div>
    </div>
  )
}

export default function ActivateAccountPage() {
  return (
    <Suspense>
      <ActivateAccountContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/app/\(tenant\)/activate-account/
git commit -m "feat(web): add activate-account page for invited users"
```

---

## Task 8: Update AdminForm, useCreateAdmin hook, and NewAdminPage

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/admins/_components/AdminForm.tsx`
- Modify: `packages/web/src/hooks/useAdmins.ts`
- Modify: `packages/web/src/app/(tenant)/(app)/admins/new/page.tsx`

- [ ] **Step 1: Update `useCreateAdmin` mutation type in `useAdmins.ts`**

In `packages/web/src/hooks/useAdmins.ts`, find `useCreateAdmin` and change the `mutationFn` body type from:
```typescript
mutationFn: (body: { name: string; email: string; password: string; avatarUrl?: string }) =>
```
To:
```typescript
mutationFn: (body: { name: string; email: string; password?: string; sendInvite?: boolean; avatarUrl?: string }) =>
```

- [ ] **Step 2: Update `AdminForm` — add `sendInvite` to schema, FormValues, and render**

In `packages/web/src/app/(tenant)/(app)/admins/_components/AdminForm.tsx`:

Replace `createSchema`:
```typescript
const createSchema = z.object({
  name:        z.string().min(2, 'Nome obrigatório'),
  email:       z.string().email('E-mail inválido'),
  sendInvite:  z.boolean().optional(),
  password:    z.string().optional(),
  avatarUrl:   z.string().nullable().optional(),
}).refine(
  (d) => d.sendInvite || (!!d.password && d.password.length >= 8),
  { message: 'Mínimo 8 caracteres', path: ['password'] },
)
```

Add `sendInvite?: boolean` to the `FormValues` type:
```typescript
type FormValues = {
  name:        string
  email?:      string
  password?:   string
  sendInvite?: boolean
  avatarUrl?:  string | null
  active?:     boolean
  timezone?:   string
  timeFormat?: '12h' | '24h'
}
```

In the `useForm` defaultValues, change the create spread to include `sendInvite: true`:
```typescript
...(mode === 'create' ? { email: '', password: '', sendInvite: true } : {}),
```

Add `sendInviteValue = watch('sendInvite') ?? true` alongside the existing `watch` calls.

Replace the create-mode password/email block (inside `{mode === 'create' && (...)}`) with:
```tsx
{mode === 'create' && (
  <>
    <div className="mb-4">
      <label htmlFor="admin-email" className="block text-[13px] font-medium text-gray-700 mb-1.5">
        E-mail <span className="text-red-500">*</span>
      </label>
      <input id="admin-email" type="email" {...register('email')} className={inputCls(!!errors.email)} />
      {errors.email && <p className="mt-1 text-xs text-red-500 m-0">{errors.email.message}</p>}
    </div>

    <div className="mb-4 flex items-center gap-2.5">
      <input
        id="admin-send-invite"
        type="checkbox"
        {...register('sendInvite')}
        className="w-4 h-4 rounded border-gray-300 text-indigo-500 cursor-pointer accent-indigo-500"
      />
      <label htmlFor="admin-send-invite" className="text-[13px] font-medium text-gray-700 cursor-pointer select-none">
        Enviar convite por e-mail para o usuário cadastrar a senha
      </label>
    </div>

    {!sendInviteValue && (
      <div>
        <label htmlFor="admin-password" className="block text-[13px] font-medium text-gray-700 mb-1.5">
          Senha inicial <span className="text-red-500">*</span>
        </label>
        <input id="admin-password" type="password" {...register('password')} className={inputCls(!!errors.password)} />
        {errors.password && <p className="mt-1 text-xs text-red-500 m-0">{errors.password.message}</p>}
      </div>
    )}
  </>
)}
```

- [ ] **Step 3: Update `NewAdminPage` to pass `sendInvite`**

In `packages/web/src/app/(tenant)/(app)/admins/new/page.tsx`, replace `handleSubmit`:

```typescript
async function handleSubmit(data: AdminFormData) {
  await mutateAsync({
    name:       data.name,
    email:      data.email!,
    password:   data.sendInvite ? undefined : data.password!,
    sendInvite: data.sendInvite,
    avatarUrl:  data.avatarUrl ?? undefined,
  })
  router.push('/admins')
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd packages/web && pnpm build 2>&1 | grep -E "error TS|Type error" | head -20
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/hooks/useAdmins.ts packages/web/src/app/\(tenant\)/\(app\)/admins/
git commit -m "feat(web): add invite toggle to admin create form"
```

---

## Task 9: Update ProfessionalForm, useProfessionals hook, and NewProfessionalPage

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/_components/ProfessionalForm.tsx`
- Modify: `packages/web/src/hooks/useProfessionals.ts`
- Modify: `packages/web/src/app/(tenant)/(app)/professionals/new/page.tsx`

- [ ] **Step 1: Update `useCreateProfessional` mutation type**

In `packages/web/src/hooks/useProfessionals.ts`, find `useCreateProfessional` and change `password: string` to `password?: string` and add `sendInvite?: boolean`:

```typescript
mutationFn: async (body: {
  name: string; email: string; password?: string; sendInvite?: boolean;
  position?: string; bio?: string; avatarUrl?: string; timezone?: string; timeFormat?: '12h' | '24h';
  schedule?: { dayOfWeek: number; startTime: string; endTime: string }[];
}) => {
```

- [ ] **Step 2: Update `ProfessionalForm` — schema, FormValues, render**

In `packages/web/src/app/(tenant)/(app)/professionals/_components/ProfessionalForm.tsx`:

Replace `createSchema`:
```typescript
const createSchema = z.object({
  name:        z.string().min(2, 'Nome obrigatório'),
  email:       z.string().email('E-mail inválido'),
  sendInvite:  z.boolean().optional(),
  password:    z.string().optional(),
  avatarUrl:   z.string().nullable().optional(),
}).refine(
  (d) => d.sendInvite || (!!d.password && d.password.length >= 8),
  { message: 'Mínimo 8 caracteres', path: ['password'] },
)
```

Add `sendInvite?: boolean` to `FormValues`.

In the `useForm` defaultValues create spread, add `sendInvite: true`:
```typescript
...(mode === 'create' ? { email: '', password: '', sendInvite: true } : {}),
```

Add `sendInviteValue = watch('sendInvite') ?? true` with the other `watch` calls.

In the create-mode block where the password field is rendered (look for `id="prof-password"`), replace the entire email + password block with:
```tsx
<div className="mb-4">
  <label htmlFor="prof-email" className="block text-[13px] font-medium text-gray-700 mb-1.5">
    E-mail <span className="text-red-500">*</span>
  </label>
  <input id="prof-email" type="email" {...register('email')} className={inputCls(!!errors.email)} />
  {errors.email && <p className="mt-1 text-xs text-red-500 m-0">{errors.email.message}</p>}
</div>

<div className="mb-4 flex items-center gap-2.5">
  <input
    id="prof-send-invite"
    type="checkbox"
    {...register('sendInvite')}
    className="w-4 h-4 rounded border-gray-300 text-indigo-500 cursor-pointer accent-indigo-500"
  />
  <label htmlFor="prof-send-invite" className="text-[13px] font-medium text-gray-700 cursor-pointer select-none">
    Enviar convite por e-mail para o usuário cadastrar a senha
  </label>
</div>

{!sendInviteValue && (
  <div>
    <label htmlFor="prof-password" className="block text-[13px] font-medium text-gray-700 mb-1.5">
      Senha inicial <span className="text-red-500">*</span>
    </label>
    <input id="prof-password" type="password" {...register('password')} className={inputCls(!!errors.password)} />
    {errors.password && <p className="mt-1 text-xs text-red-500 m-0">{errors.password.message}</p>}
  </div>
)}
```

Also add `sendInvite?: boolean` to the exported `ProfessionalFormData` type.

- [ ] **Step 3: Update `NewProfessionalPage` to pass `sendInvite`**

In `packages/web/src/app/(tenant)/(app)/professionals/new/page.tsx`, update the `createProfessional` call:

```typescript
const prof = await createProfessional({
  name:       data.name,
  email:      data.email!,
  password:   data.sendInvite ? undefined : data.password!,
  sendInvite: data.sendInvite,
  position:   data.position,
  bio:        data.bio,
  avatarUrl:  data.avatarUrl ?? undefined,
  timezone:   data.timezone,
  timeFormat: data.timeFormat,
  schedule:   data.schedule?.map(s => ({
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime:   s.endTime,
  })),
})
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd packages/web && pnpm build 2>&1 | grep -E "error TS|Type error" | head -20
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/hooks/useProfessionals.ts packages/web/src/app/\(tenant\)/\(app\)/professionals/
git commit -m "feat(web): add invite toggle to professional create form"
```

---

## Task 10: Update ClientForm, useClients hook, and NewClientPage

**Files:**
- Modify: `packages/web/src/app/(tenant)/(app)/clients/_components/ClientForm.tsx`
- Modify: `packages/web/src/hooks/useClients.ts`
- Modify: `packages/web/src/app/(tenant)/(app)/clients/new/page.tsx`

- [ ] **Step 1: Update `useCreateClient` mutation type**

In `packages/web/src/hooks/useClients.ts`, find `useCreateClient` and change `password: string` to `password?: string` and add `sendInvite?: boolean`:

```typescript
mutationFn: (body: {
  name: string; email: string; password?: string; sendInvite?: boolean;
  phone?: string; birthDate?: string; notes?: string;
  active?: boolean; avatarUrl?: string; allProfessionals?: boolean; allServices?: boolean;
  serviceLimitCount?: number; serviceLimitPeriod?: string;
  serviceLimits?: { serviceId: string; limitCount: number; limitPeriod: 'day' | 'week' | 'month' }[];
  professionalIds?: string[]; serviceIds?: string[];
  timezone?: string; timeFormat?: '12h' | '24h';
}) => api('/clients', { method: 'POST', body: JSON.stringify(body) }),
```

- [ ] **Step 2: Update `ClientForm` — add `sendInvite` state, update validation and render**

`ClientForm` uses a custom form state (not react-hook-form). The `FormState` type (lines 43-53) controls most fields via `form`/`setForm`. Add `sendInvite` as a **separate** `useState`, like `allProfs` and `allSvcs` (lines ~93-103).

**Add `sendInvite?: boolean` to `ClientFormData` type** (it already has `password?: string`):

```typescript
export type ClientFormData = {
  name: string
  email: string
  password?: string
  sendInvite?: boolean   // ← add this line
  // ... rest unchanged
}
```

**Add a new state variable** after line ~103 (where `limitMode` and `perServiceLimits` are declared):

```typescript
const [sendInvite, setSendInvite] = useState(mode === 'create')
```

(Defaults to `true` only in create mode.)

**Update `validate()` function** — change lines 191-194 from:
```typescript
if (mode === 'create') {
  if (!form.password) e.password = 'Senha obrigatória'
  else if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
}
```
To:
```typescript
if (mode === 'create' && !sendInvite) {
  if (!form.password) e.password = 'Senha obrigatória'
  else if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
}
```

**Update `handleSubmit` data** — change line 221 from:
```typescript
...(mode === 'create' ? { password: form.password } : {}),
```
To:
```typescript
...(mode === 'create' ? { password: sendInvite ? undefined : form.password, sendInvite } : {}),
```

**Add the checkbox to the JSX** — add it spanning both columns, after the email field block and before the password field (around line 298). The password field is currently inside a `{mode === 'create' && ...}` block; add the checkbox before the password field, inside that same block:

```tsx
{mode === 'create' && (
  <div className="col-span-2 flex items-center gap-2.5 mt-1 mb-1">
    <input
      id="client-send-invite"
      type="checkbox"
      checked={sendInvite}
      onChange={e => setSendInvite(e.target.checked)}
      className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-indigo-500"
    />
    <label htmlFor="client-send-invite" className="text-[13px] font-medium text-gray-700 cursor-pointer select-none">
      Enviar convite por e-mail para o usuário cadastrar a senha
    </label>
  </div>
)}
```

**Wrap the password field** in `{mode === 'create' && !sendInvite && (...)}` instead of `{mode === 'create' && (...)}`. The password field is the block around lines 299-311 with `id="client-password"`.

- [ ] **Step 3: Update `NewClientPage` to pass `sendInvite`**

In `packages/web/src/app/(tenant)/(app)/clients/new/page.tsx`:

```typescript
await mutateAsync({
  name:             data.name,
  email:            data.email,
  password:         data.sendInvite ? undefined : data.password!,
  sendInvite:       data.sendInvite,
  phone:            data.phone,
  birthDate:        data.birthDate,
  notes:            data.notes,
  active:           data.active,
  avatarUrl:        data.avatarUrl,
  timezone:         data.timezone,
  timeFormat:       data.timeFormat,
  allProfessionals: data.allProfessionals,
  allServices:      data.allServices,
  professionalIds:  data.professionalIds,
  serviceIds:       data.serviceIds,
  serviceLimitCount:  data.serviceLimitCount ?? undefined,
  serviceLimitPeriod: data.serviceLimitPeriod ?? undefined,
  serviceLimits:      data.serviceLimits,
})
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd packages/web && pnpm build 2>&1 | grep -E "error TS|Type error" | head -20
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/hooks/useClients.ts packages/web/src/app/\(tenant\)/\(app\)/clients/
git commit -m "feat(web): add invite toggle to client create form"
```

---

## Task 11: Add account_activated banner to login page

**Files:**
- Modify: `packages/web/src/app/(tenant)/login/page.tsx`

- [ ] **Step 1: Add the new banner**

In `packages/web/src/app/(tenant)/login/page.tsx`, after the `password_reset` banner block, add:

```tsx
{reason === 'account_activated' && (
  <div className="mb-5 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-[13px] text-green-800 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 text-green-500">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
    Senha cadastrada com sucesso. Faça login para continuar.
  </div>
)}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd packages/web && pnpm build 2>&1 | grep -E "error TS|Type error" | head -20
```

Expected: no errors

- [ ] **Step 3: Run full API test suite**

```bash
cd packages/api && pnpm test
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/app/\(tenant\)/login/page.tsx
git commit -m "feat(web): add account_activated banner to login page"
```

---

## Final verification

- [ ] Start containers: `docker compose up --build -d`
- [ ] Check API logs for BullMQ worker startup: `docker compose logs api | grep -i "bull\|queue\|worker"`
- [ ] Manually test: create an admin with "Enviar convite por e-mail" checked — verify user is created as inactive, no login possible, invite email in queue
- [ ] Manually test: access `/activate-account?token=<token>` — verify the form loads, password can be set, redirect to login with `account_activated` banner
- [ ] Manually test: create an admin without the invite option — verify normal password flow still works
