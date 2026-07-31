import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LocalStorageService } from '../common/services/local-storage.service';
import { ExpiryCronService } from './expiry-cron.service';
import { EmailManagementModule } from '../email-management/email-management.module';
import { CertificatesModule } from '../certificates/certificates.module';

@Module({
  imports: [PrismaModule, EmailManagementModule, CertificatesModule],
  providers: [DocumentsService, LocalStorageService, ExpiryCronService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
