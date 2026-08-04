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
        const baseSal = Number(emp.base_salary);

        // Calculate PF Deduction
        let pf_deduction = 0;
        if (emp.pf_applicable) {
          if (emp.pf_contribution_type === 'PERCENTAGE') {
            pf_deduction = baseSal * (Number(emp.pf_contribution_value || 0) / 100);
          } else if (emp.pf_contribution_type === 'FIXED') {
            pf_deduction = Number(emp.pf_contribution_value || 0);
          }
        }

        // Calculate ESI Deduction
        let esi_deduction = 0;
        if (emp.esi_applicable) {
          if (emp.esi_contribution_type === 'PERCENTAGE') {
            esi_deduction = baseSal * (Number(emp.esi_contribution_value || 0) / 100);
          } else if (emp.esi_contribution_type === 'FIXED') {
            esi_deduction = Number(emp.esi_contribution_value || 0);
          }
        }

        // Fetch existing record to preserve bonus / other deductions
        const existingRecord = await this.prisma.payrollRecord.findUnique({
          where: {
            user_id_month_year: {
              user_id: emp.id,
              month,
              year,
            },
          },
        });

        const bonus = existingRecord ? Number(existingRecord.bonus) : 0;
        const otherDeductions = existingRecord ? Number(existingRecord.deductions) : 0;

        // Net Salary = Base Salary + Bonus - PF - ESI - Other Deductions
        const net_pay = baseSal + bonus - pf_deduction - esi_deduction - otherDeductions;

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
            pf_deduction,
            esi_deduction,
            net_pay,
          },
          create: {
            user_id: emp.id,
            month,
            year,
            base_salary: emp.base_salary,
            bonus: 0,
            deductions: 0,
            pf_deduction,
            esi_deduction,
            net_pay,
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
