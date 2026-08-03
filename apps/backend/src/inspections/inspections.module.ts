import { Module } from '@nestjs/common';
import { InspectionsService } from './inspections.service';
import { InspectionsController } from './inspections.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailManagementModule } from '../email-management/email-management.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { LocalStorageService } from '../common/services/local-storage.service';

@Module({
  imports: [PrismaModule, EmailManagementModule, CertificatesModule],
  controllers: [InspectionsController],
  providers: [InspectionsService, LocalStorageService],
  exports: [InspectionsService],
})
export class InspectionsModule {}
