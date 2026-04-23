import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('tenants')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  @Get('me')
  findCurrent(@TenantId() tenantId: string) {
    return this.service.findCurrent(tenantId);
  }

  @Patch('me')
  @Roles('tenant_admin')
  update(@TenantId() tenantId: string, @Body() dto: UpdateTenantDto) {
    return this.service.update(tenantId, dto);
  }
}
