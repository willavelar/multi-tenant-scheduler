import { Test } from '@nestjs/testing';
import { TenantsService } from './tenants.service';
import { DB } from '../database/database.module';
import { REDIS } from '../redis/redis.module';

describe('TenantsService', () => {
  let service: TenantsService;
  const mockDb = { select: jest.fn() };
  const mockRedis = { get: jest.fn(), set: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
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

  describe('cancellation deadline fields', () => {
    const mockReturning  = jest.fn();
    const mockWhere2     = jest.fn().mockReturnValue({ returning: mockReturning });
    const mockSet        = jest.fn().mockReturnValue({ where: mockWhere2 });
    const mockUpdate     = jest.fn().mockReturnValue({ set: mockSet });
    const mockFromWhere2 = jest.fn();
    const mockFrom2      = jest.fn().mockReturnValue({ where: mockFromWhere2 });
    const mockSelect2    = jest.fn().mockReturnValue({ from: mockFrom2 });

    const mockDb2    = { select: mockSelect2, update: mockUpdate };
    const mockRedis2 = { get: jest.fn(), set: jest.fn() };

    let svc: TenantsService;

    beforeEach(async () => {
      jest.clearAllMocks();
      mockSelect2.mockReturnValue({ from: mockFrom2 });
      mockFrom2.mockReturnValue({ where: mockFromWhere2 });
      mockUpdate.mockReturnValue({ set: mockSet });
      mockSet.mockReturnValue({ where: mockWhere2 });
      mockWhere2.mockReturnValue({ returning: mockReturning });

      const module = await Test.createTestingModule({
        providers: [
          TenantsService,
          { provide: DB,    useValue: mockDb2 },
          { provide: REDIS, useValue: mockRedis2 },
        ],
      }).compile();
      svc = module.get(TenantsService);
    });

    it('update patches cancellationDeadlineValue and cancellationDeadlineUnit when provided', async () => {
      mockReturning.mockResolvedValue([{
        id: 't1', name: 'Clinic', slug: 'clinic', logoUrl: null,
        confirmationMode: 'auto', allowPaidStatus: true,
        cancellationReasonMode: 'no',
        cancellationDeadlineValue: 2, cancellationDeadlineUnit: 'hours',
      }]);

      await svc.update('t1', { cancellationDeadlineValue: 2, cancellationDeadlineUnit: 'hours' });

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ cancellationDeadlineValue: 2, cancellationDeadlineUnit: 'hours' }),
      );
    });

    it('update patches both fields as null to clear the deadline', async () => {
      mockReturning.mockResolvedValue([{
        id: 't1', name: 'Clinic', slug: 'clinic', logoUrl: null,
        confirmationMode: 'auto', allowPaidStatus: true,
        cancellationReasonMode: 'no',
        cancellationDeadlineValue: null, cancellationDeadlineUnit: null,
      }]);

      await svc.update('t1', { cancellationDeadlineValue: null, cancellationDeadlineUnit: null });

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ cancellationDeadlineValue: null, cancellationDeadlineUnit: null }),
      );
    });
  });
});
