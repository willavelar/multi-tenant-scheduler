import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { refreshTokens, tenants, users } from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { RESERVED_SLUGS } from '../common/constants/password';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
}

@Injectable()
export class SuperAdminService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.tenantId), eq(users.role, 'super_admin')));

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException();
    }

    return this.generateTokens(user);
  }

  async listTenants(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(tenants).orderBy(desc(tenants.createdAt)).limit(limit).offset(offset),
      this.db.select({ value: count() }).from(tenants),
    ]);
    return { data: rows, total: Number(total), page, limit };
  }

  async createTenant(dto: CreateTenantDto) {
    if (RESERVED_SLUGS.includes(dto.slug as never)) {
      throw new BadRequestException("O slug 'app' é reservado pela plataforma");
    }
    try {
      const [tenant] = await this.db.insert(tenants).values({ name: dto.name, slug: dto.slug }).returning();
      return tenant;
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23505') throw new ConflictException('Slug already in use');
      throw err;
    }
  }

  async getTenant(id: string) {
    const [tenant] = await this.db.select().from(tenants).where(eq(tenants.id, id));
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    if (dto.slug && RESERVED_SLUGS.includes(dto.slug as never)) {
      throw new BadRequestException("O slug 'app' é reservado pela plataforma");
    }

    const patch: Partial<typeof tenants.$inferInsert> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.slug !== undefined) patch.slug = dto.slug;

    if (Object.keys(patch).length === 0) {
      const [tenant] = await this.db.select().from(tenants).where(eq(tenants.id, id));
      if (!tenant) throw new NotFoundException('Tenant not found');
      return tenant;
    }

    try {
      const [updated] = await this.db.update(tenants).set(patch).where(eq(tenants.id, id)).returning();
      if (!updated) throw new NotFoundException('Tenant not found');
      return updated;
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23505') throw new ConflictException('Slug already in use');
      throw err;
    }
  }

  private async generateTokens(user: typeof users.$inferSelect) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.db.insert(refreshTokens).values({ userId: user.id, tenantId: null, tokenHash, expiresAt });
    return { accessToken, refreshToken };
  }
}
