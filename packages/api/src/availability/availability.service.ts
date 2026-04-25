import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { weeklyAvailability, scheduleExceptions, appointments, professionals, AppointmentStatus } from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';
import { SlotsService } from './slots.service';
import { CreateWeeklyAvailabilityDto } from './dto/create-weekly-availability.dto';
import { CreateExceptionDto } from './dto/create-exception.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    private readonly slotsService: SlotsService,
  ) {}

  getWeeklyAvailability(professionalId: string, tenantId: string) {
    return withTenant(this.db, tenantId, (tx) =>
      tx.select().from(weeklyAvailability).where(eq(weeklyAvailability.professionalId, professionalId)),
    );
  }

  async createWeeklyAvailability(
    dto: CreateWeeklyAvailabilityDto,
    tenantId: string,
    requestingUserId: string,
    requestingRole: string,
  ) {
    if (requestingRole === 'professional') {
      await this.assertOwnsProfessional(dto.professionalId, requestingUserId, tenantId);
    }
    const [record] = await withTenant(this.db, tenantId, (tx) =>
      tx.insert(weeklyAvailability).values(dto).returning(),
    );
    return record;
  }

  async deleteWeeklyAvailability(
    id: string,
    tenantId: string,
    requestingUserId: string,
    requestingRole: string,
  ) {
    if (requestingRole === 'professional') {
      const [record] = await withTenant(this.db, tenantId, (tx) =>
        tx.select({ professionalId: weeklyAvailability.professionalId })
          .from(weeklyAvailability)
          .where(eq(weeklyAvailability.id, id)),
      );
      if (!record) throw new NotFoundException('Availability record not found');
      await this.assertOwnsProfessional(record.professionalId, requestingUserId, tenantId);
    }
    return withTenant(this.db, tenantId, (tx) =>
      tx.delete(weeklyAvailability).where(eq(weeklyAvailability.id, id)),
    );
  }

  private async assertOwnsProfessional(professionalId: string, userId: string, tenantId: string) {
    const [prof] = await withTenant(this.db, tenantId, (tx) =>
      tx.select({ id: professionals.id })
        .from(professionals)
        .where(and(eq(professionals.id, professionalId), eq(professionals.userId, userId))),
    );
    if (!prof) throw new ForbiddenException('You can only manage your own availability');
  }

  getExceptions(professionalId: string, tenantId: string) {
    return withTenant(this.db, tenantId, (tx) =>
      tx.select().from(scheduleExceptions).where(eq(scheduleExceptions.professionalId, professionalId)),
    );
  }

  async createException(
    dto: CreateExceptionDto,
    tenantId: string,
    requestingUserId: string,
    requestingRole: string,
  ) {
    if (requestingRole === 'professional') {
      await this.assertOwnsProfessional(dto.professionalId, requestingUserId, tenantId);
    }
    const [record] = await withTenant(this.db, tenantId, (tx) =>
      tx.insert(scheduleExceptions).values(dto).returning(),
    );
    return record;
  }

  async deleteException(
    id: string,
    tenantId: string,
    requestingUserId: string,
    requestingRole: string,
  ) {
    if (requestingRole === 'professional') {
      const [record] = await withTenant(this.db, tenantId, (tx) =>
        tx.select({ professionalId: scheduleExceptions.professionalId })
          .from(scheduleExceptions)
          .where(eq(scheduleExceptions.id, id)),
      );
      if (!record) throw new NotFoundException('Exception not found');
      await this.assertOwnsProfessional(record.professionalId, requestingUserId, tenantId);
    }
    return withTenant(this.db, tenantId, (tx) =>
      tx.delete(scheduleExceptions).where(eq(scheduleExceptions.id, id)),
    );
  }

  async getAvailableSlots(professionalId: string, date: string, tenantId: string): Promise<string[]> {
    const dayOfWeek = new Date(date).getUTCDay();

    return withTenant(this.db, tenantId, async (tx) => {
      const [baseAvail] = await tx
        .select()
        .from(weeklyAvailability)
        .where(
          and(
            eq(weeklyAvailability.professionalId, professionalId),
            eq(weeklyAvailability.dayOfWeek, dayOfWeek),
          ),
        );

      if (!baseAvail) return [];

      let allSlots = this.slotsService.generateSlots(
        baseAvail.startTime,
        baseAvail.endTime,
        baseAvail.slotDurationMinutes,
      );

      const exceptions = await tx
        .select()
        .from(scheduleExceptions)
        .where(
          and(
            eq(scheduleExceptions.professionalId, professionalId),
            eq(scheduleExceptions.date, date),
          ),
        );

      const blocks = exceptions.filter(e => e.type === 'block');
      for (const block of blocks) {
        const blockSlots = this.slotsService.generateSlots(block.startTime, block.endTime, baseAvail.slotDurationMinutes);
        allSlots = this.slotsService.subtractBooked(allSlots, blockSlots, baseAvail.slotDurationMinutes);
      }

      const extras = exceptions.filter(e => e.type === 'extra');
      for (const extra of extras) {
        const extraSlots = this.slotsService.generateSlots(extra.startTime, extra.endTime, baseAvail.slotDurationMinutes);
        allSlots = [...new Set([...allSlots, ...extraSlots])].sort();
      }

      const dayStart = new Date(`${date}T00:00:00Z`);
      const dayEnd = new Date(`${date}T23:59:59Z`);

      const booked = await tx
        .select({ startsAt: appointments.startsAt })
        .from(appointments)
        .where(
          and(
            eq(appointments.professionalId, professionalId),
            eq(appointments.tenantId, tenantId),
            inArray(appointments.status, [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]),
          ),
        );

      const bookedTimes = booked
        .filter(a => a.startsAt >= dayStart && a.startsAt <= dayEnd)
        .map(a => `${a.startsAt.getUTCHours().toString().padStart(2, '0')}:${a.startsAt.getUTCMinutes().toString().padStart(2, '0')}`);

      return this.slotsService.subtractBooked(allSlots, bookedTimes, baseAvail.slotDurationMinutes);
    });
  }
}
