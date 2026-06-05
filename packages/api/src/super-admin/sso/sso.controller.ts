import { BadRequestException, Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common'
import { SuperAdminGuard } from '../../common/guards/super-admin.guard'
import { SsoService, SsoProviderName, PROVIDERS } from './sso.service'
import { UpsertSsoDto } from './dto/upsert-sso.dto'

@Controller('super-admin/sso')
@UseGuards(SuperAdminGuard)
export class SsoController {
  constructor(private readonly ssoService: SsoService) {}

  @Get()
  findAll() {
    return this.ssoService.findAll()
  }

  @Put(':provider')
  upsert(@Param('provider') provider: string, @Body() dto: UpsertSsoDto) {
    if (!PROVIDERS.includes(provider as SsoProviderName)) {
      throw new BadRequestException(`Invalid provider: ${provider}`)
    }
    return this.ssoService.upsert(provider as SsoProviderName, dto)
  }
}
