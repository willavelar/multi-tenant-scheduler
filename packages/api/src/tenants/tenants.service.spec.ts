import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { DB } from '../database/database.module';
import { REDIS } from '../redis/redis.module';

// Helper that builds a minimal tx mock. Individual tests can pass
// overrides for select/update to control the query chain.
const makeTx = (overrides: Record<string, jest.Mock> = {}) => ({
  execute: jest.fn().mockResolvedValue(undefined),
  select: jest.fn(),
  update: jest.fn(),
  ...overrides,
});

describe('TenantsService', () => {
  let service: TenantsService;

  // mockDb for the outer describe: resolveTenantId uses db.select directly;
  // findCurrent/update go through db.transaction → tx.select / tx.update.
  const mockDb = {
    select: jest.fn(),
    transaction: jest.fn(),
  };
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

  // ──────────────────────────────────────────────────────────────────────────
  // resolveTenantId — still calls db.select directly (no withTenant)
  // ──────────────────────────────────────────────────────────────────────────

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

  // ──────────────────────────────────────────────────────────────────────────
  // findCurrent — goes through db.transaction → tx.select
  // ──────────────────────────────────────────────────────────────────────────

  describe('findCurrent', () => {
    it('returns the tenant when found', async () => {
      const fakeTenant = {
        id: 't1', name: 'Clinic', slug: 'clinic', logoUrl: null, logoDarkUrl: null,
        confirmationMode: 'auto', allowPaidStatus: true,
        cancellationReasonMode: 'no',
        cancellationDeadlineValue: null, cancellationDeadlineUnit: null,
      };

      const mockTxSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([fakeTenant]),
        }),
      });
      const tx = makeTx({ select: mockTxSelect });
      mockDb.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));

      const result = await service.findCurrent('t1');
      expect(result).toEqual(fakeTenant);
      expect(tx.execute).toHaveBeenCalled();
      expect(mockTxSelect).toHaveBeenCalled();
    });

    it('throws NotFoundException when tenant not found', async () => {
      const mockTxSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });
      const tx = makeTx({ select: mockTxSelect });
      mockDb.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));

      await expect(service.findCurrent('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // update (cancellation deadline fields) — goes through db.transaction → tx.update
  // ──────────────────────────────────────────────────────────────────────────

  describe('cancellation deadline fields', () => {
    const mockReturning = jest.fn();
    const mockWhere2    = jest.fn().mockReturnValue({ returning: mockReturning });
    const mockSet       = jest.fn().mockReturnValue({ where: mockWhere2 });
    const mockUpdate    = jest.fn().mockReturnValue({ set: mockSet });

    let svc: TenantsService;
    let mockDb2: { select: jest.Mock; transaction: jest.Mock };

    beforeEach(async () => {
      jest.clearAllMocks();

      // Re-wire the chain after clearAllMocks
      mockUpdate.mockReturnValue({ set: mockSet });
      mockSet.mockReturnValue({ where: mockWhere2 });
      mockWhere2.mockReturnValue({ returning: mockReturning });

      mockDb2 = {
        select: jest.fn(),
        transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
          const tx = makeTx({ update: mockUpdate });
          return fn(tx);
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          TenantsService,
          { provide: DB,    useValue: mockDb2 },
          { provide: REDIS, useValue: { get: jest.fn(), set: jest.fn() } },
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
