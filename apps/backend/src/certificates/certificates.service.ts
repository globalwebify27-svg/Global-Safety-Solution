import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCertificateDto,
  UpdateCertificateDto,
} from './dto/create-certificate.dto';

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService) {}

  async create(createCertificateDto: CreateCertificateDto) {
    const { issue_date, validity_period, ...rest } = createCertificateDto;
    const issueDate = new Date(issue_date);
    const expiryDate = new Date(issue_date);

    if (validity_period === '1y') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else if (validity_period === '3y') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 3);
    } else {
      // 1-time or other: maybe set a very distant date or same date?
      // User said "as required", so let's assume 1-time has no expiry or 1 day expiry.
      // Usually, 1-time safety checks are valid for the day.
      expiryDate.setDate(expiryDate.getDate() + 1);
    }

    return this.prisma.certificate.create({
      data: {
        ...rest,
        issue_date: issueDate,
        expiry_date: expiryDate,
        validity_period,
      },
      include: {
        inspection: {
          include: {
            client: true,
            work_order: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.certificate.findMany({
      include: {
        inspection: {
          include: {
            client: true,
            work_order: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id },
      include: {
        inspection: {
          include: {
            client: true,
            work_order: true,
            items: true,
          },
        },
      },
    });

    if (!certificate) {
      throw new NotFoundException(`Certificate with ID ${id} not found`);
    }

    return certificate;
  }

  async update(id: string, updateCertificateDto: UpdateCertificateDto) {
    return this.prisma.certificate.update({
      where: { id },
      data: updateCertificateDto,
    });
  }

  async remove(id: string) {
    return this.prisma.certificate.delete({
      where: { id },
    });
  }

  // Method for the scheduler to find expiring certificates
  async findExpiring(days: number) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    // We want certificates where expiry_date is exactly targetDate (approx)
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    return this.prisma.certificate.findMany({
      where: {
        expiry_date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'ACTIVE',
      },
      include: {
        inspection: {
          include: {
            client: true,
          },
        },
      },
    });
  }
}
