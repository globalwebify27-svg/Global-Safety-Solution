import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  async getAccounts() {
    return this.prisma.account.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async createAccount(data: { name: string; code: string; type: string }) {
    const existingCode = await this.prisma.account.findUnique({ where: { code: data.code } });
    if (existingCode) throw new BadRequestException('Account code already exists');

    const existingName = await this.prisma.account.findUnique({ where: { name: data.name } });
    if (existingName) throw new BadRequestException('Account name already exists');

    return this.prisma.account.create({ data });
  }

  async postVoucher(data: {
    description: string;
    amount: number;
    debit_code: string;
    credit_code: string;
    created_by?: string;
    transaction_date?: string;
  }) {
    const amt = Number(data.amount);
    if (isNaN(amt) || amt <= 0) throw new BadRequestException('Invalid amount');

    const debitAcc = await this.prisma.account.findUnique({ where: { code: data.debit_code } });
    const creditAcc = await this.prisma.account.findUnique({ where: { code: data.credit_code } });

    if (!debitAcc) throw new BadRequestException(`Debit account with code ${data.debit_code} not found`);
    if (!creditAcc) throw new BadRequestException(`Credit account with code ${data.credit_code} not found`);

    if (debitAcc.id === creditAcc.id) {
      throw new BadRequestException('Debit and credit accounts must be different');
    }

    // Use a transaction to create the ledger entry and update account balances
    return this.prisma.$transaction(async (tx) => {
      // 1. Generate Voucher Number (e.g. JV-YYYY-XXXX)
      const year = new Date().getFullYear();
      const count = await tx.ledgerEntry.count();
      const voucherNo = `JV-${year}-${String(count + 1).padStart(4, '0')}`;

      // 2. Create the Ledger Entry
      const entry = await tx.ledgerEntry.create({
        data: {
          voucher_no: voucherNo,
          description: data.description,
          amount: amt,
          debit_account_id: debitAcc.id,
          credit_account_id: creditAcc.id,
          created_by: data.created_by || 'System',
          transaction_date: data.transaction_date ? new Date(data.transaction_date) : new Date(),
        },
      });

      // 3. Update Debit Account Balance
      // Assets and Expenses increase on Debit (+)
      // Liabilities, Equity, and Revenues decrease on Debit (-)
      const debitMultiplier = (debitAcc.type === 'ASSET' || debitAcc.type === 'EXPENSE') ? 1 : -1;
      await tx.account.update({
        where: { id: debitAcc.id },
        data: { balance: { increment: amt * debitMultiplier } },
      });

      // 4. Update Credit Account Balance
      // Assets and Expenses decrease on Credit (-)
      // Liabilities, Equity, and Revenues increase on Credit (+)
      const creditMultiplier = (creditAcc.type === 'ASSET' || creditAcc.type === 'EXPENSE') ? -1 : 1;
      await tx.account.update({
        where: { id: creditAcc.id },
        data: { balance: { increment: amt * creditMultiplier } },
      });

      return entry;
    });
  }

  async getVouchers() {
    return this.prisma.ledgerEntry.findMany({
      include: {
        debit_account: true,
        credit_account: true,
      },
      orderBy: { transaction_date: 'desc' },
    });
  }

  async getFinancialReports(filter: { period: 'monthly' | 'halfyearly' | 'yearly'; year: number; month?: number }) {
    const { period, year, month } = filter;
    let startDate: Date;
    let endDate: Date;

    if (period === 'monthly') {
      const m = month !== undefined ? month : new Date().getMonth();
      startDate = new Date(year, m, 1);
      endDate = new Date(year, m + 1, 0, 23, 59, 59);
    } else if (period === 'halfyearly') {
      const isFirstHalf = month && month < 6;
      if (isFirstHalf) {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 5, 30, 23, 59, 59);
      } else {
        startDate = new Date(year, 6, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59);
      }
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    }

    // We can calculate trial balances/balances up to the endDate
    const accounts = await this.prisma.account.findMany();
    
    // Compute P&L dynamic revenues/expenses inside date range
    const ledgerEntries = await this.prisma.ledgerEntry.findMany({
      where: {
        transaction_date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        debit_account: true,
        credit_account: true,
      },
    });

    // Compute dynamic statement balances inside range
    const statementBalances = accounts.map(acc => {
      let balance = 0;
      ledgerEntries.forEach(entry => {
        if (entry.debit_account_id === acc.id) {
          const mult = (acc.type === 'ASSET' || acc.type === 'EXPENSE') ? 1 : -1;
          balance += Number(entry.amount) * mult;
        }
        if (entry.credit_account_id === acc.id) {
          const mult = (acc.type === 'ASSET' || acc.type === 'EXPENSE') ? -1 : 1;
          balance += Number(entry.amount) * mult;
        }
      });
      return {
        ...acc,
        periodBalance: balance,
      };
    });

    const trialBalance = statementBalances.map(acc => {
      const isDebit = acc.type === 'ASSET' || acc.type === 'EXPENSE';
      const debits = isDebit ? acc.periodBalance : 0;
      const credits = !isDebit ? acc.periodBalance : 0;
      return {
        id: acc.id,
        name: acc.name,
        code: acc.code,
        type: acc.type,
        debit: debits,
        credit: credits,
      };
    });

    const profitAndLoss = {
      revenues: statementBalances.filter(a => a.type === 'REVENUE'),
      expenses: statementBalances.filter(a => a.type === 'EXPENSE'),
      totalRevenue: statementBalances.filter(a => a.type === 'REVENUE').reduce((sum, a) => sum + a.periodBalance, 0),
      totalExpense: statementBalances.filter(a => a.type === 'EXPENSE').reduce((sum, a) => sum + a.periodBalance, 0),
    };

    const balanceSheet = {
      assets: statementBalances.filter(a => a.type === 'ASSET'),
      liabilities: statementBalances.filter(a => a.type === 'LIABILITY'),
      equity: statementBalances.filter(a => a.type === 'EQUITY'),
      totalAssets: statementBalances.filter(a => a.type === 'ASSET').reduce((sum, a) => sum + a.periodBalance, 0),
      totalLiabilities: statementBalances.filter(a => a.type === 'LIABILITY').reduce((sum, a) => sum + a.periodBalance, 0),
      totalEquity: statementBalances.filter(a => a.type === 'EQUITY').reduce((sum, a) => sum + a.periodBalance, 0),
    };

    return {
      trialBalance,
      profitAndLoss: {
        ...profitAndLoss,
        netProfit: profitAndLoss.totalRevenue - profitAndLoss.totalExpense,
      },
      balanceSheet,
      period: {
        startDate,
        endDate,
      },
    };
  }

  async getAuditLog() {
    return this.prisma.auditLog.findMany({
      where: { entity_type: { in: ['ACCOUNT', 'LEDGER_ENTRY'] } },
      orderBy: { created_at: 'desc' },
    });
  }
}
