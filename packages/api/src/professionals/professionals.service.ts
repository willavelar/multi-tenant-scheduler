import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { professionals } from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';

@Injectable()
export class ProfessionalsService {
  constructor(@Inject(DB) private readonly db: DrizzleDB) {}

  findAll(tenantId: string) {
    return withTenant(this.db, tenantId, (tx) =>
      tx.select().from(professionals).where(eq(professionals.tenantId, tenantId)),
    );
  }

  async findOne(id: string, tenantId: string) {
    const [prof] = await withTenant(this.db, tenantId, (tx) =>
      tx.select().from(professionals).where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId))),
    );
    if (!prof) throw new NotFoundException('Professional not found');
    return prof;
  }

  async create(dto: CreateProfessionalDto, tenantId: string) {
    const [prof] = await withTenant(this.db, tenantId, (tx) =>
      tx.insert(professionals).values({ ...dto, tenantId }).returning(),
    );
    return prof;
  }

  async update(id: string, dto: UpdateProfessionalDto, tenantId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [existing] = await tx
        .select({ id: professionals.id })
        .from(professionals)
        .where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId)));
      if (!existing) throw new NotFoundException('Professional not found');

      const [prof] = await tx
        .update(professionals)
        .set(dto)
        .where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId)))
        .returning();
      return prof;
    });
  }

  async remove(id: string, tenantId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [existing] = await tx
        .select({ id: professionals.id })
        .from(professionals)
        .where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId)));
      if (!existing) throw new NotFoundException('Professional not found');

      await tx.delete(professionals).where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId)));
    });
  }
}
