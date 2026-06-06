import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { suggestions, users } from '@scheduler/shared';
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
}
