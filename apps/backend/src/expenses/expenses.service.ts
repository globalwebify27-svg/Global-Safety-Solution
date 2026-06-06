import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private accountingService: AccountingService,
  ) {}

  async findAll() {
    return this.prisma.expense.findMany({
      include: {
        vendor: true,
        user: { select: { name: true, email: true } },
        approver: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        vendor: true,
        user: true,
        approver: true,
        vendor_payments: true,
      },
    });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async create(data: any, userId: string) {
    return this.prisma.expense.create({
      data: {
        ...data,
        user_id: userId,
        status: 'PENDING',
      },
    });
  }

  async updateStatus(id: string, status: string, approverId: string) {
    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        status,
        approved_by: approverId,
      },
    });

    if (status === 'APPROVED') {
      try {
        await this.accountingService.postVoucher({
          description: `Auto-generated: Approved Expense - ${expense.description || 'General Office Expense'}`,
          amount: Number(expense.amount),
          debit_code: '5300', // Utilities & General Expenses
          credit_code: '1010', // Bank Current Account
          created_by: 'System',
        });
      } catch (err) {
        console.warn('[Auto-Accounting] Failed to post expense voucher:', err.message);
      }
    }

    return expense;
  }

  async remove(id: string) {
    return this.prisma.expense.delete({
      where: { id },
    });
  }
}
