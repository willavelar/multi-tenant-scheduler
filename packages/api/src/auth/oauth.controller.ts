import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { OAuthService, isValidProvider } from './oauth.service'
import { OAuthExchangeDto } from './dto/oauth-exchange.dto'
import { OAuthLinkIntentDto } from './dto/oauth-link-intent.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { TenantGuard } from '../common/guards/tenant.guard'
import { TenantId } from '../common/decorators/tenant-id.decorator'

@Controller('auth/oauth')
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly authService:  AuthService,
    private readonly config:       ConfigService,
  ) {}

  private frontendBase(slug: string): string {
    const domain   = this.config.get<string>('FRONTEND_BASE_DOMAIN') ?? 'localhost:3000'
    const protocol = domain.startsWith('localhost') ? 'http' : 'https'
    return `${protocol}://${slug}.${domain}`
  }

  // ── Static routes (must come BEFORE :provider param routes) ──────────────

  @Post('exchange')
  @HttpCode(200)
  async exchange(@Body() dto: OAuthExchangeDto) {
    const { userId, tenantId } = await this.oauthService
      .consumeExchangeCode(dto.code)
      .catch(() => { throw new UnauthorizedException() })
    return this.authService.loginById(userId, tenantId)
  }

  @Get('pending')
  async getPending(@Query('code') code: string) {
    if (!code) throw new BadRequestException('code is required')
    const { provider, name, email } = await this.oauthService.readPendingSSO(code)
    return { provider, name, email }
  }

  @Get('linked')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async listLinked(@Req() req: Request & { user: { id: string } }, @TenantId() tenantId: string) {
    return this.oauthService.listLinkedProviders(req.user.id, tenantId)
  }

  @Post('link/intent')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, TenantGuard)
  async linkIntent(
    @Body() dto: OAuthLinkIntentDto,
    @Req() req: Request & { user: { id: string } },
    @TenantId() tenantId: string,
  ) {
    if (!isValidProvider(dto.provider)) throw new BadRequestException('Invalid provider')
    const slug    = req.headers['x-tenant-slug'] as string
    const stateId = await this.oauthService.generateState(slug, 'link', {
      returnTo: dto.returnTo ?? '/me',
      userId:   req.user.id,
    })
    const authUrl = await this.oauthService.getAuthorizationUrl(dto.provider, stateId)
    return { authUrl }
  }

  @Delete(':provider')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, TenantGuard)
  async unlink(
    @Param('provider') provider: string,
    @Req() req: Request & { user: { id: string } },
    @TenantId() tenantId: string,
  ) {
    if (!isValidProvider(provider)) throw new BadRequestException('Invalid provider')
    await this.oauthService.unlinkProvider(req.user.id, tenantId, provider)
  }

  // ── OAuth redirect routes ─────────────────────────────────────────────────

  @Get(':provider')
  async initiate(
    @Param('provider') provider: string,
    @Query('slug')     slug:     string,
    @Query('returnTo') returnTo: string,
    @Res() res: Response,
  ) {
    if (!isValidProvider(provider)) throw new BadRequestException('Invalid provider')
    if (!slug) throw new BadRequestException('slug is required')

    const stateId = await this.oauthService.generateState(slug, 'login', { returnTo })
    let authUrl: string
    try {
      authUrl = await this.oauthService.getAuthorizationUrl(provider, stateId)
    } catch {
      const domain = this.config.get<string>('FRONTEND_BASE_DOMAIN') ?? 'localhost:3000'
      const protocol = domain.startsWith('localhost') ? 'http' : 'https'
      return res.redirect(`${protocol}://${slug}.${domain}/login?reason=oauth_error`)
    }
    return res.redirect(authUrl)
  }

  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code')  code:    string,
    @Query('state') stateId: string,
    @Query('error') error:   string,
    @Res() res: Response,
  ) {
    if (!isValidProvider(provider)) return res.redirect('/login?reason=oauth_error')

    // Consume state first to prevent replay
    let stateData: Awaited<ReturnType<OAuthService['consumeState']>>
    try {
      stateData = await this.oauthService.consumeState(stateId)
    } catch {
      return res.redirect('/login?reason=oauth_error')
    }

    const { slug, mode, returnTo, userId } = stateData
    const base = this.frontendBase(slug)

    if (error || !code) return res.redirect(`${base}/login?reason=oauth_error`)

    let profile: Awaited<ReturnType<OAuthService['exchangeCodeForProfile']>>
    try {
      profile = await this.oauthService.exchangeCodeForProfile(provider, code)
    } catch {
      return res.redirect(`${base}/login?reason=oauth_error`)
    }

    if (!profile.emailVerified) {
      return res.redirect(`${base}/login?reason=oauth_unverified`)
    }

    // Link mode (from profile page)
    if (mode === 'link') {
      let tenantId: string
      try {
        tenantId = await this.oauthService.resolveTenantId(slug)
      } catch {
        return res.redirect(`${base}${returnTo}?error=link_failed`)
      }
      try {
        await this.oauthService.linkProvider(userId!, tenantId, profile)
        return res.redirect(`${base}${returnTo}?linked=${provider}`)
      } catch (e: unknown) {
        const reason = (e as Error)?.message === 'already_linked_to_another_user' ? 'already_linked' : 'link_failed'
        return res.redirect(`${base}${returnTo}?error=${reason}`)
      }
    }

    // Login mode
    let tenantId: string
    try {
      tenantId = await this.oauthService.resolveTenantId(slug)
    } catch {
      return res.redirect(`${base}/login?reason=oauth_error`)
    }

    const user = await this.oauthService.findOrLinkUser(tenantId, profile)

    if (!user) {
      const pendingId = await this.oauthService.savePendingSSO({
        provider:       profile.provider,
        providerUserId: profile.providerUserId,
        providerEmail:  profile.providerEmail,
        name:           profile.name,
        email:          profile.email!,
      })
      return res.redirect(`${base}/register?sso_code=${pendingId}`)
    }

    const exchangeCode = await this.oauthService.generateExchangeCode(user.id, tenantId)
    return res.redirect(
      `${base}/auth/oauth?code=${exchangeCode}&returnTo=${encodeURIComponent(returnTo ?? '/appointments')}`,
    )
  }
}
