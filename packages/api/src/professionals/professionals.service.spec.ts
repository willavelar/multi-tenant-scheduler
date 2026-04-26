import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { DB } from '../database/database.module';

function makeChainSequence(responses: unknown[]) {
  let call = 0;
  const thenable: Record<string, unknown> = {};
  const methods = [
    'select', 'from', 'innerJoin', 'leftJoin', 'where',
    'insert', 'values', 'returning', 'update', 'set', 'delete',
    'orderBy', 'limit', 'offset',
  ];
  methods.forEach((m) => { thenable[m] = jest.fn().mockReturnValue(thenable); });
  thenable['then'] = jest.fn().mockImplementation((resolve: (v: unknown) => void) => {
    resolve(responses[call] ?? responses[responses.length - 1]);
    call++;
  });
  thenable['execute'] = jest.fn().mockResolvedValue(undefined);
  return thenable;
}

function makeMockDbSequence(responses: unknown[]) {
  const chain = makeChainSequence(responses);
  const db: Record<string, unknown> = {};
  const methods = ['select', 'from', 'innerJoin', 'where', 'insert', 'values', 'returning', 'update', 'set', 'delete'];
  methods.forEach((m) => { db[m] = jest.fn().mockReturnValue(chain); });
  db['execute'] = jest.fn().mockResolvedValue(undefined);
  db['transaction'] = jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(chain));
  return db;
}

describe('ProfessionalsService', () => {
  it('remove throws ForbiddenException when deleting own account', async () => {
    const db = makeMockDbSequence([[{ id: 'prof-1', userId: 'user-1' }]]);
    const module = await Test.createTestingModule({
      providers: [ProfessionalsService, { provide: DB, useValue: db }],
    }).compile();
    await expect(
      module.get(ProfessionalsService).remove('prof-1', 'tenant-1', 'user-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('remove throws ConflictException with blockingAppointments when future appointments exist', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const db = makeMockDbSequence([
      [{ id: 'prof-1', userId: 'user-2' }],
      [{ id: 'apt-1', startsAt: future, endsAt: future, status: 'confirmed', serviceName: 'Corte', clientName: 'João' }],
    ]);
    const module = await Test.createTestingModule({
      providers: [ProfessionalsService, { provide: DB, useValue: db }],
    }).compile();
    const err = await module.get(ProfessionalsService)
      .remove('prof-1', 'tenant-1', 'user-1')
      .catch(e => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse().blockingAppointments).toHaveLength(1);
    expect(err.getResponse().blockingAppointments[0].id).toBe('apt-1');
  });

  it('remove with cancelFuture=true cancels appointments and deletes', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const db = makeMockDbSequence([
      [{ id: 'prof-1', userId: 'user-2' }],
      [{ id: 'apt-1', startsAt: future, endsAt: future, status: 'confirmed', serviceName: 'Corte', clientName: 'João' }],
      undefined,
      undefined,
    ]);
    const module = await Test.createTestingModule({
      providers: [ProfessionalsService, { provide: DB, useValue: db }],
    }).compile();
    await expect(
      module.get(ProfessionalsService).remove('prof-1', 'tenant-1', 'user-1', true),
    ).resolves.toBeUndefined();
  });

  it('remove succeeds when no future appointments exist', async () => {
    const db = makeMockDbSequence([
      [{ id: 'prof-1', userId: 'user-2' }],
      [],
      undefined,
    ]);
    const module = await Test.createTestingModule({
      providers: [ProfessionalsService, { provide: DB, useValue: db }],
    }).compile();
    await expect(
      module.get(ProfessionalsService).remove('prof-1', 'tenant-1', 'user-1'),
    ).resolves.toBeUndefined();
  });

  it('update throws ForbiddenException when professional tries to change another user', async () => {
    const db = makeMockDbSequence([[{ id: 'prof-1', userId: 'user-2' }]]);
    const module = await Test.createTestingModule({
      providers: [ProfessionalsService, { provide: DB, useValue: db }],
    }).compile();
    await expect(
      module.get(ProfessionalsService).update('prof-1', { name: 'X' }, 'tenant-1', 'user-1', 'professional'),
    ).rejects.toThrow(ForbiddenException);
  });
});
