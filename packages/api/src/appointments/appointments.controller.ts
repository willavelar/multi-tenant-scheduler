import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('appointments')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Post()
  create(
    @Body() dto: CreateAppointmentDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.service.create(dto, user.id, user.role, tenantId);
  }

  @Get('limit-check')
  checkLimit(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string; role: string },
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
    @Query('clientId') clientId?: string,
  ) {
    const resolvedClientId =
      clientId && (user.role === 'tenant_admin' || user.role === 'professional')
        ? clientId
        : user.id;
    return this.service.checkLimit(resolvedClientId, serviceId, date, tenantId);
  }

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string; role: string },
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('serviceId') serviceId?: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
    @Query('professionalId') professionalId?: string,
  ) {
    return this.service.findAll(
      tenantId, user.id, user.role,
      Math.max(1, parseInt(page)),
      Math.min(500, Math.max(1, parseInt(limit))),
      { dateFrom, dateTo, serviceId, status, clientId, professionalId },
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.service.findOne(id, tenantId, user.id, user.role);
  }

  @Patch(':id/confirm')
  confirm(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.updateStatus(id, 'confirmed', tenantId);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.service.updateStatus(id, 'cancelled', tenantId, dto.reason);
  }

  @Patch(':id/complete')
  @Roles('tenant_admin', 'professional')
  complete(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.updateStatus(id, 'completed', tenantId);
  }

  @Delete(':id')
  @Roles('tenant_admin')
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.remove(id, tenantId);
  }
}
