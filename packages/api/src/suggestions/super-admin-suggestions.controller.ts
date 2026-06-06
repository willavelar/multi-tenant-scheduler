import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { SuggestionsService } from './suggestions.service';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { ListSuggestionsQueryDto } from './dto/list-suggestions-query.dto';
import { UpdateSuggestionStatusDto } from './dto/update-suggestion-status.dto';

@Controller('super-admin/suggestions')
@UseGuards(SuperAdminGuard)
export class SuperAdminSuggestionsController {
  constructor(private readonly service: SuggestionsService) {}

  @Get()
  list(@Query() query: ListSuggestionsQueryDto) {
    return this.service.list(query.page ?? 1, query.limit ?? 20, query.status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateSuggestionStatusDto) {
    return this.service.updateStatus(id, dto.status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
