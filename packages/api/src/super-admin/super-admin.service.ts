import {
  BadRequestException, ConflictException, Inject,
  Injectable, NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import { superAdmins, tenants, users } from '@scheduler/shared';
import type Redis from 'ioredis';
import { DB, DrizzleDB } from '../database/database.module';
import { REDIS } from '../redis/redis.module';
import { RESERVED_SLUGS } from '../common/constants/password';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateSuperAdminUserDto } from './dto/create-super-admin-user.dto';
import { UpdateSuperAdminUserDto } from './dto/update-super-admin-user.dto';

@Injectable()
export class SuperAdminService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    private readonly jwtService: JwtService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  private static readonly USER_FIELDS = {
    id:        superAdmins.id,
    name:      superAdmins.name,
    email:     superAdmins.email,
    avatarUrl: superAdmins.avatarUrl,
    active:    superAdmins.active,
    createdAt: superAdmins.createdAt,
  };

  async login(email: string, password: string): Promise<{ accessToken: string }> {
    const [admin] = await this.db
      .select()
      .from(superAdmins)
      .where(eq(superAdmins.email, email));

    const passwordOk = admin ? await bcrypt.compare(password, admin.passwordHash) : false;
    if (!admin || admin.active === false || !passwordOk) {
      throw new UnauthorizedException();
    }

    const accessToken = this.jwtService.sign({
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      avatarUrl: admin.avatarUrl,
      type: 'super_admin',
    });
    return { accessToken };
  }

  async listTenants(
    page = 1,
    limit = 20,
    filters: { q?: string; active?: string } = {},
  ) {
    const offset = (page - 1) * limit;
    const where = and(
      filters.q
        ? or(ilike(tenants.name, `%${filters.q}%`), ilike(tenants.slug, `%${filters.q}%`))
        : undefined,
      filters.active === 'true' ? eq(tenants.active, true) : undefined,
      filters.active === 'false' ? eq(tenants.active, false) : undefined,
    );
    const [data, countResult] = await Promise.all([
      this.db.select().from(tenants).where(where).orderBy(desc(tenants.createdAt)).limit(limit).offset(offset),
      this.db.select({ total: count() }).from(tenants).where(where),
    ]);
    const total = Number(countResult[0]?.total ?? 0);
    return { data, total, page, limit };
  }

  async getTenant(id: string) {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id));
    if (!tenant) throw new NotFoundException();
    return tenant;
  }

  async createTenant(dto: CreateTenantDto) {
    if ((RESERVED_SLUGS as readonly string[]).includes(dto.slug)) {
      throw new BadRequestException('Slug is reserved');
    }

    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.slug, dto.slug));

      if (existing) throw new ConflictException('Slug already taken');

      const [tenant] = await tx
        .insert(tenants)
        .values({ slug: dto.slug, name: dto.name })
        .returning();

      await tx.insert(users).values({
        tenantId: tenant.id,
        email: dto.adminEmail,
        name: dto.adminName,
        passwordHash,
        role: 'tenant_admin',
      });

      return tenant;
    });
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    const [existing] = await this.db
      .select({ id: tenants.id, slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.id, id));

    if (!existing) throw new NotFoundException();

    if (dto.slug && (RESERVED_SLUGS as readonly string[]).includes(dto.slug)) {
      throw new BadRequestException('Slug is reserved');
    }

    const updates: Partial<typeof tenants.$inferInsert> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.slug !== undefined) updates.slug = dto.slug;
    if (dto.active !== undefined) updates.active = dto.active;

    if (Object.keys(updates).length === 0) return this.getTenant(id);

    const [updated] = await this.db
      .update(tenants)
      .set(updates)
      .where(eq(tenants.id, id))
      .returning();

    if (!updated) throw new NotFoundException();

    await this.redis.del(`tenant:slug:${existing.slug}`);
    if (dto.slug && dto.slug !== existing.slug) {
      await this.redis.del(`tenant:slug:${dto.slug}`);
    }

    return updated;
  }

  async listUsers(
    page = 1,
    limit = 20,
    filters: { q?: string; active?: string } = {},
  ) {
    const offset = (page - 1) * limit;
    const where = and(
      filters.q
        ? or(ilike(superAdmins.name, `%${filters.q}%`), ilike(superAdmins.email, `%${filters.q}%`))
        : undefined,
      filters.active === 'true' ? eq(superAdmins.active, true) : undefined,
      filters.active === 'false' ? eq(superAdmins.active, false) : undefined,
    );
    const [data, countResult] = await Promise.all([
      this.db.select(SuperAdminService.USER_FIELDS).from(superAdmins).where(where).orderBy(desc(superAdmins.createdAt)).limit(limit).offset(offset),
      this.db.select({ total: count() }).from(superAdmins).where(where),
    ]);
    const total = Number(countResult[0]?.total ?? 0);
    return { data, total, page, limit };
  }

  async getUser(id: string) {
    const [user] = await this.db
      .select(SuperAdminService.USER_FIELDS)
      .from(superAdmins)
      .where(eq(superAdmins.id, id));
    if (!user) throw new NotFoundException();
    return user;
  }

  async createUser(dto: CreateSuperAdminUserDto) {
    const [existing] = await this.db
      .select({ id: superAdmins.id })
      .from(superAdmins)
      .where(eq(superAdmins.email, dto.email));
    if (existing) throw new ConflictException('E-mail já está em uso');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const [created] = await this.db
      .insert(superAdmins)
      .values({
        name:         dto.name,
        email:        dto.email,
        passwordHash,
        avatarUrl:    dto.avatarUrl ?? null,
      })
      .returning(SuperAdminService.USER_FIELDS);
    return created;
  }

  async updateUser(id: string, dto: UpdateSuperAdminUserDto, callerId: string) {
    const [existing] = await this.db
      .select({ id: superAdmins.id })
      .from(superAdmins)
      .where(eq(superAdmins.id, id));
    if (!existing) throw new NotFoundException();

    if (dto.active === false && id === callerId) {
      throw new BadRequestException('Você não pode desativar a própria conta');
    }

    const patch: Partial<typeof superAdmins.$inferInsert> = {};
    if (dto.name      !== undefined) patch.name      = dto.name;
    if (dto.avatarUrl !== undefined) patch.avatarUrl = dto.avatarUrl;
    if (dto.active    !== undefined) patch.active    = dto.active;
    if (dto.password) patch.passwordHash = await bcrypt.hash(dto.password, 10);

    if (!Object.keys(patch).length) return this.getUser(id);

    patch.updatedAt = new Date();
    const [updated] = await this.db
      .update(superAdmins)
      .set(patch)
      .where(eq(superAdmins.id, id))
      .returning(SuperAdminService.USER_FIELDS);
    if (!updated) throw new NotFoundException();
    return updated;
  }
}
