import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { DB } from '../database/database.module';

// A thenable proxy: acts as a chainable query builder and can be awaited.
// All query methods return the same thenable object (self-referential chain).
// execute() returns a resolved promise (for the withTenant set_config call).
function makeChain(resolveWith: unknown): Record<string, unknown> {
  const thenable: Record<string, unknown> = {};

  const methods = ['select', 'from', 'innerJoin', 'where', 'insert', 'values', 'returning', 'update', 'set', 'delete'];
  methods.forEach((m) => {
    thenable[m] = jest.fn().mockReturnValue(thenable);
  });

  // Make thenable so it resolves when awaited
  thenable['then'] = jest.fn().mockImplementation((resolve: (v: unknown) => void) => resolve(resolveWith));
  thenable['execute'] = jest.fn().mockResolvedValue(undefined);

  return thenable;
}

function makeMockDb(resolveWith: unknown) {
  const chain = makeChain(resolveWith);

  // db itself is NOT thenable (no .then), to avoid NestJS DI treating it as a promise
  const db: Record<string, unknown> = {};

  const methods = ['select', 'from', 'innerJoin', 'where', 'insert', 'values', 'returning', 'update', 'set', 'delete'];
  methods.forEach((m) => {
    db[m] = jest.fn().mockReturnValue(chain);
  });

  db['execute'] = jest.fn().mockResolvedValue(undefined);
  db['transaction'] = jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(chain));

  return db;
}

describe('ProfessionalsService', () => {
  it('remove throws ForbiddenException when deleting own account', async () => {
    const mockDb = makeMockDb([{ id: 'prof-1', userId: 'user-1' }]);
    const module = await Test.createTestingModule({
      providers: [ProfessionalsService, { provide: DB, useValue: mockDb }],
    }).compile();
    const service = module.get(ProfessionalsService);

    await expect(service.remove('prof-1', 'tenant-1', 'user-1')).rejects.toThrow(ForbiddenException);
  });

  it('update throws ForbiddenException when professional tries to change another user', async () => {
    const mockDb = makeMockDb([{ id: 'prof-1', userId: 'user-2' }]);
    const module = await Test.createTestingModule({
      providers: [ProfessionalsService, { provide: DB, useValue: mockDb }],
    }).compile();
    const service = module.get(ProfessionalsService);

    await expect(
      service.update('prof-1', { name: 'X' }, 'tenant-1', 'user-1', 'professional'),
    ).rejects.toThrow(ForbiddenException);
  });
});
