import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { count, desc, eq } from 'drizzle-orm';
import { suggestions, tenants, users } from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';

@Injectable()
export class SuggestionsService {
  constructor(@Inject(DB) private readonly db: DrizzleDB) {}

  async create(tenantId: string, userId: string, dto: CreateSuggestionDto) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [author] = await tx
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const [row] = await tx
        .insert(suggestions)
        .values({
          tenantId,
          userId,
          userName: author?.name ?? 'Unknown',
          userEmail: author?.email ?? '',
          content: dto.content,
          imageUrl: dto.image ?? null,
        })
        .returning();

      return row;
    });
  }

  // Super-admin methods below run on the raw connection WITHOUT withTenant by design:
  // `suggestions` has no RLS (like `tenants`/`super_admins`), so the platform operator —
  // who has no tenant context — can read/triage across all tenants. Do NOT wrap these in
  // withTenant: setting a single tenant context would hide every other tenant's rows.
  async list(page: number, limit: number, status?: 'new' | 'resolved') {
    const offset = (page - 1) * limit;
    const where = status ? eq(suggestions.status, status) : undefined;

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(suggestions)
      .where(where);

    const data = await this.db
      .select({
        id:         suggestions.id,
        tenantId:   suggestions.tenantId,
        tenantName: tenants.name,
        userName:   suggestions.userName,
        userEmail:  suggestions.userEmail,
        content:    suggestions.content,
        status:     suggestions.status,
        createdAt:  suggestions.createdAt,
      })
      .from(suggestions)
      .leftJoin(tenants, eq(tenants.id, suggestions.tenantId))
      .where(where)
      .orderBy(desc(suggestions.createdAt))
      .limit(limit)
      .offset(offset);

    return { data, total: Number(total), page, limit };
  }

  async findOne(id: string) {
    const [row] = await this.db
      .select({
        id:         suggestions.id,
        tenantId:   suggestions.tenantId,
        tenantName: tenants.name,
        userName:   suggestions.userName,
        userEmail:  suggestions.userEmail,
        content:    suggestions.content,
        imageUrl:   suggestions.imageUrl,
        status:     suggestions.status,
        createdAt:  suggestions.createdAt,
      })
      .from(suggestions)
      .leftJoin(tenants, eq(tenants.id, suggestions.tenantId))
      .where(eq(suggestions.id, id))
      .limit(1);

    if (!row) throw new NotFoundException('Suggestion not found');
    return row;
  }

  async updateStatus(id: string, status: 'new' | 'resolved') {
    const [row] = await this.db
      .update(suggestions)
      .set({ status })
      .where(eq(suggestions.id, id))
      .returning();

    if (!row) throw new NotFoundException('Suggestion not found');
    return row;
  }

  async remove(id: string) {
    const [row] = await this.db
      .delete(suggestions)
      .where(eq(suggestions.id, id))
      .returning({ id: suggestions.id });

    if (!row) throw new NotFoundException('Suggestion not found');
    return { id: row.id };
  }
}
