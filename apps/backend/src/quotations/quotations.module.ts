import { Module } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { QuotationsController } from './quotations.controller';
import { EmailManagementModule } from '../email-management/email-management.module';
import { LocalStorageService } from '../common/services/local-storage.service';

@Module({
  imports: [EmailManagementModule],
  controllers: [QuotationsController],
  providers: [QuotationsService, LocalStorageService],
})
export class QuotationsModule {}
