import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import { users } from '@scheduler/shared';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { sendInviteEmail } from '../auth/invite.helper';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';
import { REDIS } from '../redis/redis.module';
import { EmailQueueProducer } from '../email-queue/email-queue.producer';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

const ADMIN_FIELDS = {
  id:          users.id,
  name:        users.name,
  email:       users.email,
  phone:       users.phone,
  avatarUrl:   users.avatarUrl,
  active:      users.active,
  notifyViaSystem:   users.notifyViaSystem,
  notifyViaEmail:    users.notifyViaEmail,
  notifyViaWhatsapp: users.notifyViaWhatsapp,
  lastLoginAt: users.lastLoginAt,
  createdAt:   users.createdAt,
};

@Injectable()
export class AdminsService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly emailQueueProducer: EmailQueueProducer,
  ) {}

  async findAll(
    tenantId: string,
    page = 1,
    limit = 10,
    filters: { q?: string; active?: string } = {},
  ) {
    const offset = (page - 1) * limit;
    return withTenant(this.db, tenantId, async (tx) => {
      const where = and(
        eq(users.tenantId, tenantId),
        eq(users.role, 'tenant_admin'),
        filters.q
          ? or(ilike(users.name, `%${filters.q}%`), ilike(users.email, `%${filters.q}%`))
          : undefined,
        filters.active === 'true'  ? eq(users.active, true)  : undefined,
        filters.active === 'false' ? eq(users.active, false) : undefined,
      );

      const [{ total }] = await tx.select({ total: count() }).from(users).where(where);
      const data = await tx
        .select(ADMIN_FIELDS)
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      return { data, total, page, limit };
    });
  }

  async findOne(tenantId: string, id: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [admin] = await tx
        .select(ADMIN_FIELDS)
        .from(users)
        .where(and(eq(users.id, id), eq(users.tenantId, tenantId), eq(users.role, 'tenant_admin')));
      if (!admin) throw new NotFoundException('Administrador não encontrado');
      return admin;
    });
  }

  async create(dto: CreateAdminDto, tenantId: string, slug: string) {
    const rawPassword = dto.sendInvite ? randomBytes(16).toString('hex') : dto.password!;
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    return withTenant(this.db, tenantId, async (tx) => {
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, dto.email), eq(users.tenantId, tenantId)));
      if (existing) throw new ConflictException('E-mail já está em uso');

      const [user] = await tx.insert(users).values({
        tenantId,
        email:        dto.email,
        passwordHash,
        role:         'tenant_admin',
        name:         dto.name,
        avatarUrl:    dto.avatarUrl,
        active:       !dto.sendInvite,
      }).returning();

      if (dto.sendInvite) {
        await sendInviteEmail(user, tenantId, slug, this.redis, this.config, this.emailQueueProducer);
      }

      return {
        id:          user.id,
        name:        user.name,
        email:       user.email,
        phone:       user.phone,
        avatarUrl:   user.avatarUrl ?? null,
        active:      user.active,
        lastLoginAt: null,
        createdAt:   user.createdAt,
      };
    });
  }

  async update(id: string, dto: UpdateAdminDto, tenantId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [admin] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, id), eq(users.tenantId, tenantId), eq(users.role, 'tenant_admin')));
      if (!admin) throw new NotFoundException('Administrador não encontrado');

      const patch: Record<string, unknown> = {};
      if (dto.name       !== undefined) patch.name       = dto.name;
      if (dto.avatarUrl  !== undefined) patch.avatarUrl  = dto.avatarUrl;
      if (dto.active     !== undefined) patch.active     = dto.active;
      if (dto.notifyViaSystem   !== undefined) patch.notifyViaSystem   = dto.notifyViaSystem;
      if (dto.notifyViaEmail    !== undefined) patch.notifyViaEmail    = dto.notifyViaEmail;
      if (dto.notifyViaWhatsapp !== undefined) patch.notifyViaWhatsapp = dto.notifyViaWhatsapp;

      if (Object.keys(patch).length) {
        await tx.update(users).set(patch).where(eq(users.id, id));
      }

      const [updated] = await tx.select(ADMIN_FIELDS).from(users).where(eq(users.id, id));
      if (!updated) throw new NotFoundException('Administrador não encontrado');
      return updated;
    });
  }
}
