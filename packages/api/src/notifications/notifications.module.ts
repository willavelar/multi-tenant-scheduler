import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../database/database.module';
import { EmailQueueModule } from '../email-queue/email-queue.module';
import { IntegrationConfigModule } from '../common/integrations/integration-config.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TwilioService } from './twilio.service';
import { NOTIFICATION_COORDINATOR_QUEUE, NotificationCoordinatorProducer } from './queues/notification-coordinator.producer';
import { NotificationCoordinatorProcessor } from './queues/notification-coordinator.processor';
import { SYSTEM_NOTIFICATION_QUEUE, SystemNotificationProducer } from './queues/system-notification.producer';
import { SystemNotificationProcessor } from './queues/system-notification.processor';
import { WHATSAPP_QUEUE, WhatsAppProducer } from './queues/whatsapp.producer';
import { WhatsAppProcessor } from './queues/whatsapp.processor';
import { NOTIFICATION_CLEANUP_QUEUE, NotificationCleanupProducer } from './cleanup/notification-cleanup.producer';
import { NotificationCleanupProcessor } from './cleanup/notification-cleanup.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: NOTIFICATION_COORDINATOR_QUEUE },
      { name: SYSTEM_NOTIFICATION_QUEUE },
      { name: WHATSAPP_QUEUE },
      { name: NOTIFICATION_CLEANUP_QUEUE },
    ),
    DatabaseModule,
    EmailQueueModule,
    IntegrationConfigModule,
  ],
  providers: [
    NotificationsService,
    TwilioService,
    NotificationCoordinatorProducer,
    NotificationCoordinatorProcessor,
    SystemNotificationProducer,
    SystemNotificationProcessor,
    WhatsAppProducer,
    WhatsAppProcessor,
    NotificationCleanupProducer,
    NotificationCleanupProcessor,
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
