import { CanActivate, ExecutionContext, Injectable, BadRequestException } from '@nestjs/common';
import { TenantRequest } from '../middleware/tenant.middleware';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();
    if (!request.tenantId) {
      throw new BadRequestException('x-tenant-slug header is required');
    }
    return true;
  }
}
