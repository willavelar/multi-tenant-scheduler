import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';

const makeCtx = (user?: object): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  }) as unknown as ExecutionContext;

describe('SuperAdminGuard', () => {
  const guard = new SuperAdminGuard();

  it('allows super_admin', () => {
    expect(guard.canActivate(makeCtx({ role: 'super_admin' }))).toBe(true);
  });

  it('blocks tenant_admin', () => {
    expect(() => guard.canActivate(makeCtx({ role: 'tenant_admin' }))).toThrow(ForbiddenException);
  });

  it('blocks when no user', () => {
    expect(() => guard.canActivate(makeCtx(undefined))).toThrow(ForbiddenException);
  });
});
