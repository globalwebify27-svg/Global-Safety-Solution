import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private notificationsService: NotificationsService,
    private readonly accountingService: AccountingService,
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

  async postInventoryPurchaseVouchers(itemId: string, qty: number, unitPrice: number, isInitial: boolean, transactionId?: string) {
    const costAmt = Number(qty) * Number(unitPrice);
    if (!costAmt || costAmt <= 0) return;

    // Unique voucher references for duplicate protection
    const costVoucherNo = isInitial ? `INV-INIT-COST-${itemId}` : `INV-TX-COST-${transactionId}`;
    const gstVoucherNo = isInitial ? `INV-INIT-GST-${itemId}` : `INV-TX-GST-${transactionId}`;

    const existingVoucher = await this.prisma.ledgerEntry.findUnique({
      where: { voucher_no: costVoucherNo }
    });
    if (existingVoucher) {
      // Vouchers already posted, skip to prevent duplicates
      return;
    }

    // Resolve accounts dynamically from Chart of Accounts
    // 1. Inventory Asset account (code 1400 or containing "Inventory Asset")
    let assetAcc = await this.prisma.account.findFirst({
      where: {
        OR: [
          { code: '1400' },
          { name: { contains: 'Inventory Asset' } }
        ]
      }
    });
    if (!assetAcc) {
      assetAcc = await this.prisma.account.findFirst({
        where: { type: 'ASSET', code: { startsWith: '14' } }
      });
    }
    const assetCode = assetAcc?.code || '1400';

    // 2. Input GST / ITC account (code 2299.1 or containing "Input Tax Credit" / "ITC")
    let gstAcc = await this.prisma.account.findFirst({
      where: {
        OR: [
          { code: '2299.1' },
          { name: { contains: 'Input Tax Credit' } },
          { name: { contains: 'ITC' } }
        ]
      }
    });
    if (!gstAcc) {
      gstAcc = await this.prisma.account.findFirst({
        where: { code: '2200' }
      });
    }
    const gstCode = gstAcc?.code || '2299.1';

    // 3. Bank / Payment account (code 1010 or containing "Bank Current Account")
    let bankAcc = await this.prisma.account.findFirst({
      where: {
        OR: [
          { code: '1010' },
          { name: { contains: 'Bank Current Account' } }
        ]
      }
    });
    if (!bankAcc) {
      bankAcc = await this.prisma.account.findFirst({
        where: { type: 'ASSET', code: { startsWith: '10' } }
      });
    }
    const bankCode = bankAcc?.code || '1010';

    // Get item details for description
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    const itemName = item?.name || 'Inventory Item';

    // Calculate GST (18%)
    const gstAmt = costAmt * 0.18;

    // Post Inventory Cost Voucher
    await this.accountingService.postVoucher({
      voucher_no: costVoucherNo,
      description: isInitial
        ? `Initial capitalization of inventory item: ${itemName} (Qty: ${qty})`
        : `Inventory replenishment: ${itemName} (Qty: ${qty})`,
      amount: costAmt,
      debit_code: assetCode,
      credit_code: bankCode,
      created_by: 'System'
    });

    // Post Input GST Voucher
    await this.accountingService.postVoucher({
      voucher_no: gstVoucherNo,
      description: isInitial
        ? `Input GST for initial capitalization of inventory item: ${itemName}`
        : `Input GST for inventory replenishment: ${itemName}`,
      amount: gstAmt,
      debit_code: gstCode,
      credit_code: bankCode,
      created_by: 'System'
    });
  }

  async postInventoryIssueVouchers(itemId: string, qty: number, unitPrice: number, transactionId: string) {
    const costAmt = Number(qty) * Number(unitPrice);
    if (!costAmt || costAmt <= 0) return;

    // Unique voucher references for duplicate protection
    const costVoucherNo = `INV-TX-COST-${transactionId}`;

    const existingVoucher = await this.prisma.ledgerEntry.findUnique({
      where: { voucher_no: costVoucherNo }
    });
    if (existingVoucher) {
      // Vouchers already posted, skip to prevent duplicates
      return;
    }

    // Resolve accounts dynamically from Chart of Accounts
    // 1. Cost of Goods Sold / COGS (code 5000 or containing "Cost of Goods Sold")
    let cogsAcc = await this.prisma.account.findFirst({
      where: {
        OR: [
          { code: '5000' },
          { name: { contains: 'Cost of Goods Sold' } },
          { name: { contains: 'COGS' } }
        ]
      }
    });
    if (!cogsAcc) {
      cogsAcc = await this.prisma.account.findFirst({
        where: { type: 'EXPENSE', code: { startsWith: '5' } }
      });
    }
    const cogsCode = cogsAcc?.code || '5000';

    // 2. Inventory Asset account (code 1400 or containing "Inventory Asset")
    let assetAcc = await this.prisma.account.findFirst({
      where: {
        OR: [
          { code: '1400' },
          { name: { contains: 'Inventory Asset' } }
        ]
      }
    });
    if (!assetAcc) {
      assetAcc = await this.prisma.account.findFirst({
        where: { type: 'ASSET', code: { startsWith: '14' } }
      });
    }
    const assetCode = assetAcc?.code || '1400';

    // Get item details for description
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    const itemName = item?.name || 'Inventory Item';

    // Post Issue Cost Voucher
    await this.accountingService.postVoucher({
      voucher_no: costVoucherNo,
      description: `Inventory stock issue/consumption: ${itemName} (Qty: ${qty})`,
      amount: costAmt,
      debit_code: cogsCode,
      credit_code: assetCode,
      created_by: 'System'
    });
  }

  async create(data: any) {
    const item = await this.prisma.inventoryItem.create({
      data: {
        sku: data.sku,
        name: data.name,
        category: data.category,
        description: data.description,
        unit: data.unit || 'PCS',
        min_stock: Number(data.min_stock) || 0,
        current_stock: Number(data.current_stock) || 0,
        price_per_unit: data.price_per_unit,
        status: data.status || 'AVAILABLE',
        calibration_cert_url: data.calibration_cert_url || null,
        invoice_url: data.invoice_url || null,
        serial_number: data.serial_number || null,
        make: data.make || null,
      },
    });

    if (item.current_stock > 0 && item.price_per_unit && Number(item.price_per_unit) > 0) {
      await this.postInventoryPurchaseVouchers(item.id, item.current_stock, Number(item.price_per_unit), true);
    }

    return item;
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
    }).then(async (transaction: any) => {
      // Post vouchers outside transaction to prevent nested transactions / lockups
      const item = await this.prisma.inventoryItem.findUnique({ where: { id: item_id } });
      if (item && item.price_per_unit && Number(item.price_per_unit) > 0) {
        if (transaction_type === 'IN') {
          await this.postInventoryPurchaseVouchers(item.id, Number(quantity), Number(item.price_per_unit), false, transaction.id);
        } else if (transaction_type === 'OUT') {
          await this.postInventoryIssueVouchers(item.id, Number(quantity), Number(item.price_per_unit), transaction.id);
        }
      }
      return transaction;
    });
  }
}
