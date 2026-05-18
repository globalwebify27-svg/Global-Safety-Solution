import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
} from './dto/create-work-order.dto';

@Injectable()
export class WorkOrdersService {
  constructor(private prisma: PrismaService) {}

  async create(createWorkOrderDto: CreateWorkOrderDto) {
    return this.prisma.workOrder.create({
      data: {
        ...createWorkOrderDto,
      },
      include: {
        project: true,
        service_product: true,
      },
    });
  }

  async findAll(projectId?: string) {
    return this.prisma.workOrder.findMany({
      where: projectId ? { project_id: projectId } : {},
      include: {
        project: true,
        service_product: true,
        inspections: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        project: true,
        service_product: {
          include: {
            checklist: true,
          },
        },
        inspections: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!workOrder) {
      throw new NotFoundException(`Work Order with ID ${id} not found`);
    }

    return workOrder;
  }

  async update(id: string, updateWorkOrderDto: UpdateWorkOrderDto) {
    return this.prisma.workOrder.update({
      where: { id },
      data: updateWorkOrderDto,
      include: {
        project: true,
        service_product: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.workOrder.delete({
      where: { id },
    });
  }
}
