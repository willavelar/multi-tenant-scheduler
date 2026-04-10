import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('appointments')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Post()
  create(
    @Body() dto: CreateAppointmentDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.service.create(dto, user.id, tenantId);
  }

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.service.findAll(tenantId, user.id, user.role);
  }

  @Patch(':id/confirm')
  confirm(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.updateStatus(id, 'confirmed', tenantId);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.updateStatus(id, 'cancelled', tenantId);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.updateStatus(id, 'completed', tenantId);
  }
}
