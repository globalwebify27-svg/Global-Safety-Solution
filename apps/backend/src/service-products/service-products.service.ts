import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateServiceProductDto,
  UpdateServiceProductDto,
} from './dto/create-service-product.dto';

@Injectable()
export class ServiceProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createServiceProductDto: CreateServiceProductDto) {
    const { checklist, ...productData } = createServiceProductDto;

    return this.prisma.serviceProduct.create({
      data: {
        ...productData,
        checklist: {
          create: checklist || [],
        },
      },
      include: {
        checklist: true,
      },
    });
  }

  async findAll() {
    return this.prisma.serviceProduct.findMany({
      include: {
        checklist: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.serviceProduct.findUnique({
      where: { id },
      include: {
        checklist: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Service Product with ID ${id} not found`);
    }

    return product;
  }

  async update(id: string, updateServiceProductDto: UpdateServiceProductDto) {
    const { checklist, ...productData } = updateServiceProductDto;

    // For simplicity, we'll update the product and replace the checklist if provided
    // In a production app, you might want to update/delete specific items
    return this.prisma.$transaction(async (tx) => {
      if (checklist) {
        await tx.checklistItem.deleteMany({
          where: { service_id: id },
        });
      }

      return tx.serviceProduct.update({
        where: { id },
        data: {
          ...productData,
          checklist: checklist
            ? {
                create: checklist,
              }
            : undefined,
        },
        include: {
          checklist: true,
        },
      });
    });
  }

  async remove(id: string) {
    return this.prisma.serviceProduct.delete({
      where: { id },
    });
  }
}
