import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import {
  CreateCertificateTemplateDto,
  UpdateCertificateTemplateDto,
} from './dto/create-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('certificate-templates')
@UseGuards(JwtAuthGuard)
export class CertificateTemplatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post()
  create(@Body() dto: CreateCertificateTemplateDto) {
    return this.certificatesService.createTemplate(dto);
  }

  @Get()
  findAll() {
    return this.certificatesService.findAllTemplates();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.certificatesService.findOneTemplate(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCertificateTemplateDto,
  ) {
    return this.certificatesService.updateTemplate(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.certificatesService.removeTemplate(id);
  }
}
