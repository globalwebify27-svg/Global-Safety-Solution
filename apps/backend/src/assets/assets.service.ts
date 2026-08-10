import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.asset.findMany({
      include: {
        assignee: {
          select: { id: true, name: true, designation: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        assignee: true,
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async create(data: any) {
    return this.prisma.asset.create({
      data: {
        asset_tag: data.asset_tag,
        name: data.name,
        serial_number: data.serial_number,
        model_number: data.model_number,
        purchase_date: data.purchase_date ? new Date(data.purchase_date) : null,
        purchase_value: data.purchase_value,
        status: data.status || 'AVAILABLE',
        assigned_to: data.assigned_to || null,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.asset.update({
      where: { id },
      data: {
        ...data,
        purchase_date: data.purchase_date
          ? new Date(data.purchase_date)
          : undefined,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.asset.delete({
      where: { id },
    });
  }
}
