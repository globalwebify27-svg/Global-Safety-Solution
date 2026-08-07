import { Module } from '@nestjs/common';
import { EmailManagementController } from './email-management.controller';
import { EmailManagementService } from './email-management.service';
import { MailService } from './mail.service';
import { TemplateEngineService } from './template-engine.service';
import { EmailQueueService } from './email-queue.service';
import { EmailCronService } from './email-cron.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [EmailManagementController],
  providers: [
    EmailManagementService,
    MailService,
    TemplateEngineService,
    EmailQueueService,
    EmailCronService,
  ],
  exports: [
    EmailManagementService,
    MailService,
    TemplateEngineService,
    EmailQueueService,
    EmailCronService,
  ],
})
export class EmailManagementModule {}
