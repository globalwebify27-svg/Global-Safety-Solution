import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HRService {
  constructor(private prisma: PrismaService) {}

  async getEmployeeFinancialProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        salary_history: {
          orderBy: { effective_date: 'desc' },
        },
        payroll_records: {
          orderBy: { year: 'desc' },
          take: 12,
        },
      },
    });

    if (!user) throw new NotFoundException('Employee not found');
    return user;
  }

  async updateSalaryAndDesignation(
    userId: string,
    data: {
      amount: number;
      designation: string;
      effective_date: string;
      reason: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create history record
      const history = await tx.salaryHistory.create({
        data: {
          user_id: userId,
          amount: data.amount,
          designation: data.designation,
          effective_date: new Date(data.effective_date),
          reason: data.reason,
        },
      });

      // 2. Update user master record
      await tx.user.update({
        where: { id: userId },
        data: {
          base_salary: data.amount,
          designation: data.designation,
        },
      });

      return history;
    });
  }

  async generatePayrollBatch(month: number, year: number) {
    const employees = await this.prisma.user.findMany({
      where: {
        is_active: true,
        base_salary: { not: null },
      },
    });

    const results = [];
    for (const emp of employees) {
      if (!emp.base_salary) continue;

      try {
        const record = await this.prisma.payrollRecord.upsert({
          where: {
            user_id_month_year: {
              user_id: emp.id,
              month,
              year,
            },
          },
          update: {
            base_salary: emp.base_salary,
            net_pay: emp.base_salary,
          },
          create: {
            user_id: emp.id,
            month,
            year,
            base_salary: emp.base_salary,
            bonus: 0,
            deductions: 0,
            net_pay: emp.base_salary,
            status: 'PROCESSING',
          },
        });
        results.push(record);
      } catch (e) {
        console.error(`Failed to upsert payroll for ${emp.name}:`, e);
      }
    }

    return results;
  }

  async getPayrollHistory(month?: number, year?: number) {
    return this.prisma.payrollRecord.findMany({
      where: {
        ...(month && { month }),
        ...(year && { year }),
      },
      include: {
        user: {
          select: { name: true, employee_id: true, designation: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async updatePayrollStatus(id: string, status: string, paidAt?: string) {
    return this.prisma.payrollRecord.update({
      where: { id },
      data: {
        status,
        ...(paidAt && { paid_at: new Date(paidAt) }),
      },
    });
  }
}
