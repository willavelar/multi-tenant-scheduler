import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { SuperAdminService } from './super-admin.service';
import { DB } from '../database/database.module';

jest.mock('bcryptjs');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('SuperAdminService', () => {
  let service: SuperAdminService;

  const mockDb = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  };
  const mockJwt = { sign: jest.fn().mockReturnValue('token') };
  const mockConfig = { get: jest.fn().mockReturnValue('secret') };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockJwt.sign.mockReturnValue('token');
    mockConfig.get.mockReturnValue('secret');

    const module = await Test.createTestingModule({
      providers: [
        SuperAdminService,
        { provide: DB, useValue: mockDb },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(SuperAdminService);
  });

  // ────────────────────────────────────────────────────────
  // login
  // ────────────────────────────────────────────────────────

  describe('login', () => {
    const fakeUser = {
      id: 'user-uuid-1',
      email: 'admin@platform.com',
      name: 'Super Admin',
      role: 'super_admin',
      tenantId: null,
      passwordHash: 'hashed-password',
      active: true,
    };

    it('returns accessToken and refreshToken when credentials are valid', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([fakeUser]),
        }),
      });
      mockedBcrypt.compare.mockResolvedValue(true as never);

      // insert for refresh token persistence
      const mockReturning = jest.fn().mockResolvedValue([]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      mockDb.insert.mockReturnValue({ values: mockValues });

      const result = await service.login('admin@platform.com', 'correct-password');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.accessToken).toBe('token');
      expect(result.refreshToken).toBe('token');
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([fakeUser]),
        }),
      });
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login('admin@platform.com', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login('nobody@platform.com', 'any-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ────────────────────────────────────────────────────────
  // createTenant
  // ────────────────────────────────────────────────────────

  describe('createTenant', () => {
    it('throws BadRequestException when slug is reserved (app)', async () => {
      await expect(
        service.createTenant({ name: 'App Tenant', slug: 'app' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when DB returns error code 23505 (duplicate slug)', async () => {
      const mockReturning = jest.fn().mockRejectedValue({ code: '23505' });
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      mockDb.insert.mockReturnValue({ values: mockValues });

      await expect(
        service.createTenant({ name: 'Clinic', slug: 'my-clinic' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates and returns a tenant when slug is valid and unique', async () => {
      const fakeTenant = { id: 'tenant-1', name: 'My Clinic', slug: 'my-clinic' };
      const mockReturning = jest.fn().mockResolvedValue([fakeTenant]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      mockDb.insert.mockReturnValue({ values: mockValues });

      const result = await service.createTenant({ name: 'My Clinic', slug: 'my-clinic' });

      expect(result).toEqual(fakeTenant);
    });
  });

  // ────────────────────────────────────────────────────────
  // getTenant
  // ────────────────────────────────────────────────────────

  describe('getTenant', () => {
    it('throws NotFoundException when tenant does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      await expect(service.getTenant('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('returns the tenant when found', async () => {
      const fakeTenant = { id: 'tenant-1', name: 'My Clinic', slug: 'my-clinic' };
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([fakeTenant]),
        }),
      });

      const result = await service.getTenant('tenant-1');
      expect(result).toEqual(fakeTenant);
    });
  });
});
