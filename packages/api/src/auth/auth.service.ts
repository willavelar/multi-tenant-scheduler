import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { sendInviteEmail } from './invite.helper';
import { eq, and, isNull } from 'drizzle-orm';
import { users, clientProfiles, refreshTokens } from '@scheduler/shared';
import Redis from 'ioredis';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';
import { RegisterDto } from './dto/register.dto';
import { REDIS } from '../redis/redis.module';
import { EmailQueueProducer } from '../email-queue/email-queue.producer';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly emailQueueProducer: EmailQueueProducer,
  ) {}

  async register(dto: RegisterDto, tenantId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, dto.email), eq(users.tenantId, tenantId)));

      if (existing) throw new ConflictException('Email already in use');

      const passwordHash = await bcrypt.hash(dto.password, 10);
      const [user] = await tx.insert(users).values({
        tenantId,
        email: dto.email,
        passwordHash,
        role: 'client',
        name: dto.name,
        phone: dto.phone,
      }).returning();

      await tx.insert(clientProfiles).values({ tenantId, userId: user.id });

      const tokens = await this.generateTokens(user, tx);
      return { ...tokens, userId: user.id };
    });
  }

  async validateUser(email: string, password: string, tenantId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.tenantId, tenantId)));

      if (!user) throw new UnauthorizedException();
      if (!await bcrypt.compare(password, user.passwordHash)) throw new UnauthorizedException();
      if (!user.active) throw new UnauthorizedException();

      return user;
    });
  }

  async forgotPassword(email: string, tenantId: string, slug: string): Promise<void> {
    const user = await withTenant(this.db, tenantId, async (tx) => {
      const [found] = await tx
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(and(eq(users.email, email), eq(users.tenantId, tenantId)));
      return found ?? null;
    });

    if (!user) return;

    const token = randomBytes(32).toString('hex');
    await this.redis.set(
      `password:reset:${token}`,
      JSON.stringify({ userId: user.id, email: user.email, tenantId }),
      'EX',
      86400,
    );

    const domain = this.config.get<string>('FRONTEND_BASE_DOMAIN') ?? 'localhost:3000';
    const protocol = domain.startsWith('localhost') ? 'http' : 'https';
    const resetUrl = `${protocol}://${slug}.${domain}/reset-password?token=${token}`;
    await this.emailQueueProducer.addPasswordResetJob({ to: user.email, resetUrl });
  }

  async validateResetToken(token: string): Promise<{ email: string }> {
    const raw = await this.redis.get(`password:reset:${token}`);
    if (!raw) throw new BadRequestException('Token inválido ou expirado');
    const { email } = JSON.parse(raw) as { userId: string; email: string; tenantId: string };
    return { email };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const raw = await this.redis.getdel(`password:reset:${token}`);
    if (!raw) throw new BadRequestException('Token inválido ou expirado');
    const { userId, tenantId } = JSON.parse(raw) as { userId: string; email: string; tenantId: string };

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await withTenant(this.db, tenantId, (tx) =>
      tx.update(users).set({ passwordHash }).where(eq(users.id, userId)).returning({ id: users.id }),
    );
    if (!updated.length) throw new BadRequestException('Token inválido ou expirado');
  }

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

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await withTenant(this.db, tenantId, (tx) =>
      tx.update(users).set({ passwordHash, active: true }).where(eq(users.id, userId)).returning({ id: users.id }),
    );
    if (!updated.length) throw new BadRequestException('Token inválido ou expirado');
  }

  async loginById(userId: string, tenantId: string) {
    const user = await withTenant(this.db, tenantId, (tx) =>
      tx
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
        .then((rows) => rows[0]),
    );
    if (!user || !user.active) throw new UnauthorizedException();
    return this.login(user);
  }

  async login(user: typeof users.$inferSelect) {
    if (user.tenantId) {
      await withTenant(this.db, user.tenantId, (tx) =>
        tx.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id)),
      );
    }
    return this.generateTokens(user);
  }

  async refresh(rawRefreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(rawRefreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      }) as JwtPayload;
    } catch {
      throw new UnauthorizedException();
    }

    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');

    // Atomic claim: intentionally uses this.db (global, without withTenant) — tenantId from
    // the JWT payload is only trusted AFTER this claim succeeds, so wrapping in withTenant
    // here would create a circular dependency. Documented exception to the withTenant pattern.
    const [record] = await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
      .returning();

    if (!record) {
      // Token was already revoked (replay) or doesn't exist — check which
      const [existing] = await this.db
        .select({ id: refreshTokens.id, revokedAt: refreshTokens.revokedAt })
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash));
      if (existing) await this.revokeChain(existing.id, 0, payload.tenantId ?? undefined);
      throw new UnauthorizedException();
    }

    if (!payload.tenantId) throw new UnauthorizedException();
    const user = await withTenant(this.db, payload.tenantId, (tx) =>
      tx
        .select()
        .from(users)
        .where(and(eq(users.id, payload.sub), eq(users.tenantId, payload.tenantId!)))
        .then((rows) => rows[0]),
    );
    if (!user || !user.active) throw new UnauthorizedException();

    const { accessToken, refreshToken } = this.signTokens(user);
    await withTenant(this.db, payload.tenantId as string, async (tx) => {
      const tokenId = await this.persistRefreshToken(refreshToken, user.id, user.tenantId, tx);
      await tx.update(refreshTokens)
        .set({ replacedById: tokenId })
        .where(eq(refreshTokens.id, record.id));
    });

    return { accessToken, refreshToken };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(rawRefreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      }) as JwtPayload;
    } catch {
      return;
    }

    if (!payload.tenantId) return;
    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');
    await withTenant(this.db, payload.tenantId, (tx) =>
      tx.update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.tokenHash, tokenHash), eq(refreshTokens.userId, payload.sub)))
    );
  }

  // revokeChain intentionally operates globally (without withTenant) when tenantId is absent
  // — for compatibility with bootstrap and admin contexts where no tenant context exists.
  // When tenantId is provided (e.g., from replay detection in refresh()), it uses withTenant
  // for defensive RLS readiness. Documented exception to the project's withTenant pattern.
  private async revokeChain(tokenId: string, depth = 0, tenantId?: string): Promise<void> {
    if (depth > 20) return;
    const run = <T>(fn: (db: DrizzleDB) => Promise<T>): Promise<T> =>
      tenantId ? withTenant(this.db, tenantId, fn) : fn(this.db);
    const [record] = await run((db) =>
      db.select({
          id: refreshTokens.id,
          revokedAt: refreshTokens.revokedAt,
          replacedById: refreshTokens.replacedById,
        })
        .from(refreshTokens)
        .where(eq(refreshTokens.id, tokenId))
    );
    if (!record) return;
    if (!record.revokedAt) {
      await run((db) =>
        db.update(refreshTokens)
          .set({ revokedAt: new Date() })
          .where(eq(refreshTokens.id, tokenId))
      );
    }
    if (record.replacedById) {
      await this.revokeChain(record.replacedById, depth + 1, tenantId);
    }
  }

  private signTokens(user: typeof users.$inferSelect) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name ?? user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    };
  }

  private async persistRefreshToken(
    rawToken: string,
    userId: string,
    tenantId: string | null,
    db: DrizzleDB = this.db,
  ): Promise<string> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const [record] = await db
      .insert(refreshTokens)
      .values({ userId, tenantId, tokenHash, expiresAt })
      .returning({ id: refreshTokens.id });
    return record.id;
  }

  private async generateTokens(
    user: typeof users.$inferSelect,
    db: DrizzleDB = this.db,
  ) {
    const { accessToken, refreshToken } = this.signTokens(user);
    await this.persistRefreshToken(refreshToken, user.id, user.tenantId, db);
    return { accessToken, refreshToken };
  }

  async resendInvite(userId: string, tenantId: string, slug: string): Promise<void> {
    const [user] = await withTenant(this.db, tenantId, (tx) =>
      tx.select({ id: users.id, email: users.email, active: users.active })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId))),
    );
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.active) throw new BadRequestException('Usuário já está ativo');

    await sendInviteEmail(user, tenantId, slug, this.redis, this.config, this.emailQueueProducer);
  }
}
