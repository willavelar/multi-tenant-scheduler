import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('admins')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AdminsController {
  constructor(private readonly service: AdminsService) {}

  @Get()
  @Roles('tenant_admin')
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('active') active?: string,
  ) {
    return this.service.findAll(
      tenantId,
      Math.max(1, parseInt(page ?? '1', 10) || 1),
      Math.min(100, parseInt(limit ?? '10', 10) || 10),
      { q, active },
    );
  }
}
