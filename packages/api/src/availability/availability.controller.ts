import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { CreateWeeklyAvailabilityDto } from './dto/create-weekly-availability.dto';
import { CreateExceptionDto } from './dto/create-exception.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('availability')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  @Get('slots')
  getSlots(
    @Query('professionalId') professionalId: string,
    @Query('date') date: string,
    @TenantId() tenantId: string,
  ) {
    return this.service.getAvailableSlots(professionalId, date, tenantId);
  }

  @Get('weekly/:professionalId')
  getWeekly(
    @Param('professionalId') professionalId: string,
    @TenantId() tenantId: string,
  ) {
    return this.service.getWeeklyAvailability(professionalId, tenantId);
  }

  @Post('weekly')
  @Roles('tenant_admin')
  createWeekly(@Body() dto: CreateWeeklyAvailabilityDto, @TenantId() tenantId: string) {
    return this.service.createWeeklyAvailability(dto, tenantId);
  }

  @Delete('weekly/:id')
  @Roles('tenant_admin')
  deleteWeekly(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.deleteWeeklyAvailability(id, tenantId);
  }

  @Get('exceptions/:professionalId')
  getExceptions(
    @Param('professionalId') professionalId: string,
    @TenantId() tenantId: string,
  ) {
    return this.service.getExceptions(professionalId, tenantId);
  }

  @Post('exceptions')
  @Roles('tenant_admin')
  createException(@Body() dto: CreateExceptionDto, @TenantId() tenantId: string) {
    return this.service.createException(dto, tenantId);
  }

  @Delete('exceptions/:id')
  @Roles('tenant_admin')
  deleteException(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.deleteException(id, tenantId);
  }
}
