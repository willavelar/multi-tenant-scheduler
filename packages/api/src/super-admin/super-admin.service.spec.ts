import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { SuperAdminService } from './super-admin.service';
import { DB } from '../database/database.module';
import { REDIS } from '../redis/redis.module';

const mockRedis = { del: jest.fn(), set: jest.fn(), get: jest.fn() };
const mockJwt = { sign: jest.fn().mockReturnValue('signed-token') };

function makeChainSequence(responses: unknown[]) {
  let call = 0;
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'from', 'where', 'insert', 'values', 'returning',
                   'update', 'set', 'delete', 'orderBy', 'limit', 'offset'];
  methods.forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain); });
  chain['then'] = jest.fn().mockImplementation((resolve: (v: unknown) => void) => {
    resolve(responses[call] ?? responses[responses.length - 1]);
    call++;
  });
  chain['execute'] = jest.fn().mockResolvedValue(undefined);
  return chain;
}

function makeMockDb(responses: unknown[]) {
  const chain = makeChainSequence(responses);
  const db: Record<string, unknown> = {};
  const methods = ['select', 'from', 'where', 'insert', 'values', 'returning',
                   'update', 'set', 'delete', 'orderBy', 'limit', 'offset'];
  methods.forEach((m) => { db[m] = jest.fn().mockReturnValue(chain); });
  db['execute'] = jest.fn().mockResolvedValue(undefined);
  db['transaction'] = jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(chain));
  return db;
}

async function buildService(dbResponses: unknown[]) {
  const module = await Test.createTestingModule({
    providers: [
      SuperAdminService,
      { provide: DB, useValue: makeMockDb(dbResponses) },
      { provide: REDIS, useValue: mockRedis },
      { provide: JwtService, useValue: mockJwt },
    ],
  }).compile();
  return module.get(SuperAdminService);
}

describe('SuperAdminService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── login ────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('returns accessToken for valid credentials', async () => {
      const hash = await bcrypt.hash('password', 1);
      const service = await buildService([[{ id: 'sa-1', email: 'a@b.com', passwordHash: hash, name: 'Admin' }]]);
      const result = await service.login('a@b.com', 'password');
      expect(result.accessToken).toBe('signed-token');
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const hash = await bcrypt.hash('correct', 1);
      const service = await buildService([[{ id: 'sa-1', email: 'a@b.com', passwordHash: hash, name: 'Admin' }]]);
      await expect(service.login('a@b.com', 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for unknown email', async () => {
      const service = await buildService([[]]); // empty result
      await expect(service.login('unknown@b.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── listTenants ──────────────────────────────────────────────────────────
  describe('listTenants', () => {
    it('returns paginated result with total', async () => {
      const fakeTenantsPage = [
        { id: 't-1', slug: 'a', name: 'A', active: true, createdAt: new Date() },
      ];
      // First call: data query; second call: count query
      const service = await buildService([fakeTenantsPage, [{ total: 1 }]]);
      const result = await service.listTenants(1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  // ── getTenant ────────────────────────────────────────────────────────────
  describe('getTenant', () => {
    it('returns tenant when found', async () => {
      const tenant = { id: 't-1', slug: 'demo', name: 'Demo', active: true, createdAt: new Date() };
      const service = await buildService([[tenant]]);
      await expect(service.getTenant('t-1')).resolves.toEqual(tenant);
    });

    it('throws NotFoundException when tenant does not exist', async () => {
      const service = await buildService([[]]); // empty
      await expect(service.getTenant('missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── createTenant ─────────────────────────────────────────────────────────
  describe('createTenant', () => {
    const dto = {
      slug: 'new-tenant', name: 'New', adminEmail: 'admin@new.com',
      adminName: 'Admin', adminPassword: 'pass123',
    };

    it('throws BadRequestException for reserved slug', async () => {
      const service = await buildService([[]]);
      await expect(service.createTenant({ ...dto, slug: 'app' })).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException for duplicate slug', async () => {
      // transaction: first query returns existing tenant
      const service = await buildService([[{ id: 't-existing' }]]);
      await expect(service.createTenant(dto)).rejects.toThrow(ConflictException);
    });

    it('creates and returns the new tenant', async () => {
      const created = { id: 't-new', slug: 'new-tenant', name: 'New', active: true, createdAt: new Date() };
      // transaction: select (no existing) → insert tenant → insert user
      const service = await buildService([[], [created], [{ id: 'u-new' }]]);
      const result = await service.createTenant(dto);
      expect(result.slug).toBe('new-tenant');
    });
  });

  // ── updateTenant ─────────────────────────────────────────────────────────
  describe('updateTenant', () => {
    it('throws NotFoundException for missing tenant', async () => {
      const service = await buildService([[]]); // empty
      await expect(service.updateTenant('missing', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for reserved slug update', async () => {
      const existing = { id: 't-1', slug: 'demo' };
      const service = await buildService([[existing]]);
      await expect(service.updateTenant('t-1', { slug: 'app' })).rejects.toThrow(BadRequestException);
    });

    it('updates and returns the tenant', async () => {
      const existing = { id: 't-1', slug: 'demo' };
      const updated = { id: 't-1', slug: 'demo', name: 'Updated', active: true, createdAt: new Date() };
      const service = await buildService([[existing], [updated]]);
      const result = await service.updateTenant('t-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('invalidates Redis slug cache on update', async () => {
      const existing = { id: 't-1', slug: 'demo' };
      const updated = { id: 't-1', slug: 'demo', name: 'X', active: true, createdAt: new Date() };
      const service = await buildService([[existing], [updated]]);
      await service.updateTenant('t-1', { active: false });
      expect(mockRedis.del).toHaveBeenCalledWith('tenant:slug:demo');
    });
  });
});
