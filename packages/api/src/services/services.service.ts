import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, gt, notInArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { appointments, professionals, services, users } from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

const profUsers = alias(users, 'prof_users');

@Injectable()
export class ServicesService {
  constructor(@Inject(DB) private readonly db: DrizzleDB) {}

  findAll(tenantId: string) {
    return withTenant(this.db, tenantId, (tx) =>
      tx.select().from(services).where(eq(services.tenantId, tenantId)),
    );
  }

  async findOne(id: string, tenantId: string) {
    const [svc] = await withTenant(this.db, tenantId, (tx) =>
      tx.select().from(services).where(and(eq(services.id, id), eq(services.tenantId, tenantId))),
    );
    if (!svc) throw new NotFoundException('Service not found');
    return svc;
  }

  async create(dto: CreateServiceDto, tenantId: string) {
    const [svc] = await withTenant(this.db, tenantId, (tx) =>
      tx.insert(services).values({ ...dto, tenantId }).returning(),
    );
    return svc;
  }

  async update(id: string, dto: UpdateServiceDto, tenantId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [existing] = await tx
        .select({ id: services.id })
        .from(services)
        .where(and(eq(services.id, id), eq(services.tenantId, tenantId)));
      if (!existing) throw new NotFoundException('Service not found');

      const [svc] = await tx
        .update(services)
        .set(dto)
        .where(and(eq(services.id, id), eq(services.tenantId, tenantId)))
        .returning();
      return svc;
    });
  }

  async remove(id: string, tenantId: string, cancelFuture = false) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [existing] = await tx
        .select({ id: services.id })
        .from(services)
        .where(and(eq(services.id, id), eq(services.tenantId, tenantId)));
      if (!existing) throw new NotFoundException('Service not found');

      const now = new Date();
      const blocking = await tx
        .select({
          id:               appointments.id,
          startsAt:         appointments.startsAt,
          endsAt:           appointments.endsAt,
          status:           appointments.status,
          clientName:       users.name,
          professionalName: profUsers.name,
        })
        .from(appointments)
        .innerJoin(users, eq(appointments.clientId, users.id))
        .innerJoin(professionals, eq(appointments.professionalId, professionals.id))
        .innerJoin(profUsers, eq(professionals.userId, profUsers.id))
        .where(and(
          eq(appointments.serviceId, id),
          gt(appointments.startsAt, now),
          notInArray(appointments.status, ['cancelled_by_client', 'cancelled_by_professional', 'completed']),
        ));

      if (blocking.length > 0) {
        if (!cancelFuture) {
          throw new ConflictException({
            message: 'Existem agendamentos futuros vinculados a este serviço.',
            blockingAppointments: blocking,
          });
        }
        await tx
          .update(appointments)
          .set({ status: 'cancelled_by_professional' })
          .where(and(
            eq(appointments.serviceId, id),
            gt(appointments.startsAt, now),
            notInArray(appointments.status, ['cancelled_by_client', 'cancelled_by_professional', 'completed']),
          ));
      }

      await tx.delete(services).where(and(eq(services.id, id), eq(services.tenantId, tenantId)));
    });
  }
}
