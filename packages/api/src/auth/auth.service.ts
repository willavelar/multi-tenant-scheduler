import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { eq, and, or, ilike, isNull } from 'drizzle-orm';
import { users, clientProfiles, refreshTokens } from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';
import { RegisterDto } from './dto/register.dto';
import Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';
import { EmailService } from '../email/email.service';

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
    private readonly emailService: EmailService,
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

      return this.generateTokens(user, tx);
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

  async listClients(tenantId: string, q?: string) {
    return withTenant(this.db, tenantId, (tx) => {
      const base = and(eq(users.tenantId, tenantId), eq(users.role, 'client'));
      const where = q
        ? and(base, or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)))
        : base;
      return tx
        .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, createdAt: users.createdAt, avatarUrl: users.avatarUrl })
        .from(users)
        .where(where)
        .limit(20);
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

    // Atomic claim: only succeeds once even under concurrent requests
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
      if (existing) await this.revokeChain(existing.id);
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
    const newTokenId = await this.persistRefreshToken(refreshToken, user.id, user.tenantId);

    await this.db
      .update(refreshTokens)
      .set({ replacedById: newTokenId })
      .where(eq(refreshTokens.id, record.id));

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

    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.tokenHash, tokenHash), eq(refreshTokens.userId, payload.sub)));
  }

  private async revokeChain(tokenId: string, depth = 0): Promise<void> {
    if (depth > 20) return;
    const [record] = await this.db
      .select({
        id: refreshTokens.id,
        revokedAt: refreshTokens.revokedAt,
        replacedById: refreshTokens.replacedById,
      })
      .from(refreshTokens)
      .where(eq(refreshTokens.id, tokenId));
    if (!record) return;
    if (!record.revokedAt) {
      await this.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.id, tokenId));
    }
    if (record.replacedById) {
      await this.revokeChain(record.replacedById, depth + 1);
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
}
