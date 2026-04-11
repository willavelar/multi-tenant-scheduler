import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { appointments, services, tenants, professionals } from '@scheduler/shared';
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

  async create(dto: CreateAppointmentDto, clientId: string, tenantId: string) {
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

  async findAll(tenantId: string, userId: string, role: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      if (role === 'client') {
        return tx
          .select()
          .from(appointments)
          .where(and(eq(appointments.tenantId, tenantId), eq(appointments.clientId, userId)));
      }
      if (role === 'professional') {
        const [prof] = await tx
          .select({ id: professionals.id })
          .from(professionals)
          .where(and(eq(professionals.userId, userId), eq(professionals.tenantId, tenantId)));
        if (!prof) return [];
        return tx
          .select()
          .from(appointments)
          .where(and(eq(appointments.tenantId, tenantId), eq(appointments.professionalId, prof.id)));
      }
      // tenant_admin sees all
      return tx
        .select()
        .from(appointments)
        .where(eq(appointments.tenantId, tenantId));
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
