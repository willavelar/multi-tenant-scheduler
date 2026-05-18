import { BadRequestException, Body, Controller, Get, HttpCode, Post, Query, Req, Request, UseGuards } from '@nestjs/common';
import { ResendInviteDto } from './dto/resend-invite.dto';
import { Request as ExpressRequest } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ValidateTokenDto } from './dto/validate-token.dto';
import { ValidateInviteTokenDto } from './dto/validate-invite-token.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService:  AuthService,
    private readonly oauthService: OAuthService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @TenantId() tenantId: string | undefined) {
    if (!tenantId) throw new BadRequestException('x-tenant-slug header is required');
    const { userId, accessToken, refreshToken } = await this.authService.register(dto, tenantId);

    if (dto.ssoCode) {
      await this.oauthService.linkPendingSSO(userId, tenantId, dto.ssoCode).catch(() => {})
    }

    return { accessToken, refreshToken };
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

  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @TenantId() tenantId: string,
    @Req() req: ExpressRequest,
  ): Promise<void> {
    const slug = req.headers['x-tenant-slug'];
    if (!tenantId || !slug) throw new BadRequestException('Tenant header required');
    await this.authService.forgotPassword(dto.email, tenantId, Array.isArray(slug) ? slug[0] : slug);
  }

  @Get('reset-password/validate')
  async validateResetToken(@Query() dto: ValidateTokenDto): Promise<{ email: string }> {
    return this.authService.validateResetToken(dto.token);
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Get('invite/validate')
  async validateInviteToken(@Query() dto: ValidateInviteTokenDto): Promise<{ email: string }> {
    return this.authService.validateInviteToken(dto.token);
  }

  @Post('activate-account')
  @HttpCode(200)
  async activateAccount(@Body() dto: ActivateAccountDto): Promise<{ message: string }> {
    await this.authService.activateAccount(dto.token, dto.newPassword);
    return { message: 'Conta ativada com sucesso' };
  }

  @Post('resend-invite')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('tenant_admin')
  async resendInvite(
    @Body() dto: ResendInviteDto,
    @TenantId() tenantId: string,
    @Req() req: ExpressRequest,
  ): Promise<{ message: string }> {
    const slugHeader = req.headers['x-tenant-slug'];
    const slug = Array.isArray(slugHeader) ? slugHeader[0] : (slugHeader ?? '');
    await this.authService.resendInvite(dto.userId, tenantId, slug);
    return { message: 'Convite enviado com sucesso' };
  }
}
