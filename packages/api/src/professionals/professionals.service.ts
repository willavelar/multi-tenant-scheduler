import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, eq, ilike, or } from 'drizzle-orm';
import { professionals, users } from '@scheduler/shared';
import * as bcrypt from 'bcryptjs';
import { DB, DrizzleDB } from '../database/database.module';
import { withTenant } from '../database/with-tenant';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';

const PROF_FIELDS = {
  id:          professionals.id,
  tenantId:    professionals.tenantId,
  userId:      professionals.userId,
  bio:         professionals.bio,
  avatarUrl:   professionals.avatarUrl,
  position:    professionals.position,
  active:      professionals.active,
  name:        users.name,
  email:       users.email,
  phone:       users.phone,
  role:        users.role,
  lastLoginAt: users.lastLoginAt,
  createdAt:   users.createdAt,
};

@Injectable()
export class ProfessionalsService {
  constructor(@Inject(DB) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    page = 1,
    limit = 10,
    filters: { q?: string; active?: string } = {},
  ) {
    const offset = (page - 1) * limit;
    return withTenant(this.db, tenantId, async (tx) => {
      const where = and(
        eq(professionals.tenantId, tenantId),
        filters.q ? or(ilike(users.name, `%${filters.q}%`), ilike(users.email, `%${filters.q}%`)) : undefined,
        filters.active === 'true'  ? eq(professionals.active, true)  : undefined,
        filters.active === 'false' ? eq(professionals.active, false) : undefined,
      );

      const [{ total }] = await tx
        .select({ total: count() })
        .from(professionals)
        .innerJoin(users, eq(professionals.userId, users.id))
        .where(where);

      const data = await tx
        .select(PROF_FIELDS)
        .from(professionals)
        .innerJoin(users, eq(professionals.userId, users.id))
        .where(where)
        .orderBy(users.name)
        .limit(limit)
        .offset(offset);

      return { data, total, page, limit };
    });
  }

  async findOne(id: string, tenantId: string) {
    const [prof] = await withTenant(this.db, tenantId, (tx) =>
      tx.select(PROF_FIELDS)
        .from(professionals)
        .innerJoin(users, eq(professionals.userId, users.id))
        .where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId))),
    );
    if (!prof) throw new NotFoundException('Professional not found');
    return prof;
  }

  async findByUserId(userId: string, tenantId: string) {
    const [prof] = await withTenant(this.db, tenantId, (tx) =>
      tx.select(PROF_FIELDS)
        .from(professionals)
        .innerJoin(users, eq(professionals.userId, users.id))
        .where(and(eq(professionals.userId, userId), eq(professionals.tenantId, tenantId))),
    );
    if (!prof) throw new NotFoundException('Professional profile not found');
    return prof;
  }

  async create(dto: CreateProfessionalDto, tenantId: string) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return withTenant(this.db, tenantId, async (tx) => {
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, dto.email), eq(users.tenantId, tenantId)));
      if (existing) throw new ConflictException('Email already in use');

      const [user] = await tx.insert(users).values({
        tenantId,
        email: dto.email,
        passwordHash,
        role: 'professional',
        name: dto.name,
      }).returning();

      const [prof] = await tx.insert(professionals).values({
        tenantId,
        userId: user.id,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
        position: dto.position,
      }).returning();

      return { ...prof, name: user.name, email: user.email, phone: null, role: user.role };
    });
  }

  async update(
    id: string,
    dto: UpdateProfessionalDto,
    tenantId: string,
    requestingUserId: string,
    requestingUserRole: string,
  ) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [prof] = await tx
        .select({ id: professionals.id, userId: professionals.userId })
        .from(professionals)
        .where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId)));
      if (!prof) throw new NotFoundException('Professional not found');

      const isAdmin = requestingUserRole === 'tenant_admin';
      const isOwn   = prof.userId === requestingUserId;

      if (!isAdmin && !isOwn) throw new ForbiddenException('Cannot edit another professional');

      // Fields only admin may change
      if (!isAdmin && (dto.active !== undefined || dto.role !== undefined)) {
        throw new ForbiddenException('Only admins can change role and status');
      }

      // Update users table (name, role)
      const userPatch: Record<string, unknown> = {};
      if (dto.name !== undefined) userPatch.name = dto.name;
      if (dto.role !== undefined && isAdmin) userPatch.role = dto.role;
      if (Object.keys(userPatch).length) {
        await tx.update(users).set(userPatch).where(eq(users.id, prof.userId));
      }

      // Update professionals table
      const profPatch: Record<string, unknown> = {};
      if (dto.bio       !== undefined) profPatch.bio       = dto.bio;
      if (dto.avatarUrl !== undefined) profPatch.avatarUrl = dto.avatarUrl;
      if (dto.position  !== undefined) profPatch.position  = dto.position;
      if (dto.active    !== undefined && isAdmin) profPatch.active = dto.active;
      if (Object.keys(profPatch).length) {
        await tx.update(professionals).set(profPatch)
          .where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId)));
      }

      const [updated] = await tx
        .select(PROF_FIELDS)
        .from(professionals)
        .innerJoin(users, eq(professionals.userId, users.id))
        .where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId)));
      if (!updated) throw new NotFoundException('Professional not found');
      return updated;
    });
  }

  async remove(id: string, tenantId: string, requestingUserId: string) {
    return withTenant(this.db, tenantId, async (tx) => {
      const [prof] = await tx
        .select({ id: professionals.id, userId: professionals.userId })
        .from(professionals)
        .where(and(eq(professionals.id, id), eq(professionals.tenantId, tenantId)));
      if (!prof) throw new NotFoundException('Professional not found');
      if (prof.userId === requestingUserId) throw new ForbiddenException('Cannot delete your own account');

      // Delete user first — FK cascade on professionals.userId removes the professional row automatically
      await tx.delete(users).where(eq(users.id, prof.userId));
    });
  }
}
