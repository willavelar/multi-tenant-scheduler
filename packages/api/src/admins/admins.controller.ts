import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
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

  @Get(':id')
  @Roles('tenant_admin')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @Roles('tenant_admin')
  create(@Body() dto: CreateAdminDto, @TenantId() tenantId: string) {
    return this.service.create(dto, tenantId);
  }

  @Patch(':id')
  @Roles('tenant_admin')
  update(@Param('id') id: string, @Body() dto: UpdateAdminDto, @TenantId() tenantId: string) {
    return this.service.update(id, dto, tenantId);
  }
}
