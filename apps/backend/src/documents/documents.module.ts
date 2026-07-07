import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LocalStorageService } from '../common/services/local-storage.service';

@Module({
  imports: [PrismaModule],
  providers: [DocumentsService, LocalStorageService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
