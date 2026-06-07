import { BadRequestException, Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common'
import { SuperAdminGuard } from '../../common/guards/super-admin.guard'
import { isIntegrationKey } from '../../common/integrations/integration-defs'
import { IntegrationsService } from './integrations.service'
import { UpsertIntegrationDto } from './dto/upsert-integration.dto'

@Controller('super-admin/integrations')
@UseGuards(SuperAdminGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  findAll() {
    return this.integrationsService.findAll()
  }

  @Put(':key')
  upsert(@Param('key') key: string, @Body() dto: UpsertIntegrationDto) {
    if (!isIntegrationKey(key)) {
      throw new BadRequestException(`Invalid integration: ${key}`)
    }
    return this.integrationsService.upsert(key, dto)
  }
}
