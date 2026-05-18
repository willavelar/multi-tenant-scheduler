import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('clients')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Get()
  @Roles('tenant_admin', 'professional')
  findAll(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string; role: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('active') active?: string,
    @Query('myClients') myClients?: string,
  ) {
    return this.service.findAll(
      tenantId,
      Math.max(1, parseInt(page ?? '1', 10) || 1),
      Math.min(100, parseInt(limit ?? '10', 10) || 10),
      {
        q,
        active,
        professionalUserId: myClients === 'true' && user.role === 'professional' ? user.id : undefined,
      },
    );
  }

  @Get('search')
  @Roles('tenant_admin', 'professional')
  search(
    @TenantId() tenantId: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.search(tenantId, q, parseInt(limit ?? '20', 10) || 20);
  }

  @Get(':id')
  @Roles('tenant_admin', 'professional')
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.service.findOne(id, tenantId);
  }

  @Post()
  @Roles('tenant_admin', 'professional')
  create(@Body() dto: CreateClientDto, @TenantId() tenantId: string, @Req() req: ExpressRequest) {
    const slugHeader = req.headers['x-tenant-slug'];
    const slug = Array.isArray(slugHeader) ? slugHeader[0] : (slugHeader ?? '');
    return this.service.create(dto, tenantId, slug);
  }

  @Patch(':id')
  @Roles('tenant_admin')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto, @TenantId() tenantId: string) {
    return this.service.update(id, dto, tenantId);
  }

  @Delete(':id')
  @Roles('tenant_admin')
  remove(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Query('cancelFuture') cancelFuture?: string,
  ) {
    return this.service.remove(id, tenantId, cancelFuture === 'true');
  }
}
