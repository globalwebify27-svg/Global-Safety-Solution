import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Header,
  Headers,
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
import { EditCertificateDto } from './dto/edit-certificate.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly localStorageService: LocalStorageService,
    private readonly expiryCronService: ExpiryCronService,
  ) {}

  @Post('sync-raw-file')
  @UseInterceptors(FileInterceptor('file'))
  async syncRawFile(
    @UploadedFile() file: any,
    @Headers('x-sync-secret') syncSecret: string,
  ) {
    if (syncSecret !== 'gss_internal_sync_2026') {
      throw new InternalServerErrorException('Unauthorized sync attempt');
    }
    if (!file || !file.buffer) {
      throw new InternalServerErrorException('No file buffer provided for sync');
    }
    const fileName = file.originalname || 'synced_file.pdf';
    await this.localStorageService.saveRawFile(file.buffer, fileName);
    return { success: true, fileName };
  }

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
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  getVaultHierarchy(@Req() req: any) {
    return this.documentsService.getVaultHierarchy(req.user);
  }

  @Get('image-vault-tree')
  @Permissions('READ_DOCUMENT')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  getImageVaultTree(@Req() req: any) {
    return this.documentsService.getImageVaultTree(req.user);
  }

  @Get('due/stats')
  @Permissions('READ_DOCUMENT')
  getDueStats(@Req() req: any) {
    return this.expiryCronService.getDueStats(req.user);
  }

  @Get('due')
  @Permissions('READ_DOCUMENT')
  getDueCertificates(@Req() req: any) {
    return this.expiryCronService.getDueCertificates(req.user);
  }

  @Patch(':id/edit-certificate')
  @Permissions('UPDATE_DOCUMENT')
  editCertificate(
    @Param('id') id: string,
    @Body() dto: EditCertificateDto,
    @Req() req: any,
  ) {
    return this.documentsService.editCertificate(id, dto, req.user);
  }

  @Get(':id/audit-history')
  @Permissions('READ_DOCUMENT')
  getAuditHistory(@Param('id') id: string) {
    return this.documentsService.getAuditHistory(id);
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
    let fileUrl = data.file_url;
    try {
      console.log('--- UPLOAD START ---');

      if (file && file.buffer) {
        const safeOriginalName = file.originalname || 'document.pdf';
        fileUrl = await this.localStorageService.saveFile(file.buffer, safeOriginalName, file.mimetype);
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

      // Transactional rollback: if file was saved but DB insert failed, delete the orphan file
      if (fileUrl && fileUrl !== data.file_url && fileUrl !== '#') {
        await this.localStorageService.rollbackSavedFile(fileUrl);
      }

      // Re-throw BadRequestException as-is (validation errors from file validation)
      if (error?.status === 400) {
        throw error;
      }
      throw new InternalServerErrorException(error?.message || 'Document creation failed');
    }
  }

  @Post(':id/delivery-receipt')
  @Permissions('UPDATE_DOCUMENT')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDeliveryReceipt(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    const uploaderId = req.user?.userId || req.user?.id || req.user?.sub || null;
    return this.documentsService.uploadDeliveryReceipt(id, file, uploaderId);
  }

  @Delete(':id/delivery-receipt')
  @Permissions('UPDATE_DOCUMENT')
  deleteDeliveryReceipt(@Param('id') id: string) {
    return this.documentsService.deleteDeliveryReceipt(id);
  }

  @Post(':id/deliver-email')
  @Permissions('UPDATE_DOCUMENT')
  deliverCertificateEmail(@Param('id') id: string, @Body('email') email?: string) {
    return this.documentsService.deliverCertificateEmail(id, email);
  }

  @Post(':id/send-reminder')
  @Permissions('UPDATE_DOCUMENT')
  sendRenewalReminder(@Param('id') id: string, @Body('email') email?: string) {
    return this.documentsService.sendRenewalReminder(id, email);
  }

  @Delete(':id')
  @Permissions('DELETE_DOCUMENT')
  delete(@Param('id') id: string) {
    return this.documentsService.delete(id);
  }
}
