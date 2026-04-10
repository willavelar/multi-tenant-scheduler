import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('services')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.findOne(id, tenantId);
  }

  @Post()
  @Roles('tenant_admin')
  create(@Body() dto: CreateServiceDto, @TenantId() tenantId: string) {
    return this.service.create(dto, tenantId);
  }

  @Patch(':id')
  @Roles('tenant_admin')
  update(@Param('id') id: string, @Body() dto: UpdateServiceDto, @TenantId() tenantId: string) {
    return this.service.update(id, dto, tenantId);
  }

  @Delete(':id')
  @Roles('tenant_admin')
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.remove(id, tenantId);
  }
}
