import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SuperAdminJwtPayload } from '../guards/super-admin.guard';

export const CurrentSuperAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SuperAdminJwtPayload => {
    const req = ctx.switchToHttp().getRequest();
    return req.superAdmin;
  },
);
