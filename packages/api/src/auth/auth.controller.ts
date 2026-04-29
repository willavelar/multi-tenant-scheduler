import { BadRequestException, Body, Controller, Get, HttpCode, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto, @TenantId() tenantId: string | undefined) {
    if (!tenantId) throw new BadRequestException('x-tenant-slug header is required');
    return this.authService.register(dto, tenantId);
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(AuthGuard('local'))
  login(@Request() req: any) {
    return this.authService.login(req.user);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) throw new BadRequestException('refreshToken is required');
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) return;
    return this.authService.logout(refreshToken);
  }

  @Get('clients')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('tenant_admin', 'professional')
  listClients(@TenantId() tenantId: string, @Query('q') q?: string) {
    return this.authService.listClients(tenantId, q);
  }
}
