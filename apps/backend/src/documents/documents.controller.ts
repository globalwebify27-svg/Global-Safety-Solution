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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

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
        const base64 = file.buffer.toString('base64');
        fileUrl = `data:${file.mimetype};base64,${base64}`;
        console.log('Base64 string successfully generated (Length:', fileUrl.length, ')');
      } else {
        console.warn('Warning: No file buffer found to convert to Base64');
      }

      const result = await this.documentsService.create(
        {
          ...data,
          file_url: fileUrl,
          file_size: file?.size || data.file_size,
        },
        req.user.userId,
      );
      console.log('Document successfully saved in database. ID:', result.id);
      console.log('--- UPLOAD SUCCESS ---');
      return result;
    } catch (error) {
      console.error('--- UPLOAD FAILED ---');
      console.error('Error details:', error);
      throw error;
    }
  }

  @Delete(':id')
  @Permissions('DELETE_DOCUMENT')
  delete(@Param('id') id: string) {
    return this.documentsService.delete(id);
  }
}
