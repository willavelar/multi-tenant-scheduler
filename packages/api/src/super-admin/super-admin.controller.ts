import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminLoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { ListTenantsQueryDto } from './dto/list-tenants-query.dto';

@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Post('auth/login')
  @HttpCode(200)
  login(@Body() dto: SuperAdminLoginDto) {
    return this.superAdminService.login(dto.email, dto.password);
  }

  @Get('tenants')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  listTenants(@Query() query: ListTenantsQueryDto) {
    return this.superAdminService.listTenants(query.page, query.limit);
  }
}
