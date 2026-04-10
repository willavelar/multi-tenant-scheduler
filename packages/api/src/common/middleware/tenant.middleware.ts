import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
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

    const tenantId = await this.tenantsService.resolveTenantId(slug);
    if (!tenantId) throw new BadRequestException(`Tenant '${slug}' not found`);

    req.tenantId = tenantId;
    next();
  }
}
