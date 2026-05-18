import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.expense.update({
      where: { id },
      data: {
        status,
        approved_by: approverId,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.expense.delete({
      where: { id },
    });
  }
}
