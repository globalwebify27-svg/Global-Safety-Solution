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
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
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
    @Query('category') category?: string,
    @Query('client_id') client_id?: string,
    @Query('project_id') project_id?: string,
    @Query('lead_id') lead_id?: string,
  ) {
    return this.documentsService.findAll({ category, client_id, project_id, lead_id });
  }

  @Get(':id')
  @Permissions('READ_DOCUMENT')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Post()
  @Permissions('CREATE_DOCUMENT')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req: any, file: any, cb: any) => {
          const category = req.body.category || 'OTHER';
          const uploadPath = join(process.cwd(), 'public', category);
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req: any, file: any, cb: any) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  create(@UploadedFile() file: any, @Body() data: any, @Req() req: any) {
    console.log('CREATE DOCUMENT BODY:', data);
    const fileUrl = file
      ? `http://127.0.0.1:3001/public/${data.category || 'OTHER'}/${file.filename}`
      : data.file_url;
    return this.documentsService.create(
      {
        ...data,
        file_url: fileUrl,
        file_size: file?.size || data.file_size,
      },
      req.user.id,
    );
  }

  @Delete(':id')
  @Permissions('DELETE_DOCUMENT')
  delete(@Param('id') id: string) {
    return this.documentsService.delete(id);
  }
}
