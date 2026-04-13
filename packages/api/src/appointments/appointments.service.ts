import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, count, desc, gte, lte } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { appointments, services, tenants, professionals, users } from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';
import { AvailabilityService } from '../availability/availability.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async create(dto: CreateAppointmentDto, userId: string, userRole: string, tenantId: string) {
    const clientId =
      dto.clientId && (userRole === 'tenant_admin' || userRole === 'professional')
        ? dto.clientId
        : userId;
    const availableSlots = await this.availabilityService.getAvailableSlots(
      dto.professionalId, dto.date, tenantId,
    );
    if (!availableSlots.includes(dto.startTime)) {
      throw new BadRequestException('Selected slot is not available');
    }

    return withTenant(this.db, tenantId, async (tx) => {
      const [svc] = await tx
        .select({ durationMinutes: services.durationMinutes })
        .from(services)
        .where(and(eq(services.id, dto.serviceId), eq(services.tenantId, tenantId)));
      if (!svc) throw new NotFoundException('Service not found');

      const [tenant] = await tx
        .select({ confirmationMode: tenants.confirmationMode })
        .from(tenants)
        .where(eq(tenants.id, tenantId));
      if (!tenant) throw new NotFoundException('Tenant not found');

      const startsAt = new Date(`${dto.date}T${dto.startTime}:00Z`);
      const endsAt = new Date(startsAt.getTime() + svc.durationMinutes * 60000);
      const status = tenant.confirmationMode === 'auto' ? 'confirmed' : 'pending';

      const [appointment] = await tx.insert(appointments).values({
        tenantId,
        professionalId: dto.professionalId,
        serviceId: dto.serviceId,
        clientId,
        startsAt,
        endsAt,
        status,
      }).returning();

      return appointment;
    });
  }

  async findAll(
    tenantId: string,
    userId: string,
    role: string,
    page: number,
    limit: number,
    filters: {
      dateFrom?: string;
      dateTo?: string;
      serviceId?: string;
      status?: string;
      clientId?: string;
    } = {},
  ) {
    const offset = (page - 1) * limit;

    const profUsers = alias(users, 'prof_users');

    return withTenant(this.db, tenantId, async (tx) => {
      const FIELDS = {
        id:               appointments.id,
        startsAt:         appointments.startsAt,
        endsAt:           appointments.endsAt,
        status:           appointments.status,
        createdAt:        appointments.createdAt,
        professionalId:   appointments.professionalId,
        serviceId:        appointments.serviceId,
        clientId:         appointments.clientId,
        clientName:       users.name,
        serviceName:      services.name,
        professionalName: profUsers.name,
      };

      let roleWhere;
      if (role === 'client') {
        roleWhere = and(eq(appointments.tenantId, tenantId), eq(appointments.clientId, userId));
      } else if (role === 'professional') {
        const [prof] = await tx
          .select({ id: professionals.id })
          .from(professionals)
          .where(and(eq(professionals.userId, userId), eq(professionals.tenantId, tenantId)));
        if (!prof) return { data: [], total: 0, page, limit };
        roleWhere = and(eq(appointments.tenantId, tenantId), eq(appointments.professionalId, prof.id));
      } else {
        roleWhere = eq(appointments.tenantId, tenantId);
      }

      const where = and(
        roleWhere,
        filters.dateFrom ? gte(appointments.startsAt, new Date(filters.dateFrom + 'T00:00:00.000Z')) : undefined,
        filters.dateTo   ? lte(appointments.startsAt, new Date(filters.dateTo   + 'T23:59:59.999Z')) : undefined,
        filters.serviceId ? eq(appointments.serviceId, filters.serviceId) : undefined,
        filters.status    ? eq(appointments.status, filters.status as any) : undefined,
        filters.clientId  ? eq(appointments.clientId, filters.clientId)   : undefined,
      );

      const [{ total }] = await tx
        .select({ total: count() })
        .from(appointments)
        .where(where);

      const data = await tx
        .select(FIELDS)
        .from(appointments)
        .innerJoin(users, eq(appointments.clientId, users.id))
        .innerJoin(services, eq(appointments.serviceId, services.id))
        .innerJoin(professionals, eq(appointments.professionalId, professionals.id))
        .innerJoin(profUsers, eq(professionals.userId, profUsers.id))
        .where(where)
        .orderBy(desc(appointments.startsAt))
        .limit(limit)
        .offset(offset);

      return { data, total, page, limit };
    });
  }

  async updateStatus(id: string, status: 'confirmed' | 'cancelled' | 'completed', tenantId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [appt] = await tx
        .select()
        .from(appointments)
        .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)));
      if (!appt) throw new NotFoundException('Appointment not found');

      const [updated] = await tx
        .update(appointments)
        .set({ status })
        .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
        .returning();
      return updated;
    });
  }
}
