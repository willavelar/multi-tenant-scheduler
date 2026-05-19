import {
  BadRequestException, ConflictException, Inject,
  Injectable, NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { count, desc, eq } from 'drizzle-orm';
import { superAdmins, tenants, users } from '@scheduler/shared';
import Redis from 'ioredis';
import { DB, DrizzleDB } from '../database/database.module';
import { REDIS } from '../redis/redis.module';
import { RESERVED_SLUGS } from '../common/constants/password';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class SuperAdminService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    private readonly jwtService: JwtService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async login(email: string, password: string): Promise<{ accessToken: string }> {
    const [admin] = await this.db
      .select()
      .from(superAdmins)
      .where(eq(superAdmins.email, email));

    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      throw new UnauthorizedException();
    }

    const accessToken = this.jwtService.sign({
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      type: 'super_admin',
    });
    return { accessToken };
  }

  async listTenants(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [data, [{ total }]] = await Promise.all([
      this.db.select().from(tenants).orderBy(desc(tenants.createdAt)).limit(limit).offset(offset),
      this.db.select({ total: count() }).from(tenants),
    ]);
    return { data, total: Number(total), page, limit };
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

      const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
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

    await this.redis.del(`tenant:slug:${existing.slug}`);
    if (dto.slug && dto.slug !== existing.slug) {
      await this.redis.del(`tenant:slug:${dto.slug}`);
    }

    return updated;
  }
}
