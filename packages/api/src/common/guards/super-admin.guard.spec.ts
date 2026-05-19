import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { SuperAdminGuard } from './super-admin.guard';

function mockContext(authHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization: authHeader } }),
    }),
  } as unknown as ExecutionContext;
}

async function buildGuard(verifyImpl: () => unknown) {
  const module = await Test.createTestingModule({
    providers: [
      SuperAdminGuard,
      { provide: JwtService, useValue: { verify: jest.fn().mockImplementation(verifyImpl) } },
    ],
  }).compile();
  return module.get(SuperAdminGuard);
}

describe('SuperAdminGuard', () => {
  it('passes with valid super_admin token', async () => {
    const guard = await buildGuard(() => ({ sub: 'sa-1', type: 'super_admin' }));
    expect(guard.canActivate(mockContext('Bearer valid-token'))).toBe(true);
  });

  it('rejects when Authorization header is missing', async () => {
    const guard = await buildGuard(() => ({}));
    expect(() => guard.canActivate(mockContext())).toThrow(UnauthorizedException);
  });

  it('rejects a tenant JWT (no type claim)', async () => {
    const guard = await buildGuard(() => ({ sub: 'u-1', role: 'tenant_admin', tenantId: 't-1' }));
    expect(() => guard.canActivate(mockContext('Bearer tenant-token'))).toThrow(UnauthorizedException);
  });

  it('rejects an expired token', async () => {
    const guard = await buildGuard(() => { throw new Error('jwt expired'); });
    expect(() => guard.canActivate(mockContext('Bearer expired-token'))).toThrow(UnauthorizedException);
  });
});
