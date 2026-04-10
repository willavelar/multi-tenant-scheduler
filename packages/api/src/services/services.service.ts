import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { services } from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(@Inject(DB) private readonly db: DrizzleDB) {}

  findAll(tenantId: string) {
    return this.db.select().from(services).where(eq(services.tenantId, tenantId));
  }

  async findOne(id: string, tenantId: string) {
    const [svc] = await this.db
      .select()
      .from(services)
      .where(and(eq(services.id, id), eq(services.tenantId, tenantId)));
    if (!svc) throw new NotFoundException('Service not found');
    return svc;
  }

  async create(dto: CreateServiceDto, tenantId: string) {
    const [svc] = await this.db.insert(services).values({ ...dto, tenantId }).returning();
    return svc;
  }

  async update(id: string, dto: UpdateServiceDto, tenantId: string) {
    await this.findOne(id, tenantId);
    const [svc] = await this.db
      .update(services)
      .set(dto)
      .where(and(eq(services.id, id), eq(services.tenantId, tenantId)))
      .returning();
    return svc;
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    await this.db.delete(services).where(and(eq(services.id, id), eq(services.tenantId, tenantId)));
  }
}
