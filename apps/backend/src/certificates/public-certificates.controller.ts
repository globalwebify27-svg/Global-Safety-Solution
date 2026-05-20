import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('public/certificates')
export class PublicCertificatesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // 1. Try finding in Compliance table first (which represents standard safety certifications)
    const compliance = await this.prisma.compliance.findUnique({
      where: { id },
      include: { client: true },
    });

    if (compliance) {
      // Map it dynamically to matches standard certificate interface format
      return {
        id: compliance.id,
        certificate_number:
          compliance.reference_number ||
          `GSS-REG-${compliance.id.substring(0, 5).toUpperCase()}`,
        issue_date: compliance.issue_date || compliance.created_at,
        expiry_date: compliance.expiry_date || new Date(),
        validity_period:
          compliance.renewal_cycle_days === 365
            ? '1y'
            : compliance.renewal_cycle_days === 1095
              ? '3y'
              : '1y',
        remarks: `Verification of Safety Status: ${compliance.status}`,
        inspection: {
          client: {
            name: compliance.client?.name || 'Enterprise Client',
          },
          work_order: {
            work_order_no: `WO-${compliance.compliance_type.substring(0, 3).toUpperCase()}`,
          },
        },
      };
    }

    // 2. Fallback to Certificate table
    const cert = await this.prisma.certificate.findUnique({
      where: { id },
      include: {
        inspection: {
          include: {
            client: true,
            work_order: true,
          },
        },
      },
    });

    if (!cert) {
      throw new NotFoundException(
        'Safety certificate or compliance record not found',
      );
    }

    return cert;
  }
}
