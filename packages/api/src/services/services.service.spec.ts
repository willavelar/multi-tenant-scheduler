import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ServicesService } from './services.service';
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

describe('ServicesService', () => {
  it('remove throws NotFoundException when service not found', async () => {
    const db = makeMockDbSequence([[]]); // empty result
    const module = await Test.createTestingModule({
      providers: [ServicesService, { provide: DB, useValue: db }],
    }).compile();
    await expect(
      module.get(ServicesService).remove('svc-1', 'tenant-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('remove throws ConflictException with blockingAppointments when future appointments exist', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const db = makeMockDbSequence([
      [{ id: 'svc-1' }],
      [{ id: 'apt-1', startsAt: future, endsAt: future, status: 'confirmed', clientName: 'João', professionalName: 'Maria' }],
    ]);
    const module = await Test.createTestingModule({
      providers: [ServicesService, { provide: DB, useValue: db }],
    }).compile();
    const err = await module.get(ServicesService)
      .remove('svc-1', 'tenant-1')
      .catch(e => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse().blockingAppointments).toHaveLength(1);
    expect(err.getResponse().blockingAppointments[0].id).toBe('apt-1');
  });

  it('remove with cancelFuture=true cancels appointments and deletes', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const db = makeMockDbSequence([
      [{ id: 'svc-1' }],
      [{ id: 'apt-1', startsAt: future, endsAt: future, status: 'confirmed', clientName: 'João', professionalName: 'Maria' }],
      undefined,
      undefined,
    ]);
    const module = await Test.createTestingModule({
      providers: [ServicesService, { provide: DB, useValue: db }],
    }).compile();
    await expect(
      module.get(ServicesService).remove('svc-1', 'tenant-1', true),
    ).resolves.toBeUndefined();
  });

  it('remove succeeds when no future appointments exist', async () => {
    const db = makeMockDbSequence([
      [{ id: 'svc-1' }],
      [],
      undefined,
    ]);
    const module = await Test.createTestingModule({
      providers: [ServicesService, { provide: DB, useValue: db }],
    }).compile();
    await expect(
      module.get(ServicesService).remove('svc-1', 'tenant-1'),
    ).resolves.toBeUndefined();
  });
});
