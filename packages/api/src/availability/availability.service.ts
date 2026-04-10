import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { weeklyAvailability, scheduleExceptions, appointments, AppointmentStatus } from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { SlotsService } from './slots.service';
import { CreateWeeklyAvailabilityDto } from './dto/create-weekly-availability.dto';
import { CreateExceptionDto } from './dto/create-exception.dto';
import { format } from 'date-fns';

@Injectable()
export class AvailabilityService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    private readonly slotsService: SlotsService,
  ) {}

  async getWeeklyAvailability(professionalId: string) {
    return this.db
      .select()
      .from(weeklyAvailability)
      .where(eq(weeklyAvailability.professionalId, professionalId));
  }

  async createWeeklyAvailability(dto: CreateWeeklyAvailabilityDto) {
    const [record] = await this.db.insert(weeklyAvailability).values(dto).returning();
    return record;
  }

  async deleteWeeklyAvailability(id: string) {
    await this.db.delete(weeklyAvailability).where(eq(weeklyAvailability.id, id));
  }

  async getExceptions(professionalId: string) {
    return this.db
      .select()
      .from(scheduleExceptions)
      .where(eq(scheduleExceptions.professionalId, professionalId));
  }

  async createException(dto: CreateExceptionDto) {
    const [record] = await this.db.insert(scheduleExceptions).values(dto).returning();
    return record;
  }

  async deleteException(id: string) {
    await this.db.delete(scheduleExceptions).where(eq(scheduleExceptions.id, id));
  }

  async getAvailableSlots(professionalId: string, date: string, tenantId: string): Promise<string[]> {
    const dayOfWeek = new Date(date).getDay();

    const [baseAvail] = await this.db
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

    const exceptions = await this.db
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

    const booked = await this.db
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
      .map(a => format(a.startsAt, 'HH:mm'));

    return this.slotsService.subtractBooked(allSlots, bookedTimes, baseAvail.slotDurationMinutes);
  }
}
