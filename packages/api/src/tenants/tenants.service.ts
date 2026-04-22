import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { tenants } from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { REDIS } from '../redis/redis.module';
import type Redis from 'ioredis';
import { UpdateTenantDto } from './dto/update-tenant.dto';

const TENANT_CACHE_TTL = 3600;

@Injectable()
export class TenantsService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async resolveTenantId(slug: string): Promise<string | null> {
    const cacheKey = `tenant:slug:${slug}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const [tenant] = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug));

    if (!tenant) return null;

    await this.redis.set(cacheKey, tenant.id, 'EX', TENANT_CACHE_TTL);
    return tenant.id;
  }

  async findCurrent(tenantId: string) {
    const [tenant] = await this.db
      .select({
        id:      tenants.id,
        name:    tenants.name,
        slug:    tenants.slug,
        logoUrl: tenants.logoUrl,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId));

    return tenant ?? null;
  }

  async update(tenantId: string, dto: UpdateTenantDto) {
    const patch: Partial<typeof tenants.$inferInsert> = {};
    if (dto.name    !== undefined) patch.name    = dto.name;
    if (dto.logoUrl !== undefined) patch.logoUrl = dto.logoUrl;

    const [updated] = await this.db
      .update(tenants)
      .set(patch)
      .where(eq(tenants.id, tenantId))
      .returning({
        id:      tenants.id,
        name:    tenants.name,
        slug:    tenants.slug,
        logoUrl: tenants.logoUrl,
      });

    return updated;
  }
}
