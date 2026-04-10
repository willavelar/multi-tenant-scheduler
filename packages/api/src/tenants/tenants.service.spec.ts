import { Test } from '@nestjs/testing';
import { TenantsService } from './tenants.service';
import { DB } from '../database/database.module';
import { REDIS } from '../redis/redis.module';

describe('TenantsService', () => {
  let service: TenantsService;
  const mockDb = { select: jest.fn() };
  const mockRedis = { get: jest.fn(), set: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: DB, useValue: mockDb },
        { provide: REDIS, useValue: mockRedis },
      ],
    }).compile();
    service = module.get(TenantsService);
  });

  it('returns tenant id from cache when present', async () => {
    mockRedis.get.mockResolvedValue('tenant-uuid-123');
    const result = await service.resolveTenantId('my-clinic');
    expect(result).toBe('tenant-uuid-123');
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it('returns null when tenant slug not found', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    });
    const result = await service.resolveTenantId('nonexistent');
    expect(result).toBeNull();
  });
});
