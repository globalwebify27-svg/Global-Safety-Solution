import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingService: AccountingService,
  ) {}

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

  async postAssetPurchaseVouchers(asset: any) {
    const costAmt = Number(asset.purchase_value);
    if (!costAmt || costAmt <= 0) return;

    // Duplicate protection check
    const costVoucherNo = `AST-PUR-COST-${asset.id}`;
    const gstVoucherNo = `AST-PUR-GST-${asset.id}`;

    const existingVoucher = await this.prisma.ledgerEntry.findUnique({
      where: { voucher_no: costVoucherNo }
    });
    if (existingVoucher) {
      // Vouchers already posted for this asset, skip
      return;
    }

    // Resolve accounts dynamically
    // Fixed Assets account (code 30 or containing "Fixed Assets")
    let assetAcc = await this.prisma.account.findFirst({
      where: {
        OR: [
          { code: '30' },
          { name: { contains: 'Fixed Assets' } }
        ]
      }
    });
    if (!assetAcc) {
      assetAcc = await this.prisma.account.findFirst({
        where: { type: 'ASSET', code: { startsWith: '3' } }
      });
    }
    const assetCode = assetAcc?.code || '30';

    // Input GST / ITC account (code 2299.1 or containing "Input Tax Credit" / "ITC")
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

    // Bank / Payment account (code 1010 or containing "Bank Current Account" / "HDFC Current Account")
    let bankAcc = await this.prisma.account.findFirst({
      where: {
        OR: [
          { code: '1010' },
          { name: { contains: 'Bank Current Account' } },
          { name: { contains: 'HDFC Current Account' } }
        ]
      }
    });
    if (!bankAcc) {
      bankAcc = await this.prisma.account.findFirst({
        where: { type: 'ASSET', code: { startsWith: '10' } }
      });
    }
    const bankCode = bankAcc?.code || '1010';

    // Calculate GST (18%) and total amount
    const gstAmt = costAmt * 0.18;

    // Post Cost Voucher
    await this.accountingService.postVoucher({
      voucher_no: costVoucherNo,
      description: `Capitalized asset: ${asset.name} (Tag: ${asset.asset_tag})`,
      amount: costAmt,
      debit_code: assetCode,
      credit_code: bankCode,
      created_by: 'System'
    });

    // Post GST Voucher
    await this.accountingService.postVoucher({
      voucher_no: gstVoucherNo,
      description: `Input GST for capitalized asset: ${asset.name} (Tag: ${asset.asset_tag})`,
      amount: gstAmt,
      debit_code: gstCode,
      credit_code: bankCode,
      created_by: 'System'
    });
  }

  async create(data: any) {
    const asset = await this.prisma.asset.create({
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

    if (asset.purchase_value && Number(asset.purchase_value) > 0) {
      await this.postAssetPurchaseVouchers(asset);
    }

    return asset;
  }

  async update(id: string, data: any) {
    const asset = await this.prisma.asset.update({
      where: { id },
      data: {
        ...data,
        purchase_date: data.purchase_date
          ? new Date(data.purchase_date)
          : undefined,
      },
    });

    if (asset.purchase_value && Number(asset.purchase_value) > 0) {
      await this.postAssetPurchaseVouchers(asset);
    }

    return asset;
  }

  async delete(id: string) {
    return this.prisma.asset.delete({
      where: { id },
    });
  }
}
