import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, count, desc, gte, lte, notInArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  appointments, services, tenants, professionals, users,
  clientProfiles, clientServiceLimits,
} from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';
import { AvailabilityService } from '../availability/availability.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

function getPeriodBounds(dateStr: string, period: 'day' | 'week' | 'month'): { from: Date; to: Date } {
  const date = new Date(dateStr + 'T00:00:00Z');
  if (period === 'day') {
    return {
      from: date,
      to: new Date(dateStr + 'T23:59:59.999Z'),
    };
  }
  if (period === 'week') {
    const dow = date.getUTCDay();
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() - ((dow + 6) % 7));
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 59, 999);
    return { from: monday, to: sunday };
  }
  // month
  const from = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const to   = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { from, to };
}

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    private readonly availabilityService: AvailabilityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateAppointmentDto, userId: string, userRole: string, tenantId: string) {
    const clientId =
      dto.clientId && (userRole === 'tenant_admin' || userRole === 'professional')
        ? dto.clientId
        : userId;

    const appointment = await withTenant(this.db, tenantId, async (tx) => {
      const availableSlots = await this.availabilityService.getAvailableSlots(
        dto.professionalId, dto.date, tenantId, tx,
      );
      if (!availableSlots.includes(dto.startTime)) {
        throw new BadRequestException('Selected slot is not available');
      }

      const [svc] = await tx
        .select({ durationMinutes: services.durationMinutes })
        .from(services)
        .where(and(eq(services.id, dto.serviceId), eq(services.tenantId, tenantId)));
      if (!svc) throw new NotFoundException('Service not found');

      // ── Appointment limit check ───────────────────────────────────────────
      const [limitProfile] = await tx
        .select({
          serviceLimitCount:  clientProfiles.serviceLimitCount,
          serviceLimitPeriod: clientProfiles.serviceLimitPeriod,
        })
        .from(clientProfiles)
        .where(and(eq(clientProfiles.userId, clientId), eq(clientProfiles.tenantId, tenantId)));

      if (limitProfile?.serviceLimitCount != null && limitProfile?.serviceLimitPeriod != null) {
        const { from, to } = getPeriodBounds(dto.date, limitProfile.serviceLimitPeriod);
        const [{ total }] = await tx
          .select({ total: count() })
          .from(appointments)
          .where(and(
            eq(appointments.clientId, clientId),
            eq(appointments.tenantId, tenantId),
            gte(appointments.startsAt, from),
            lte(appointments.startsAt, to),
            notInArray(appointments.status, ['cancelled_by_client', 'cancelled_by_professional', 'completed']),
          ));
        if (Number(total) >= limitProfile.serviceLimitCount) {
          throw new BadRequestException('LIMIT_EXCEEDED');
        }
      } else if (limitProfile) {
        const [serviceLimit] = await tx
          .select({ limitCount: clientServiceLimits.limitCount, limitPeriod: clientServiceLimits.limitPeriod })
          .from(clientServiceLimits)
          .innerJoin(clientProfiles, eq(clientProfiles.id, clientServiceLimits.clientProfileId))
          .where(and(
            eq(clientProfiles.userId, clientId),
            eq(clientProfiles.tenantId, tenantId),
            eq(clientServiceLimits.serviceId, dto.serviceId),
            eq(clientServiceLimits.tenantId, tenantId),
          ));

        if (serviceLimit) {
          const { from, to } = getPeriodBounds(dto.date, serviceLimit.limitPeriod);
          const [{ total }] = await tx
            .select({ total: count() })
            .from(appointments)
            .where(and(
              eq(appointments.clientId, clientId),
              eq(appointments.tenantId, tenantId),
              eq(appointments.serviceId, dto.serviceId),
              gte(appointments.startsAt, from),
              lte(appointments.startsAt, to),
              notInArray(appointments.status, ['cancelled_by_client', 'cancelled_by_professional', 'completed']),
            ));
          if (Number(total) >= serviceLimit.limitCount) {
            throw new BadRequestException('LIMIT_EXCEEDED');
          }
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      const [tenant] = await tx
        .select({ confirmationMode: tenants.confirmationMode })
        .from(tenants)
        .where(eq(tenants.id, tenantId));
      if (!tenant) throw new NotFoundException('Tenant not found');

      const startsAt = new Date(`${dto.date}T${dto.startTime}:00Z`);
      const endsAt = new Date(startsAt.getTime() + svc.durationMinutes * 60000);

      let status: 'pending' | 'confirmed';
      if (tenant.confirmationMode === 'auto') {
        status = 'confirmed';
      } else {
        // manual mode: clients always start pending; admin/prof may choose
        const isPrivileged = userRole === 'tenant_admin' || userRole === 'professional';
        status = isPrivileged && dto.initialStatus ? dto.initialStatus : 'pending';
      }

      try {
        const [appt] = await tx.insert(appointments).values({
          tenantId,
          professionalId: dto.professionalId,
          serviceId: dto.serviceId,
          clientId,
          startsAt,
          endsAt,
          status,
        }).returning();
        return appt;
      } catch (err: any) {
        if (err.code === '23505') throw new ConflictException('Slot no longer available');
        throw err;
      }
    });

    await this.notificationsService.dispatch({
      appointmentId: appointment.id,
      tenantId,
      actorUserId:   userId,
      actorRole:     userRole as 'client' | 'professional' | 'tenant_admin',
      event:         'appointment_created',
    });

    return appointment;
  }

  async checkLimit(
    clientId: string,
    serviceId: string,
    date: string,
    tenantId: string,
  ): Promise<{ exceeded: boolean }> {
    return withTenant(this.db, tenantId, async (tx) => {
      const [profile] = await tx
        .select({
          serviceLimitCount:  clientProfiles.serviceLimitCount,
          serviceLimitPeriod: clientProfiles.serviceLimitPeriod,
        })
        .from(clientProfiles)
        .where(and(eq(clientProfiles.userId, clientId), eq(clientProfiles.tenantId, tenantId)));

      if (!profile) return { exceeded: false };

      if (profile.serviceLimitCount != null && profile.serviceLimitPeriod != null) {
        const { from, to } = getPeriodBounds(date, profile.serviceLimitPeriod);
        const [{ total }] = await tx
          .select({ total: count() })
          .from(appointments)
          .where(and(
            eq(appointments.clientId, clientId),
            eq(appointments.tenantId, tenantId),
            gte(appointments.startsAt, from),
            lte(appointments.startsAt, to),
            notInArray(appointments.status, ['cancelled_by_client', 'cancelled_by_professional', 'completed']),
          ));
        return { exceeded: Number(total) >= profile.serviceLimitCount };
      }

      const [serviceLimit] = await tx
        .select({ limitCount: clientServiceLimits.limitCount, limitPeriod: clientServiceLimits.limitPeriod })
        .from(clientServiceLimits)
        .innerJoin(clientProfiles, eq(clientProfiles.id, clientServiceLimits.clientProfileId))
        .where(and(
          eq(clientProfiles.userId, clientId),
          eq(clientProfiles.tenantId, tenantId),
          eq(clientServiceLimits.serviceId, serviceId),
          eq(clientServiceLimits.tenantId, tenantId),
        ));

      if (!serviceLimit) return { exceeded: false };

      const { from, to } = getPeriodBounds(date, serviceLimit.limitPeriod);
      const [{ total }] = await tx
        .select({ total: count() })
        .from(appointments)
        .where(and(
          eq(appointments.clientId, clientId),
          eq(appointments.tenantId, tenantId),
          eq(appointments.serviceId, serviceId),
          gte(appointments.startsAt, from),
          lte(appointments.startsAt, to),
          notInArray(appointments.status, ['cancelled_by_client', 'cancelled_by_professional', 'completed']),
        ));
      return { exceeded: Number(total) >= serviceLimit.limitCount };
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
      professionalId?: string;
    } = {},
  ) {
    const offset = (page - 1) * limit;

    const profUsers = alias(users, 'prof_users');

    return withTenant(this.db, tenantId, async (tx) => {
      const FIELDS = {
        id:                    appointments.id,
        startsAt:              appointments.startsAt,
        endsAt:                appointments.endsAt,
        status:                appointments.status,
        createdAt:             appointments.createdAt,
        professionalId:        appointments.professionalId,
        serviceId:             appointments.serviceId,
        clientId:              appointments.clientId,
        clientName:            users.name,
        clientAvatarUrl:       users.avatarUrl,
        serviceName:           services.name,
        serviceColor:          services.color,
        professionalName:      profUsers.name,
        professionalAvatarUrl: profUsers.avatarUrl,
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
        filters.status         ? eq(appointments.status, filters.status as any)               : undefined,
        filters.clientId       ? eq(appointments.clientId, filters.clientId)                  : undefined,
        filters.professionalId ? eq(appointments.professionalId, filters.professionalId)      : undefined,
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
        .orderBy(desc(appointments.createdAt))
        .limit(limit)
        .offset(offset);

      return { data, total, page, limit };
    });
  }

  async findOne(id: string, tenantId: string, userId: string, role: string) {
    const profUsers = alias(users, 'prof_users');
    return withTenant(this.db, tenantId, async (tx) => {
      let roleWhere;
      if (role === 'client') {
        roleWhere = and(eq(appointments.id, id), eq(appointments.clientId, userId));
      } else if (role === 'professional') {
        const [prof] = await tx
          .select({ id: professionals.id })
          .from(professionals)
          .where(and(eq(professionals.userId, userId), eq(professionals.tenantId, tenantId)));
        if (!prof) return null;
        roleWhere = and(eq(appointments.id, id), eq(appointments.professionalId, prof.id));
      } else {
        roleWhere = eq(appointments.id, id);
      }

      const [appt] = await tx
        .select({
          id:                    appointments.id,
          startsAt:              appointments.startsAt,
          endsAt:                appointments.endsAt,
          status:                appointments.status,
          createdAt:             appointments.createdAt,
          cancellationReason:    appointments.cancellationReason,
          professionalId:        appointments.professionalId,
          serviceId:             appointments.serviceId,
          clientId:              appointments.clientId,
          clientName:            users.name,
          clientAvatarUrl:       users.avatarUrl,
          serviceName:           services.name,
          serviceColor:          services.color,
          professionalName:      profUsers.name,
          professionalAvatarUrl: profUsers.avatarUrl,
        })
        .from(appointments)
        .innerJoin(users, eq(appointments.clientId, users.id))
        .innerJoin(services, eq(appointments.serviceId, services.id))
        .innerJoin(professionals, eq(appointments.professionalId, professionals.id))
        .innerJoin(profUsers, eq(professionals.userId, profUsers.id))
        .where(roleWhere);

      return appt ?? null;
    });
  }

  async updateStatus(
    id: string,
    status: 'confirmed' | 'cancelled_by_client' | 'cancelled_by_professional' | 'completed',
    tenantId: string,
    actorUserId: string,
    actorRole: string,
    reason?: string,
  ) {
    const updated = await withTenant(this.db, tenantId, async (tx) => {
      if (status === 'completed') {
        const [tenant] = await tx
          .select({ allowPaidStatus: tenants.allowPaidStatus })
          .from(tenants)
          .where(eq(tenants.id, tenantId));
        if (!tenant?.allowPaidStatus) {
          throw new BadRequestException('Paid status is not enabled for this tenant');
        }
      }

      const [appt] = await tx
        .select()
        .from(appointments)
        .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)));
      if (!appt) throw new NotFoundException('Appointment not found');

      if (status === 'cancelled_by_client') {
        const [limitProfile] = await tx
          .select({
            cancellationLimitCount:  clientProfiles.cancellationLimitCount,
            cancellationLimitPeriod: clientProfiles.cancellationLimitPeriod,
          })
          .from(clientProfiles)
          .where(and(
            eq(clientProfiles.userId, appt.clientId),
            eq(clientProfiles.tenantId, tenantId),
          ));

        if (limitProfile?.cancellationLimitCount != null && limitProfile?.cancellationLimitPeriod != null) {
          const dateStr = appt.startsAt.toISOString().slice(0, 10);
          const { from, to } = getPeriodBounds(dateStr, limitProfile.cancellationLimitPeriod);
          const [{ total }] = await tx
            .select({ total: count() })
            .from(appointments)
            .where(and(
              eq(appointments.clientId, appt.clientId),
              eq(appointments.tenantId, tenantId),
              eq(appointments.status, 'cancelled_by_client'),
              gte(appointments.startsAt, from),
              lte(appointments.startsAt, to),
            ));
          if (Number(total) >= limitProfile.cancellationLimitCount) {
            throw new BadRequestException('CANCELLATION_LIMIT_EXCEEDED');
          }
        }
      }

      const setPayload: { status: typeof status; cancellationReason?: string } = { status };
      if ((status === 'cancelled_by_client' || status === 'cancelled_by_professional') && reason?.trim()) {
        setPayload.cancellationReason = reason;
      }

      const [result] = await tx
        .update(appointments)
        .set(setPayload)
        .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
        .returning();
      return result;
    });

    await this.notificationsService.dispatch({
      appointmentId: id,
      tenantId,
      actorUserId,
      actorRole: actorRole as 'client' | 'professional' | 'tenant_admin',
      event:     'appointment_status_changed',
      newStatus: status,
    });

    return updated;
  }

  async remove(id: string, tenantId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [appt] = await tx
        .select({ id: appointments.id })
        .from(appointments)
        .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)));
      if (!appt) throw new NotFoundException('Appointment not found');
      await tx.delete(appointments).where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)));
    });
  }
}
