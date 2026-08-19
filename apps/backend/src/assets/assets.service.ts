import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
        credit_account: {
          select: { id: true, name: true, code: true, type: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        assignee: true,
        credit_account: true,
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async syncAssetOpeningBalanceWithAccounting(user?: string) {
    // Resolve Fixed Assets Account (Code 30 or containing "Fixed Assets")
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
    if (!assetAcc) return;

    // Calculate sum of opening_balance across all assets
    const aggregate = await this.prisma.asset.aggregate({
      _sum: { opening_balance: true }
    });
    const totalOpBal = Number(aggregate._sum.opening_balance || 0);

    // Call existing AccountingService updateOpeningBalance for Fixed Assets Account
    await this.accountingService.updateOpeningBalance(assetAcc.id, totalOpBal, user || 'Asset Registry');
  }

  async postAssetPurchaseVouchers(asset: any, selectedCreditAccountId?: string, user?: string) {
    const costAmt = Number(asset.purchase_value);
    if (!costAmt || costAmt <= 0) return;

    const costVoucherNo = `AST-PUR-COST-${asset.id}`;
    const gstVoucherNo = `AST-PUR-GST-${asset.id}`;

    // Resolve Fixed Assets debit account (code 30 or containing "Fixed Assets")
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

    // Resolve Input GST / ITC account (code 2299.1 or containing "Input Tax Credit" / "ITC")
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

    // Resolve Credit Account
    let creditAcc: any = null;
    const targetCreditId = selectedCreditAccountId || asset.credit_account_id;
    if (targetCreditId) {
      creditAcc = await this.prisma.account.findUnique({ where: { id: targetCreditId } });
    }

    if (!creditAcc) {
      // Fallback to Bank / Payment account (code 1010 or containing "Bank Current Account" / "HDFC Current Account")
      creditAcc = await this.prisma.account.findFirst({
        where: {
          OR: [
            { code: '1010' },
            { name: { contains: 'Bank Current Account' } },
            { name: { contains: 'HDFC Current Account' } }
          ]
        }
      });
      if (!creditAcc) {
        creditAcc = await this.prisma.account.findFirst({
          where: { type: 'ASSET', code: { startsWith: '10' } }
        });
      }
    }
    const creditCode = creditAcc?.code || '1010';

    // Calculate GST (18%) and post Cost + GST vouchers
    const gstAmt = costAmt * 0.18;
    const createdBy = user || 'System';

    // Post Cost Voucher
    await this.accountingService.postVoucher({
      voucher_no: costVoucherNo,
      description: `Capitalized asset: ${asset.name} (Tag: ${asset.asset_tag})`,
      amount: costAmt,
      debit_code: assetCode,
      credit_code: creditCode,
      created_by: createdBy
    });

    // Post GST Voucher
    await this.accountingService.postVoucher({
      voucher_no: gstVoucherNo,
      description: `Input GST for capitalized asset: ${asset.name} (Tag: ${asset.asset_tag})`,
      amount: gstAmt,
      debit_code: gstCode,
      credit_code: creditCode,
      created_by: createdBy
    });
  }

  async removeAssetPurchaseVouchers(assetId: string, user?: string) {
    const costVoucherNo = `AST-PUR-COST-${assetId}`;
    const gstVoucherNo = `AST-PUR-GST-${assetId}`;
    const deletedBy = user || 'System';

    const costVoucher = await this.prisma.ledgerEntry.findUnique({ where: { voucher_no: costVoucherNo } });
    if (costVoucher) {
      await this.accountingService.deleteVoucher(costVoucher.id, deletedBy);
    }

    const gstVoucher = await this.prisma.ledgerEntry.findUnique({ where: { voucher_no: gstVoucherNo } });
    if (gstVoucher) {
      await this.accountingService.deleteVoucher(gstVoucher.id, deletedBy);
    }
  }

  async create(data: any, user?: string) {
    const asset = await this.prisma.asset.create({
      data: {
        asset_tag: data.asset_tag,
        name: data.name,
        serial_number: data.serial_number || null,
        model_number: data.model_number || null,
        purchase_date: data.purchase_date ? new Date(data.purchase_date) : null,
        purchase_value: data.purchase_value ? Number(data.purchase_value) : null,
        opening_balance: data.opening_balance ? Number(data.opening_balance) : null,
        credit_account_id: data.credit_account_id || null,
        status: data.status || 'AVAILABLE',
        assigned_to: data.assigned_to || null,
      },
      include: {
        assignee: { select: { id: true, name: true, designation: true } },
        credit_account: { select: { id: true, name: true, code: true, type: true } },
      },
    });

    // Double-Entry accounting flow for fresh purchase value
    if (asset.purchase_value && Number(asset.purchase_value) > 0) {
      await this.postAssetPurchaseVouchers(asset, data.credit_account_id, user);
    }

    // Reuse existing Account Opening Balance engine for asset opening balances
    if (asset.opening_balance && Number(asset.opening_balance) > 0) {
      await this.syncAssetOpeningBalanceWithAccounting(user);
    }

    return asset;
  }

  async update(id: string, data: any, user?: string) {
    const existingAsset = await this.prisma.asset.findUnique({ where: { id } });
    if (!existingAsset) throw new NotFoundException('Asset not found');

    const updatePayload: any = {};
    if (data.asset_tag !== undefined) updatePayload.asset_tag = data.asset_tag;
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.serial_number !== undefined) updatePayload.serial_number = data.serial_number || null;
    if (data.model_number !== undefined) updatePayload.model_number = data.model_number || null;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.assigned_to !== undefined) updatePayload.assigned_to = data.assigned_to || null;
    if (data.purchase_date !== undefined) {
      updatePayload.purchase_date = data.purchase_date ? new Date(data.purchase_date) : null;
    }
    if (data.purchase_value !== undefined) {
      updatePayload.purchase_value = data.purchase_value !== null && data.purchase_value !== '' ? Number(data.purchase_value) : null;
    }
    if (data.opening_balance !== undefined) {
      updatePayload.opening_balance = data.opening_balance !== null && data.opening_balance !== '' ? Number(data.opening_balance) : null;
    }
    if (data.credit_account_id !== undefined) {
      updatePayload.credit_account_id = data.credit_account_id || null;
    }

    const updatedAsset = await this.prisma.asset.update({
      where: { id },
      data: updatePayload,
      include: {
        assignee: { select: { id: true, name: true, designation: true } },
        credit_account: { select: { id: true, name: true, code: true, type: true } },
      },
    });

    const oldCost = Number(existingAsset.purchase_value || 0);
    const newCost = Number(updatedAsset.purchase_value || 0);
    const oldCreditId = existingAsset.credit_account_id;
    const newCreditId = updatedAsset.credit_account_id;

    // If financial purchase value or credit account changed, update purchase vouchers
    if (oldCost !== newCost || oldCreditId !== newCreditId) {
      await this.removeAssetPurchaseVouchers(id, user);
      if (newCost > 0) {
        await this.postAssetPurchaseVouchers(updatedAsset, newCreditId || undefined, user);
      }
    }

    // If opening_balance changed, update existing account opening balance engine
    const oldOpBal = Number(existingAsset.opening_balance || 0);
    const newOpBal = Number(updatedAsset.opening_balance || 0);
    if (oldOpBal !== newOpBal) {
      await this.syncAssetOpeningBalanceWithAccounting(user);
    }

    return updatedAsset;
  }

  async delete(id: string, user?: string) {
    const existingAsset = await this.prisma.asset.findUnique({ where: { id } });
    if (!existingAsset) throw new NotFoundException('Asset not found');

    const hasOpBal = Number(existingAsset.opening_balance || 0) > 0;

    // Reverse any linked purchase accounting entries cleanly before removing asset
    await this.removeAssetPurchaseVouchers(id, user);

    const result = await this.prisma.asset.delete({
      where: { id },
    });

    // Recalculate opening balance with existing account opening balance engine if asset had op bal
    if (hasOpBal) {
      await this.syncAssetOpeningBalanceWithAccounting(user);
    }

    return result;
  }
}
