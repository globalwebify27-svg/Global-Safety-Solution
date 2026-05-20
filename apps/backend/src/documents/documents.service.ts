import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: any) {
    return this.prisma.document.findMany({
      where: {
        category: filters.category,
        client_id: filters.client_id,
        project_id: filters.project_id,
      },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        uploader: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        client: true,
        project: true,
        compliance: true,
        uploader: true,
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async create(data: any, uploaderId: string) {
    return this.prisma.document.create({
      data: {
        name: data.name,
        file_url: data.file_url,
        file_type: data.file_type || 'PDF',
        file_size: Number(data.file_size) || 0,
        category: data.category || 'OTHER',
        client_id: data.client_id || null,
        project_id: data.project_id || null,
        compliance_id: data.compliance_id || null,
        expiry_date: data.expiry_date ? new Date(data.expiry_date) : null,
        test_date: data.test_date ? new Date(data.test_date) : null,
        notes: data.notes || null,
        uploaded_by: uploaderId,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.document.delete({
      where: { id },
    });
  }
}
