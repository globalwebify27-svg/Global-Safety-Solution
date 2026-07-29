import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  InternalServerErrorException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { LocalStorageService } from '../common/services/local-storage.service';
import { ExpiryCronService } from './expiry-cron.service';

@Controller('documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly localStorageService: LocalStorageService,
    private readonly expiryCronService: ExpiryCronService,
  ) {}

  @Get()
  @Permissions('READ_DOCUMENT')
  findAll(
    @Req() req: any,
    @Query('category') category?: string,
    @Query('client_id') client_id?: string,
    @Query('project_id') project_id?: string,
    @Query('lead_id') lead_id?: string,
  ) {
    return this.documentsService.findAll(
      { category, client_id, project_id, lead_id },
      req.user,
    );
  }

  @Get('hierarchy')
  @Permissions('READ_DOCUMENT')
  getVaultHierarchy(@Req() req: any) {
    return this.documentsService.getVaultHierarchy(req.user);
  }

  @Get('due/stats')
  @Permissions('READ_DOCUMENT')
  getDueStats() {
    return this.expiryCronService.getDueStats();
  }

  @Get('due')
  @Permissions('READ_DOCUMENT')
  getDueCertificates() {
    return this.expiryCronService.getDueCertificates();
  }

  @Get(':id')
  @Permissions('READ_DOCUMENT')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Post()
  @Permissions('CREATE_DOCUMENT')
  @UseInterceptors(FileInterceptor('file'))
  async create(@UploadedFile() file: any, @Body() data: any, @Req() req: any) {
    try {
      console.log('--- UPLOAD START ---');
      console.log('Body data:', data);
      console.log('File received:', file ? {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        hasBuffer: !!file.buffer
      } : 'No file received');

      let fileUrl = data.file_url;
      if (file && file.buffer) {
        const safeOriginalName = file.originalname || 'document.pdf';
        fileUrl = await this.localStorageService.saveFile(file.buffer, safeOriginalName);
        console.log('File successfully saved to local storage URL:', fileUrl);
      } else {
        console.warn('Warning: No file buffer found to save');
      }

      const uploaderId = req.user?.userId || req.user?.id || req.user?.sub || null;
      const result = await this.documentsService.create(
        {
          ...data,
          file_url: fileUrl || data.file_url || '#',
          file_size: file?.size || Number(data.file_size) || 0,
        },
        uploaderId,
      );
      console.log('Document successfully saved in database. ID:', result.id);
      console.log('--- UPLOAD SUCCESS ---');
      return result;
    } catch (error: any) {
      console.error('--- UPLOAD FAILED ---');
      console.error('Error details:', error);
      throw new InternalServerErrorException(error?.message || 'Document creation failed');
    }
  }

  @Delete(':id')
  @Permissions('DELETE_DOCUMENT')
  delete(@Param('id') id: string) {
    return this.documentsService.delete(id);
  }
}
