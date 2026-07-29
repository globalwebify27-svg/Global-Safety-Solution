import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LocalStorageService } from '../common/services/local-storage.service';
import { ExpiryCronService } from './expiry-cron.service';

@Module({
  imports: [PrismaModule],
  providers: [DocumentsService, LocalStorageService, ExpiryCronService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
