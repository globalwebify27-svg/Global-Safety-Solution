import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppNotificationService } from './whatsapp-notification.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, WhatsAppNotificationService],
  exports: [NotificationsService, WhatsAppNotificationService],
})
export class NotificationsModule {}
