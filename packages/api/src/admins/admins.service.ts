import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import { users } from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';

const ADMIN_FIELDS = {
  id:        users.id,
  name:      users.name,
  email:     users.email,
  avatarUrl: users.avatarUrl,
  active:    users.active,
  createdAt: users.createdAt,
};

@Injectable()
export class AdminsService {
  constructor(@Inject(DB) private readonly db: DrizzleDB) {}

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
}
