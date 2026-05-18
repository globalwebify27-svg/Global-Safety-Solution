import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async findAll() {
    return this.prisma.inventoryItem.findMany({
      include: {
        transactions: {
          take: 5,
          orderBy: { created_at: 'desc' },
        },
      },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { created_at: 'desc' },
        },
      },
    });
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  async create(data: any) {
    return this.prisma.inventoryItem.create({
      data: {
        sku: data.sku,
        name: data.name,
        category: data.category,
        description: data.description,
        unit: data.unit || 'PCS',
        min_stock: Number(data.min_stock) || 0,
        current_stock: Number(data.current_stock) || 0,
        price_per_unit: data.price_per_unit,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.inventoryItem.update({
      where: { id },
      data: {
        ...data,
        min_stock:
          data.min_stock !== undefined ? Number(data.min_stock) : undefined,
        current_stock:
          data.current_stock !== undefined
            ? Number(data.current_stock)
            : undefined,
      },
    });
  }

  async createTransaction(data: any) {
    const { item_id, transaction_type, quantity, remarks, performed_by } = data;

    return this.prisma.$transaction(async (tx: any) => {
      // 1. Create transaction log
      const transaction = await tx.stockTransaction.create({
        data: {
          item_id,
          transaction_type,
          quantity: Number(quantity),
          remarks,
          performed_by,
        },
      });

      // 2. Update current stock in inventory item
      const adjustment =
        transaction_type === 'IN' ? Number(quantity) : -Number(quantity);

      const updatedItem = await tx.inventoryItem.update({
        where: { id: item_id },
        data: {
          current_stock: {
            increment: adjustment,
          },
        },
      });

      // 3. Check for low stock alert
      if (updatedItem.current_stock <= updatedItem.min_stock) {
        await this.notificationsService.notifyAdmins(
          'Low Stock Alert',
          `Inventory item "${updatedItem.name}" has reached a critical level (${updatedItem.current_stock} ${updatedItem.unit}).`,
          'WARNING',
          `/dashboard/inventory`,
        );
      }

      return transaction;
    });
  }
}
