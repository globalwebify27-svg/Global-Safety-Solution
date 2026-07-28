import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Res,
} from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import {
  CreateCertificateDto,
  UpdateCertificateDto,
} from './dto/create-certificate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('certificates')
@UseGuards(JwtAuthGuard)
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post()
  create(@Body() createCertificateDto: CreateCertificateDto) {
    return this.certificatesService.create(createCertificateDto);
  }

  @Get()
  findAll() {
    return this.certificatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.certificatesService.findOne(id);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: any) {
    try {
      const buffer = await this.certificatesService.generatePdfForCertificate(id);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=safety-certificate-${id.substring(0, 8)}.pdf`,
        'Content-Length': buffer.length,
      });
      res.end(buffer);
    } catch (err) {
      console.error('[PDF Error] certificates/:id/pdf failed:', err?.message, err?.stack);
      res.status(500).json({ error: err?.message || 'PDF generation failed', detail: err?.stack });
    }
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCertificateDto: UpdateCertificateDto,
  ) {
    return this.certificatesService.update(id, updateCertificateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.certificatesService.remove(id);
  }
}
