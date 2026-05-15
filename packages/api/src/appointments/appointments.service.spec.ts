import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { DB } from '../database/database.module';
import { AvailabilityService } from '../availability/availability.service';
import { NotificationsService } from '../notifications/notifications.service';

jest.mock('../database/with-tenant', () => ({
  withTenant: (_db: any, _tenantId: string, fn: (tx: any) => any) => fn(_db),
}));

describe('AppointmentsService.updateStatus', () => {
  let service: AppointmentsService;

  const mockReturning   = jest.fn();
  const mockWhere       = jest.fn().mockReturnValue({ returning: mockReturning });
  const mockSet         = jest.fn().mockReturnValue({ where: mockWhere });
  const mockUpdate      = jest.fn().mockReturnValue({ set: mockSet });
  const mockFetchWhere  = jest.fn();
  const mockFrom        = jest.fn().mockReturnValue({ where: mockFetchWhere });
  const mockSelect      = jest.fn().mockReturnValue({ from: mockFrom });

  const mockDb = { select: mockSelect, update: mockUpdate };
  const mockAvailabilityService = { getAvailableSlots: jest.fn() };
  const mockNotificationsService = { dispatch: jest.fn().mockResolvedValue(undefined) };

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
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();
    service = module.get(AppointmentsService);
  });

  it('sets status to cancelled_by_client without reason when none is provided', async () => {
    mockFetchWhere.mockResolvedValue([{ id: 'appt-1', status: 'confirmed', tenantId: 'tenant-1' }]);
    mockReturning.mockResolvedValue([{ id: 'appt-1', status: 'cancelled_by_client', cancellationReason: null }]);

    await service.updateStatus('appt-1', 'cancelled_by_client', 'tenant-1', 'user-1', 'client');

    expect(mockSet).toHaveBeenCalledWith({ status: 'cancelled_by_client' });
  });

  it('sets status to cancelled_by_professional without reason when none is provided', async () => {
    mockFetchWhere.mockResolvedValue([{ id: 'appt-1', status: 'confirmed', tenantId: 'tenant-1' }]);
    mockReturning.mockResolvedValue([{ id: 'appt-1', status: 'cancelled_by_professional', cancellationReason: null }]);

    await service.updateStatus('appt-1', 'cancelled_by_professional', 'tenant-1', 'user-1', 'professional');

    expect(mockSet).toHaveBeenCalledWith({ status: 'cancelled_by_professional' });
  });

  it('persists cancellation reason when provided for client cancellation', async () => {
    mockFetchWhere.mockResolvedValue([{ id: 'appt-1', status: 'confirmed', tenantId: 'tenant-1' }]);
    mockReturning.mockResolvedValue([{ id: 'appt-1', status: 'cancelled_by_client', cancellationReason: 'Not available' }]);

    await service.updateStatus('appt-1', 'cancelled_by_client', 'tenant-1', 'user-1', 'client', 'Not available');

    expect(mockSet).toHaveBeenCalledWith({ status: 'cancelled_by_client', cancellationReason: 'Not available' });
  });

  it('throws NotFoundException when appointment does not exist', async () => {
    mockFetchWhere.mockResolvedValue([]);

    await expect(
      service.updateStatus('nonexistent', 'cancelled_by_client', 'tenant-1', 'user-1', 'client'),
    ).rejects.toThrow(NotFoundException);
  });
});
