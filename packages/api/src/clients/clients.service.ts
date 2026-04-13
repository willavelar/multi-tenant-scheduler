import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, eq, ilike, or } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { alias } from 'drizzle-orm/pg-core';
import {
  clientProfiles,
  clientProfessionals,
  clientServices,
  professionals,
  services,
  users,
} from '@scheduler/shared';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const profUsers = alias(users, 'prof_users');

@Injectable()
export class ClientsService {
  constructor(@Inject(DB) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    page: number,
    limit: number,
    filters: { q?: string; active?: string } = {},
  ) {
    const offset = (page - 1) * limit;

    return withTenant(this.db, tenantId, async (tx) => {
      const where = and(
        eq(users.tenantId, tenantId),
        eq(users.role, 'client'),
        filters.q ? or(ilike(users.name, `%${filters.q}%`), ilike(users.email, `%${filters.q}%`)) : undefined,
        filters.active === 'true'  ? eq(clientProfiles.active, true)  : undefined,
        filters.active === 'false' ? eq(clientProfiles.active, false) : undefined,
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
        active: clientProfiles.active,
        allProfessionals: clientProfiles.allProfessionals,
        allServices: clientProfiles.allServices,
        serviceLimitCount: clientProfiles.serviceLimitCount,
        serviceLimitPeriod: clientProfiles.serviceLimitPeriod,
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
        .orderBy(users.name)
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
          active: clientProfiles.active,
          allProfessionals: clientProfiles.allProfessionals,
          allServices: clientProfiles.allServices,
          serviceLimitCount: clientProfiles.serviceLimitCount,
          serviceLimitPeriod: clientProfiles.serviceLimitPeriod,
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

      return { ...row, linkedProfessionals, linkedServices };
    });
  }

  async create(dto: CreateClientDto, tenantId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, dto.email), eq(users.tenantId, tenantId)));
      if (existing) throw new ConflictException('Email already in use');

      const passwordHash = await bcrypt.hash(dto.password, 10);

      const [user] = await tx
        .insert(users)
        .values({ tenantId, email: dto.email, passwordHash, role: 'client', name: dto.name, phone: dto.phone })
        .returning();

      const [profile] = await tx
        .insert(clientProfiles)
        .values({
          tenantId,
          userId: user.id,
          birthDate: dto.birthDate,
          notes: dto.notes,
          active: dto.active ?? true,
          allProfessionals: dto.allProfessionals ?? false,
          allServices: dto.allServices ?? false,
          serviceLimitCount: dto.serviceLimitCount,
          serviceLimitPeriod: dto.serviceLimitPeriod,
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

      // Update user fields
      const userPatch: Partial<typeof users.$inferInsert> = {};
      if (dto.name  !== undefined) userPatch.name  = dto.name;
      if (dto.email !== undefined) userPatch.email = dto.email;
      if (dto.phone !== undefined) userPatch.phone = dto.phone;
      if (Object.keys(userPatch).length) {
        await tx.update(users).set(userPatch).where(eq(users.id, userId));
      }

      // Upsert profile
      const profilePatch: Partial<typeof clientProfiles.$inferInsert> = {};
      if (dto.birthDate            !== undefined) profilePatch.birthDate            = dto.birthDate;
      if (dto.notes                !== undefined) profilePatch.notes                = dto.notes;
      if (dto.active               !== undefined) profilePatch.active               = dto.active;
      if (dto.allProfessionals     !== undefined) profilePatch.allProfessionals     = dto.allProfessionals;
      if (dto.allServices          !== undefined) profilePatch.allServices          = dto.allServices;
      if (dto.serviceLimitCount    !== undefined) profilePatch.serviceLimitCount    = dto.serviceLimitCount;
      if (dto.serviceLimitPeriod   !== undefined) profilePatch.serviceLimitPeriod   = dto.serviceLimitPeriod;

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
          .values({ tenantId, userId, active: true, ...profilePatch })
          .returning();
        profileId = p.id;
      }

      // Sync professional links
      if (dto.professionalIds !== undefined) {
        await tx.delete(clientProfessionals).where(eq(clientProfessionals.clientProfileId, profileId));
        if (dto.professionalIds.length) {
          await tx.insert(clientProfessionals).values(
            dto.professionalIds.map((professionalId) => ({ tenantId, clientProfileId: profileId, professionalId })),
          );
        }
      }

      // Sync service links
      if (dto.serviceIds !== undefined) {
        await tx.delete(clientServices).where(eq(clientServices.clientProfileId, profileId));
        if (dto.serviceIds.length) {
          await tx.insert(clientServices).values(
            dto.serviceIds.map((serviceId) => ({ tenantId, clientProfileId: profileId, serviceId })),
          );
        }
      }

      return { updated: true };
    });
  }

  async remove(id: string, tenantId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, id), eq(users.tenantId, tenantId), eq(users.role, 'client')));
      if (!user) throw new NotFoundException('Client not found');

      await tx.delete(users).where(eq(users.id, id));
      return { deleted: true };
    });
  }
}
