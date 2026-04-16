// packages/api/src/auth/auth.service.spec.ts
import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { DB } from '../database/database.module';

// Mesmo padrão de mock usado em professionals.service.spec.ts:
// um proxy thenable que encadeia todos os métodos de query builder.
function makeChain(resolveWith: unknown): Record<string, unknown> {
  const thenable: Record<string, unknown> = {};
  const methods = ['select', 'from', 'where', 'innerJoin', 'leftJoin',
                   'insert', 'values', 'returning', 'update', 'set', 'delete', 'limit'];
  methods.forEach((m) => { thenable[m] = jest.fn().mockReturnValue(thenable); });
  thenable['then'] = jest.fn().mockImplementation((resolve: (v: unknown) => void) => resolve(resolveWith));
  thenable['execute'] = jest.fn().mockResolvedValue(undefined);
  return thenable;
}

function makeMockDb(resolveWith: unknown) {
  const chain = makeChain(resolveWith);
  const db: Record<string, unknown> = {};
  const methods = ['select', 'from', 'where', 'innerJoin', 'leftJoin',
                   'insert', 'values', 'returning', 'update', 'set', 'delete'];
  methods.forEach((m) => { db[m] = jest.fn().mockReturnValue(chain); });
  db['execute'] = jest.fn().mockResolvedValue(undefined);
  db['transaction'] = jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(chain));
  return db;
}

describe('AuthService.validateUser', () => {
  async function buildService(dbResolveWith: unknown) {
    const mockDb = makeMockDb(dbResolveWith);
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: mockDb },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    return { service: module.get(AuthService), mockDb };
  }

  it('lança UnauthorizedException quando o cliente está inativo', async () => {
    const passwordHash = await bcrypt.hash('senha123', 10);

    // Primeira chamada retorna o usuário; segunda retorna perfil inativo.
    // withTenant chama db.transaction → fn(tx); tx encadeia os métodos.
    // Para controlar múltiplas queries, fazemos o chain.then alternar as respostas.
    let callCount = 0;
    const chain: Record<string, unknown> = {};
    const methods = ['select', 'from', 'where', 'innerJoin', 'leftJoin',
                     'insert', 'values', 'returning', 'update', 'set', 'delete', 'limit'];
    methods.forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain); });
    chain['execute'] = jest.fn().mockResolvedValue(undefined);
    chain['then'] = jest.fn().mockImplementation((resolve: (v: unknown) => void) => {
      callCount++;
      if (callCount === 1) {
        // set_config (withTenant internals) — resolve com undefined
        return resolve(undefined);
      }
      if (callCount === 2) {
        // SELECT users — retorna o usuário com role client
        return resolve([{ id: 'user-1', email: 'a@b.com', passwordHash, role: 'client', tenantId: 'tenant-1', name: 'A', phone: null, lastLoginAt: null, createdAt: new Date() }]);
      }
      // SELECT client_profiles — retorna perfil inativo
      return resolve([{ active: false }]);
    });

    const db: Record<string, unknown> = {};
    methods.forEach((m) => { db[m] = jest.fn().mockReturnValue(chain); });
    db['execute'] = jest.fn().mockResolvedValue(undefined);
    db['transaction'] = jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(chain));

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: db },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();
    const service = module.get(AuthService);

    await expect(service.validateUser('a@b.com', 'senha123', 'tenant-1'))
      .rejects.toThrow(UnauthorizedException);
  });

  it('lança UnauthorizedException quando usuário não existe', async () => {
    // chain.then sempre resolve com array vazio (usuário não encontrado)
    const { service } = await buildService([]);

    await expect(service.validateUser('x@y.com', 'pass', 'tenant-1'))
      .rejects.toThrow(UnauthorizedException);
  });

  it('lança UnauthorizedException quando senha está errada', async () => {
    const passwordHash = await bcrypt.hash('correta', 10);
    const { service } = await buildService([
      { id: 'user-1', email: 'a@b.com', passwordHash, role: 'client', tenantId: 'tenant-1', name: 'A', phone: null, lastLoginAt: null, createdAt: new Date() },
    ]);

    await expect(service.validateUser('a@b.com', 'errada', 'tenant-1'))
      .rejects.toThrow(UnauthorizedException);
  });
});
