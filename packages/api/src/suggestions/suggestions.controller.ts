import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SuggestionsService } from './suggestions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';

@Controller('suggestions')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SuggestionsController {
  constructor(private readonly service: SuggestionsService) {}

  @Post()
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSuggestionDto,
  ) {
    return this.service.create(tenantId, user.id, dto);
  }
}
