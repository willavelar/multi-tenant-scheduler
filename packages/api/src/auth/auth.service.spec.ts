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
const QUERY_METHODS = [
  'select', 'from', 'where', 'innerJoin', 'leftJoin',
  'insert', 'values', 'returning', 'update', 'set', 'delete', 'limit',
];

function makeChain(thenImpl: (resolve: (v: unknown) => void) => void): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  QUERY_METHODS.forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain); });
  chain['then'] = jest.fn().mockImplementation(thenImpl);
  chain['execute'] = jest.fn().mockResolvedValue(undefined);
  return chain;
}

function makeMockDb(chain: Record<string, unknown>) {
  const db: Record<string, unknown> = {};
  QUERY_METHODS.forEach((m) => { db[m] = jest.fn().mockReturnValue(chain); });
  db['execute'] = jest.fn().mockResolvedValue(undefined);
  db['transaction'] = jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(chain));
  return db;
}

function makeSimpleDb(resolveWith: unknown) {
  const chain = makeChain((resolve) => resolve(resolveWith));
  return makeMockDb(chain);
}

describe('AuthService.validateUser', () => {
  async function buildService(db: unknown) {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: db },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    return module.get(AuthService);
  }

  it('lança UnauthorizedException quando o cliente está inativo', async () => {
    // bcrypt cost 1 para velocidade em testes unitários
    const passwordHash = await bcrypt.hash('senha123', 1);

    // Duas queries dentro do mesmo withTenant:
    // callCount === 1 → SELECT users (set_config usa tx.execute(), não .then)
    // callCount >= 2 → SELECT client_profiles
    let callCount = 0;
    const chain = makeChain((resolve) => {
      callCount++;
      if (callCount === 1) {
        return resolve([{
          id: 'user-1', email: 'a@b.com', passwordHash,
          role: 'client', tenantId: 'tenant-1', name: 'A',
          phone: null, lastLoginAt: null, createdAt: new Date(),
        }]);
      }
      return resolve([{ active: false }]);
    });
    const service = await buildService(makeMockDb(chain));

    await expect(service.validateUser('a@b.com', 'senha123', 'tenant-1'))
      .rejects.toThrow(UnauthorizedException);
  });

  it('permite login de cliente ativo', async () => {
    const passwordHash = await bcrypt.hash('senha123', 1);

    let callCount = 0;
    const user = { id: 'user-1', email: 'a@b.com', passwordHash, role: 'client', tenantId: 'tenant-1', name: 'A', phone: null, lastLoginAt: null, createdAt: new Date() };
    const chain = makeChain((resolve) => {
      callCount++;
      if (callCount === 1) return resolve([user]);
      return resolve([{ active: true }]);
    });
    const service = await buildService(makeMockDb(chain));

    const result = await service.validateUser('a@b.com', 'senha123', 'tenant-1');
    expect(result).toMatchObject({ id: 'user-1', role: 'client' });
  });

  it('lança UnauthorizedException quando usuário não existe', async () => {
    const service = await buildService(makeSimpleDb([]));

    await expect(service.validateUser('x@y.com', 'pass', 'tenant-1'))
      .rejects.toThrow(UnauthorizedException);
  });

  it('lança UnauthorizedException quando senha está errada', async () => {
    const passwordHash = await bcrypt.hash('correta', 1);
    const service = await buildService(makeSimpleDb([{
      id: 'user-1', email: 'a@b.com', passwordHash,
      role: 'client', tenantId: 'tenant-1', name: 'A',
      phone: null, lastLoginAt: null, createdAt: new Date(),
    }]));

    await expect(service.validateUser('a@b.com', 'errada', 'tenant-1'))
      .rejects.toThrow(UnauthorizedException);
  });
});
