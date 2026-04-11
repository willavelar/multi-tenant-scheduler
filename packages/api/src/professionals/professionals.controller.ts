import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('professionals')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ProfessionalsController {
  constructor(private readonly service: ProfessionalsService) {}

  /** Admin sees the full list. Professionals access their own via /me. */
  @Get()
  @Roles('tenant_admin')
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  /** Professional (or admin) gets their own profile. */
  @Get('me')
  @Roles('tenant_admin', 'professional')
  findMe(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.service.findByUserId(user.id, tenantId);
  }

  /** Admin views any professional. Professional may view their own only. */
  @Get(':id')
  @Roles('tenant_admin', 'professional')
  async findOne(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const prof = await this.service.findOne(id, tenantId);
    if (user.role !== 'tenant_admin' && prof.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    return prof;
  }

  @Post()
  @Roles('tenant_admin')
  create(@Body() dto: CreateProfessionalDto, @TenantId() tenantId: string) {
    return this.service.create(dto, tenantId);
  }

  /** Admin can update any professional; professional can update only themselves (limited fields). */
  @Patch(':id')
  @Roles('tenant_admin', 'professional')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProfessionalDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.service.update(id, dto, tenantId, user.id, user.role);
  }

  @Delete(':id')
  @Roles('tenant_admin')
  remove(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.remove(id, tenantId, user.id);
  }
}
