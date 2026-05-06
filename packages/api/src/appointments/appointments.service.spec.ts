import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { DB } from '../database/database.module';
import { AvailabilityService } from '../availability/availability.service';

jest.mock('../database/with-tenant', () => ({
  withTenant: (_db: any, _tenantId: string, fn: (tx: any) => any) => fn(_db),
}));

describe('AppointmentsService.updateStatus', () => {
  let service: AppointmentsService;

  const mockReturning = jest.fn();
  const mockWhere     = jest.fn().mockReturnValue({ returning: mockReturning });
  const mockSet       = jest.fn().mockReturnValue({ where: mockWhere });
  const mockUpdate    = jest.fn().mockReturnValue({ set: mockSet });
  const mockFetchWhere = jest.fn();
  const mockFrom       = jest.fn().mockReturnValue({ where: mockFetchWhere });
  const mockSelect     = jest.fn().mockReturnValue({ from: mockFrom });

  const mockDb = { select: mockSelect, update: mockUpdate };
  const mockAvailabilityService = { getAvailableSlots: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockFetchWhere });
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ returning: mockReturning });

    const module = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: DB, useValue: mockDb },
        { provide: AvailabilityService, useValue: mockAvailabilityService },
      ],
    }).compile();
    service = module.get(AppointmentsService);
  });

  it('cancels appointment without reason when none is provided', async () => {
    mockFetchWhere.mockResolvedValue([{ id: 'appt-1', status: 'confirmed', tenantId: 'tenant-1' }]);
    mockReturning.mockResolvedValue([{ id: 'appt-1', status: 'cancelled', cancellationReason: null }]);

    await service.updateStatus('appt-1', 'cancelled', 'tenant-1');

    expect(mockSet).toHaveBeenCalledWith({ status: 'cancelled' });
  });

  it('persists cancellation reason when provided', async () => {
    mockFetchWhere.mockResolvedValue([{ id: 'appt-1', status: 'confirmed', tenantId: 'tenant-1' }]);
    mockReturning.mockResolvedValue([{ id: 'appt-1', status: 'cancelled', cancellationReason: 'Client requested' }]);

    await service.updateStatus('appt-1', 'cancelled', 'tenant-1', 'Client requested');

    expect(mockSet).toHaveBeenCalledWith({ status: 'cancelled', cancellationReason: 'Client requested' });
  });

  it('throws NotFoundException when appointment does not exist', async () => {
    mockFetchWhere.mockResolvedValue([]);

    await expect(
      service.updateStatus('nonexistent', 'cancelled', 'tenant-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
