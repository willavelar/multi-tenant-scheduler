// packages/api/src/auth/auth.service.spec.ts
import { Test } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { AuthService } from './auth.service';
import { DB } from '../database/database.module';
import { EmailService } from '../email/email.service';
import { REDIS } from '../redis/redis.module';

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
        { provide: REDIS, useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() } },
        { provide: EmailService, useValue: { sendPasswordReset: jest.fn() } },
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

    const user = { id: 'user-1', email: 'a@b.com', passwordHash, role: 'client', tenantId: 'tenant-1', name: 'A', phone: null, active: true, lastLoginAt: null, createdAt: new Date() };
    const service = await buildService(makeSimpleDb([user]));

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
      phone: null, active: true, lastLoginAt: null, createdAt: new Date(),
    }]));

    await expect(service.validateUser('a@b.com', 'errada', 'tenant-1'))
      .rejects.toThrow(UnauthorizedException);
  });
});

describe('AuthService.generateTokens (via login)', () => {
  async function buildService(db: unknown) {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: db },
        { provide: REDIS, useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() } },
        { provide: EmailService, useValue: { sendPasswordReset: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('signed-token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    return module.get(AuthService);
  }

  it('persists refresh token hash to DB on login', async () => {
    const user = {
      id: 'user-1', email: 'a@b.com', passwordHash: 'hash', role: 'client' as const,
      tenantId: 'tenant-1', name: 'A', phone: null, active: true,
      avatarUrl: null, timezone: 'America/Sao_Paulo', timeFormat: '24h',
      lastLoginAt: null, createdAt: new Date(),
    };
    // login() UPDATE goes through db.transaction → loginChain
    // persistRefreshToken INSERT goes through db directly → insertChain
    const loginChain = makeChain((resolve) => resolve(undefined));
    const insertChain = makeChain((resolve) => resolve([{ id: 'rt-1' }]));
    const db: Record<string, unknown> = {};
    QUERY_METHODS.forEach((m) => {
      db[m] = jest.fn().mockReturnValue(insertChain);
    });
    db['transaction'] = jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(loginChain));
    const insertSpy = db['insert'] as jest.Mock;

    const service = await buildService(db);
    const result = await service.login(user);

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(insertSpy).toHaveBeenCalled();
  });
});

describe('AuthService.refresh', () => {
  const rawRt = 'raw.refresh.token';
  const tokenHash = createHash('sha256').update(rawRt).digest('hex');

  async function buildService(db: unknown) {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: db },
        { provide: REDIS, useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() } },
        { provide: EmailService, useValue: { sendPasswordReset: jest.fn() } },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('new-token'),
            verify: jest.fn().mockReturnValue({
              sub: 'user-1', email: 'a@b.com', name: 'A',
              role: 'client', tenantId: 'tenant-1', exp: Math.floor(Date.now() / 1000) + 900,
            }),
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    return module.get(AuthService);
  }

  it('returns new token pair for valid refresh token', async () => {
    const rtRecord = { id: 'rt-old', tokenHash, revokedAt: new Date(), replacedById: null };
    const user = {
      id: 'user-1', email: 'a@b.com', passwordHash: 'hash', role: 'client' as const,
      tenantId: 'tenant-1', name: 'A', phone: null, active: true,
      avatarUrl: null, timezone: 'America/Sao_Paulo', timeFormat: '24h',
      lastLoginAt: null, createdAt: new Date(),
    };
    let queryCount = 0;
    const chain = makeChain((resolve) => {
      queryCount++;
      if (queryCount === 1) return resolve([rtRecord]);  // UPDATE refresh_tokens (atomic revoke)
      if (queryCount === 2) return resolve([user]);        // SELECT users (inside withTenant)
      return resolve([{ id: 'rt-new' }]);                 // INSERT refresh_tokens
    });
    const db = makeMockDb(chain);
    const updateSpy = db['update'] as jest.Mock;
    const service = await buildService(db);

    const result = await service.refresh(rawRt);
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(updateSpy).toHaveBeenCalled(); // old token was atomically revoked
  });

  it('throws UnauthorizedException when JWT verification fails', async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: makeSimpleDb([]) },
        { provide: REDIS, useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() } },
        { provide: EmailService, useValue: { sendPasswordReset: jest.fn() } },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn().mockImplementation(() => { throw new Error('invalid'); }),
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    const service = module.get(AuthService);

    await expect(service.refresh(rawRt)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token hash not found in DB', async () => {
    const service = await buildService(makeSimpleDb([]));
    await expect(service.refresh(rawRt)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException and revokes chain on replay', async () => {
    const existingRecord = { id: 'rt-old', revokedAt: new Date() };
    const childRecord = { id: 'rt-child', revokedAt: null, replacedById: null };
    let queryCount = 0;
    const chain = makeChain((resolve) => {
      queryCount++;
      if (queryCount === 1) return resolve([]);              // UPDATE → 0 rows (already revoked)
      if (queryCount === 2) return resolve([existingRecord]); // SELECT by hash → found, already revoked
      if (queryCount === 3) return resolve([childRecord]);   // revokeChain: SELECT child
      return resolve([]);
    });
    const db = makeMockDb(chain);
    const updateSpy = db['update'] as jest.Mock;
    const service = await buildService(db);

    await expect(service.refresh(rawRt)).rejects.toThrow(UnauthorizedException);
    expect(updateSpy).toHaveBeenCalled(); // revokeChain updated the child token
  });
});

describe('AuthService.logout', () => {
  const rawRt = 'raw.logout.token';
  const tokenHash = createHash('sha256').update(rawRt).digest('hex');

  async function buildService(db: unknown) {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: db },
        { provide: REDIS, useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() } },
        { provide: EmailService, useValue: { sendPasswordReset: jest.fn() } },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn().mockReturnValue({ sub: 'user-1', tenantId: 'tenant-1' }),
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    return module.get(AuthService);
  }

  it('marks refresh token as revoked', async () => {
    const chain = makeChain((resolve) => resolve([{ id: 'rt-1', tokenHash }]));
    const db = makeMockDb(chain);
    const updateSpy = db['update'] as jest.Mock;

    const service = await buildService(db);
    await service.logout(rawRt);

    expect(updateSpy).toHaveBeenCalled();
  });

  it('is a no-op if JWT verification fails', async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: makeSimpleDb([]) },
        { provide: REDIS, useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() } },
        { provide: EmailService, useValue: { sendPasswordReset: jest.fn() } },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn().mockImplementation(() => { throw new Error('bad'); }),
          },
        },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    const service = module.get(AuthService);

    await expect(service.logout(rawRt)).resolves.toBeUndefined();
  });
});

describe('AuthService.validateResetToken', () => {
  let service: AuthService;
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    redis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: makeSimpleDb([]) },
        { provide: REDIS, useValue: redis },
        { provide: EmailService, useValue: { sendPasswordReset: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('retorna o email quando token é válido', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ userId: 'u1', email: 'test@test.com', tenantId: 't1' }));

    const result = await service.validateResetToken('valid-token');

    expect(result).toEqual({ email: 'test@test.com' });
    expect(redis.get).toHaveBeenCalledWith('password:reset:valid-token');
  });

  it('lança BadRequestException para token inválido', async () => {
    redis.get.mockResolvedValue(null);

    await expect(service.validateResetToken('bad-token')).rejects.toThrow(BadRequestException);
  });
});

describe('AuthService.resetPassword', () => {
  let service: AuthService;
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let chain: Record<string, unknown>;

  beforeEach(async () => {
    redis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    chain = makeChain((resolve) => resolve([{ id: 'u1' }]));
    const db = makeMockDb(chain);

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: db },
        { provide: REDIS, useValue: redis },
        { provide: EmailService, useValue: { sendPasswordReset: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('atualiza a senha e deleta o token', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ userId: 'u1', email: 'test@test.com', tenantId: 't1' }));
    redis.del.mockResolvedValue(1);

    await service.resetPassword('token', 'newPassword123');

    expect(redis.del).toHaveBeenCalledWith('password:reset:token');
    expect(chain['update']).toHaveBeenCalled();
    const setCalls = (chain['set'] as jest.Mock).mock.calls;
    const hashArg = setCalls.find((args: unknown[]) => args[0] && typeof args[0] === 'object' && 'passwordHash' in (args[0] as Record<string, unknown>))?.[0] as { passwordHash: string } | undefined;
    expect(hashArg?.passwordHash).toMatch(/^\$2[ab]\$/);
  });

  it('lança BadRequestException para token inválido', async () => {
    redis.get.mockResolvedValue(null);

    await expect(service.resetPassword('bad-token', 'newPassword123')).rejects.toThrow(BadRequestException);
  });

  it('lança BadRequestException para senha menor que 6 caracteres', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ userId: 'u1', email: 'test@test.com', tenantId: 't1' }));

    await expect(service.resetPassword('token', 'abc')).rejects.toThrow(BadRequestException);
  });
});

describe('AuthService.forgotPassword', () => {
  const mockRedis = {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    del: jest.fn(),
  };
  const mockEmailService = { sendPasswordReset: jest.fn().mockResolvedValue(undefined) };

  async function buildService(db: unknown) {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: db },
        { provide: REDIS, useValue: mockRedis },
        { provide: EmailService, useValue: mockEmailService },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('scheduler.app') } },
      ],
    }).compile();
    return module.get(AuthService);
  }

  beforeEach(() => jest.clearAllMocks());

  it('resolve silenciosamente quando e-mail não existe no tenant', async () => {
    const service = await buildService(makeSimpleDb([]));
    await expect(service.forgotPassword('x@y.com', 'tenant-1', 'acme'))
      .resolves.toBeUndefined();
  });

  it('gera token Redis e envia e-mail quando usuário existe', async () => {
    const service = await buildService(makeSimpleDb([{ id: 'user-1', email: 'a@b.com' }]));
    await service.forgotPassword('a@b.com', 'tenant-1', 'acme');

    expect(mockRedis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^password:reset:/),
      expect.stringContaining('"userId":"user-1"'),
      'EX',
      86400,
    );
    expect(mockEmailService.sendPasswordReset).toHaveBeenCalledWith(
      'a@b.com',
      expect.stringContaining('/reset-password?token='),
    );
  });
});
