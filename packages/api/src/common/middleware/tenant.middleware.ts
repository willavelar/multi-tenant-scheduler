import { BadRequestException, ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantsService } from '../../tenants/tenants.service';

export interface TenantRequest extends Request {
  tenantId?: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantsService: TenantsService) {}

  async use(req: TenantRequest, _res: Response, next: NextFunction) {
    const slug = req.headers['x-tenant-slug'] as string | undefined;
    if (!slug) return next();

    const tenant = await this.tenantsService.resolveTenantId(slug);
    if (!tenant) throw new BadRequestException(`Tenant '${slug}' not found`);
    if (!tenant.active) throw new ForbiddenException(`Tenant '${slug}' is disabled`);

    req.tenantId = tenant.id;
    next();
  }
}
