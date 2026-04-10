import { Test } from '@nestjs/testing';
import { ProfessionalsService } from './professionals.service';
import { DB } from '../database/database.module';

const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('ProfessionalsService', () => {
  let service: ProfessionalsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProfessionalsService,
        { provide: DB, useValue: mockDb },
      ],
    }).compile();
    service = module.get(ProfessionalsService);
    jest.clearAllMocks();
  });

  it('findAll returns professionals filtered by tenantId', async () => {
    const mockResult = [{ id: 'uuid-1', tenantId: 'tenant-1', active: true }];
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(mockResult),
      }),
    });
    const result = await service.findAll('tenant-1');
    expect(result).toEqual(mockResult);
  });
});
