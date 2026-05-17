import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, gt, ilike, inArray, notInArray, or } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { alias } from 'drizzle-orm/pg-core';
import {
  appointments,
  clientProfiles,
  clientProfessionals,
  clientServices,
  clientServiceLimits,
  professionals,
  services,
  users,
} from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { randomBytes } from 'crypto';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { REDIS } from '../redis/redis.module';
import { EmailQueueProducer } from '../email-queue/email-queue.producer';
import { sendInviteEmail } from '../auth/invite.helper';

const profUsers = alias(users, 'prof_users');

@Injectable()
export class ClientsService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly emailQueueProducer: EmailQueueProducer,
  ) {}

  async findAll(
    tenantId: string,
    page: number,
    limit: number,
    filters: { q?: string; active?: string; professionalUserId?: string } = {},
  ) {
    const offset = (page - 1) * limit;

    return withTenant(this.db, tenantId, async (tx) => {
      const professionalFilter = filters.professionalUserId
        ? inArray(
            clientProfiles.id,
            tx
              .select({ id: clientProfessionals.clientProfileId })
              .from(clientProfessionals)
              .innerJoin(professionals, eq(professionals.id, clientProfessionals.professionalId))
              .where(eq(professionals.userId, filters.professionalUserId)),
          )
        : undefined;

      const where = and(
        eq(users.tenantId, tenantId),
        eq(users.role, 'client'),
        filters.q ? or(ilike(users.name, `%${filters.q}%`), ilike(users.email, `%${filters.q}%`)) : undefined,
        filters.active === 'true'  ? eq(users.active, true)  : undefined,
        filters.active === 'false' ? eq(users.active, false) : undefined,
        professionalFilter,
      );

      const FIELDS = {
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        profileId: clientProfiles.id,
        birthDate: clientProfiles.birthDate,
        notes: clientProfiles.notes,
        active: users.active,
        avatarUrl: users.avatarUrl,
        allProfessionals: clientProfiles.allProfessionals,
        allServices: clientProfiles.allServices,
        serviceLimitCount: clientProfiles.serviceLimitCount,
        serviceLimitPeriod: clientProfiles.serviceLimitPeriod,
        cancellationLimitCount:  clientProfiles.cancellationLimitCount,
        cancellationLimitPeriod: clientProfiles.cancellationLimitPeriod,
      };

      const [{ total }] = await tx
        .select({ total: count() })
        .from(users)
        .leftJoin(clientProfiles, eq(clientProfiles.userId, users.id))
        .where(where);

      const data = await tx
        .select(FIELDS)
        .from(users)
        .leftJoin(clientProfiles, eq(clientProfiles.userId, users.id))
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      return { data, total, page, limit };
    });
  }

  async findOne(userId: string, tenantId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [row] = await tx
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          profileId: clientProfiles.id,
          birthDate: clientProfiles.birthDate,
          notes: clientProfiles.notes,
          active: users.active,
          avatarUrl: users.avatarUrl,
          notifyViaSystem:   users.notifyViaSystem,
          notifyViaEmail:    users.notifyViaEmail,
          notifyViaWhatsapp: users.notifyViaWhatsapp,
          allProfessionals: clientProfiles.allProfessionals,
          allServices: clientProfiles.allServices,
          serviceLimitCount: clientProfiles.serviceLimitCount,
          serviceLimitPeriod: clientProfiles.serviceLimitPeriod,
          cancellationLimitCount:  clientProfiles.cancellationLimitCount,
          cancellationLimitPeriod: clientProfiles.cancellationLimitPeriod,
        })
        .from(users)
        .leftJoin(clientProfiles, eq(clientProfiles.userId, users.id))
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId), eq(users.role, 'client')));

      if (!row) throw new NotFoundException('Client not found');

      const linkedProfessionals = row.profileId
        ? await tx
            .select({
              professionalId: professionals.id,
              name: profUsers.name,
              position: professionals.position,
            })
            .from(clientProfessionals)
            .innerJoin(professionals, eq(professionals.id, clientProfessionals.professionalId))
            .innerJoin(profUsers, eq(profUsers.id, professionals.userId))
            .where(eq(clientProfessionals.clientProfileId, row.profileId))
        : [];

      const linkedServices = row.profileId
        ? await tx
            .select({ serviceId: services.id, name: services.name })
            .from(clientServices)
            .innerJoin(services, eq(services.id, clientServices.serviceId))
            .where(eq(clientServices.clientProfileId, row.profileId))
        : [];

      const perServiceLimits = row.profileId
        ? await tx
            .select({
              serviceId:   clientServiceLimits.serviceId,
              limitCount:  clientServiceLimits.limitCount,
              limitPeriod: clientServiceLimits.limitPeriod,
            })
            .from(clientServiceLimits)
            .where(eq(clientServiceLimits.clientProfileId, row.profileId))
        : [];

      return { ...row, linkedProfessionals, linkedServices, perServiceLimits };
    });
  }

  async create(dto: CreateClientDto, tenantId: string, slug: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, dto.email), eq(users.tenantId, tenantId)));
      if (existing) throw new ConflictException('Email already in use');

      const rawPassword = dto.sendInvite ? randomBytes(16).toString('hex') : dto.password!;
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      const [user] = await tx
        .insert(users)
        .values({
          tenantId,
          email: dto.email,
          passwordHash,
          role: 'client',
          name: dto.name,
          phone: dto.phone,
          active: dto.sendInvite ? false : (dto.active ?? true),
          avatarUrl: dto.avatarUrl,
        })
        .returning();

      const [profile] = await tx
        .insert(clientProfiles)
        .values({
          tenantId,
          userId: user.id,
          birthDate: dto.birthDate,
          notes: dto.notes,
          allProfessionals: dto.allProfessionals ?? false,
          allServices: dto.allServices ?? false,
          serviceLimitCount: dto.serviceLimitCount,
          serviceLimitPeriod: dto.serviceLimitPeriod,
          cancellationLimitCount:  dto.cancellationLimitCount,
          cancellationLimitPeriod: dto.cancellationLimitPeriod,
        })
        .returning();

      if (dto.professionalIds?.length) {
        await tx.insert(clientProfessionals).values(
          dto.professionalIds.map((professionalId) => ({ tenantId, clientProfileId: profile.id, professionalId })),
        );
      }

      if (dto.serviceIds?.length) {
        await tx.insert(clientServices).values(
          dto.serviceIds.map((serviceId) => ({ tenantId, clientProfileId: profile.id, serviceId })),
        );
      }

      if (dto.serviceLimits?.length) {
        await tx.insert(clientServiceLimits).values(
          dto.serviceLimits.map((sl) => ({
            tenantId,
            clientProfileId: profile.id,
            serviceId:  sl.serviceId,
            limitCount: sl.limitCount,
            limitPeriod: sl.limitPeriod,
          })),
        );
      }

      if (dto.sendInvite) {
        await sendInviteEmail(user, tenantId, slug, this.redis, this.config, this.emailQueueProducer);
      }

      return { id: user.id };
    });
  }

  async update(userId: string, dto: UpdateClientDto, tenantId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId), eq(users.role, 'client')));
      if (!user) throw new NotFoundException('Client not found');

      const userPatch: Partial<typeof users.$inferInsert> = {};
      if (dto.name       !== undefined) userPatch.name       = dto.name;
      if (dto.email      !== undefined) userPatch.email      = dto.email;
      if (dto.phone      !== undefined) userPatch.phone      = dto.phone;
      if (dto.active     !== undefined) userPatch.active     = dto.active;
      if (dto.avatarUrl  !== undefined) userPatch.avatarUrl  = dto.avatarUrl;
      if (dto.notifyViaSystem   !== undefined) userPatch.notifyViaSystem   = dto.notifyViaSystem;
      if (dto.notifyViaEmail    !== undefined) userPatch.notifyViaEmail    = dto.notifyViaEmail;
      if (dto.notifyViaWhatsapp !== undefined) userPatch.notifyViaWhatsapp = dto.notifyViaWhatsapp;
      if (Object.keys(userPatch).length) {
        await tx.update(users).set(userPatch).where(eq(users.id, userId));
      }

      const profilePatch: Partial<typeof clientProfiles.$inferInsert> = {};
      if (dto.birthDate          !== undefined) profilePatch.birthDate          = dto.birthDate;
      if (dto.notes              !== undefined) profilePatch.notes              = dto.notes;
      if (dto.allProfessionals   !== undefined) profilePatch.allProfessionals   = dto.allProfessionals;
      if (dto.allServices        !== undefined) profilePatch.allServices        = dto.allServices;
      if (dto.serviceLimitCount  !== undefined) profilePatch.serviceLimitCount  = dto.serviceLimitCount;
      if (dto.serviceLimitPeriod !== undefined) profilePatch.serviceLimitPeriod = dto.serviceLimitPeriod;
      if (dto.cancellationLimitCount  !== undefined) profilePatch.cancellationLimitCount  = dto.cancellationLimitCount;
      if (dto.cancellationLimitPeriod !== undefined) profilePatch.cancellationLimitPeriod = dto.cancellationLimitPeriod;

      const [existingProfile] = await tx
        .select({ id: clientProfiles.id })
        .from(clientProfiles)
        .where(eq(clientProfiles.userId, userId));

      let profileId: string;
      if (existingProfile) {
        if (Object.keys(profilePatch).length) {
          await tx.update(clientProfiles).set(profilePatch).where(eq(clientProfiles.id, existingProfile.id));
        }
        profileId = existingProfile.id;
      } else {
        const [p] = await tx
          .insert(clientProfiles)
          .values({ tenantId, userId, ...profilePatch })
          .returning();
        profileId = p.id;
      }

      if (dto.professionalIds !== undefined) {
        await tx.delete(clientProfessionals).where(eq(clientProfessionals.clientProfileId, profileId));
        if (dto.professionalIds.length) {
          await tx.insert(clientProfessionals).values(
            dto.professionalIds.map((professionalId) => ({ tenantId, clientProfileId: profileId, professionalId })),
          );
        }
      }

      if (dto.serviceIds !== undefined) {
        await tx.delete(clientServices).where(eq(clientServices.clientProfileId, profileId));
        if (dto.serviceIds.length) {
          await tx.insert(clientServices).values(
            dto.serviceIds.map((serviceId) => ({ tenantId, clientProfileId: profileId, serviceId })),
          );
        }
      }

      if (dto.serviceLimits !== undefined) {
        await tx.delete(clientServiceLimits).where(eq(clientServiceLimits.clientProfileId, profileId));
        if (dto.serviceLimits.length) {
          await tx.insert(clientServiceLimits).values(
            dto.serviceLimits.map((sl) => ({
              tenantId,
              clientProfileId: profileId,
              serviceId:  sl.serviceId,
              limitCount: sl.limitCount,
              limitPeriod: sl.limitPeriod,
            })),
          );
        }
      }

      return { updated: true };
    });
  }

  async remove(id: string, tenantId: string, cancelFuture = false) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, id), eq(users.tenantId, tenantId), eq(users.role, 'client')));
      if (!user) throw new NotFoundException('Client not found');

      const now = new Date();
      const blocking = await tx
        .select({
          id:               appointments.id,
          startsAt:         appointments.startsAt,
          endsAt:           appointments.endsAt,
          status:           appointments.status,
          serviceName:      services.name,
          professionalName: profUsers.name,
        })
        .from(appointments)
        .innerJoin(services, eq(appointments.serviceId, services.id))
        .innerJoin(professionals, eq(appointments.professionalId, professionals.id))
        .innerJoin(profUsers, eq(professionals.userId, profUsers.id))
        .where(and(
          eq(appointments.clientId, id),
          gt(appointments.startsAt, now),
          notInArray(appointments.status, ['cancelled_by_client', 'cancelled_by_professional', 'completed']),
        ));

      if (blocking.length > 0) {
        if (!cancelFuture) {
          throw new ConflictException({
            message: 'Existem agendamentos futuros vinculados a este cliente.',
            blockingAppointments: blocking,
          });
        }
        await tx
          .update(appointments)
          .set({ status: 'cancelled_by_professional' })
          .where(and(
            eq(appointments.clientId, id),
            gt(appointments.startsAt, now),
            notInArray(appointments.status, ['cancelled_by_client', 'cancelled_by_professional', 'completed']),
          ));
      }

      await tx.delete(users).where(eq(users.id, id));
      return { deleted: true };
    });
  }
}
