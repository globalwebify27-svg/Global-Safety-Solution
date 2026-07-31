import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientPortalPublicController } from './client-portal-public.controller';
import { ClientsService } from './clients.service';
import { EmailManagementModule } from '../email-management/email-management.module';

@Module({
  imports: [EmailManagementModule],
  controllers: [ClientPortalPublicController, ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
