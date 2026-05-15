import { Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Query('page')       page       = '1',
    @Query('limit')      limit      = '20',
    @Query('unreadOnly') unreadOnly = 'false',
  ) {
    return this.service.findAll(
      user.id,
      tenantId,
      Math.max(1, parseInt(page)),
      Math.min(100, Math.max(1, parseInt(limit))),
      unreadOnly === 'true',
    );
  }

  @Get('unread-count')
  async getUnreadCount(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
  ) {
    const count = await this.service.getUnreadCount(user.id, tenantId);
    return { count };
  }

  @Patch('mark-all-read')
  markAllRead(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.markAllRead(user.id, tenantId);
  }
}
