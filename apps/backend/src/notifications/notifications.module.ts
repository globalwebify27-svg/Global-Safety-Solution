import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppNotificationService } from './whatsapp-notification.service';
import { WhatsAppLogsService } from './whatsapp-logs.service';
import { WhatsAppLogsController } from './whatsapp-logs.controller';
import { WhatsAppQueueService } from './whatsapp-queue.service';
import { WebhooksController } from './webhooks.controller';
import { WhatsAppTemplatesService } from './whatsapp-templates.service';
import { WhatsAppTemplatesController } from './whatsapp-templates.controller';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController, WhatsAppLogsController, WebhooksController, WhatsAppTemplatesController],
  providers: [NotificationsService, WhatsAppNotificationService, WhatsAppLogsService, WhatsAppQueueService, WhatsAppTemplatesService],
  exports: [NotificationsService, WhatsAppNotificationService, WhatsAppLogsService, WhatsAppQueueService, WhatsAppTemplatesService],
})
export class NotificationsModule {}
