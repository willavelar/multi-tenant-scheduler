import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { eq, and, or, ilike } from 'drizzle-orm';
import { users, clientProfiles } from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';
import { RegisterDto } from './dto/register.dto';

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

      return this.generateTokens(user);
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

      if (user.role === 'client') {
        const [profile] = await tx
          .select({ active: clientProfiles.active })
          .from(clientProfiles)
          .where(eq(clientProfiles.userId, user.id));

        // Perfil ausente é tratado como ativo (ex.: contas legadas sem perfil criado).
        // Se o perfil existir e active === false, bloqueia o login.
        if (profile && !profile.active) throw new UnauthorizedException();
      }

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
        .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, createdAt: users.createdAt })
        .from(users)
        .where(where)
        .limit(20);
    });
  }

  async login(user: typeof users.$inferSelect) {
    if (user.tenantId) {
      await withTenant(this.db, user.tenantId, (tx) =>
        tx.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id)),
      );
    }
    return this.generateTokens(user);
  }

  private generateTokens(user: typeof users.$inferSelect) {
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
}
