import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  async getAccounts() {
    const accounts = await this.prisma.account.findMany({ orderBy: { code: "asc" } });
    const balancesMap = new Map<string, number>();
    accounts.forEach(acc => { balancesMap.set(acc.id, Number(acc.balance)); });
    const getAggregateBalance = (accId: string): number => {
      let total = balancesMap.get(accId) || 0;
      accounts.filter(a => a.parent_id === accId).forEach(child => { total += getAggregateBalance(child.id); });
      return total;
    };
    return accounts.map(acc => ({ ...acc, balance: getAggregateBalance(acc.id) }));
  }

  async createAccount(data: { name: string; code: string; type: string; parent_id?: string; opening_balance?: number; created_by?: string; }) {
    const existingCode = await this.prisma.account.findUnique({ where: { code: data.code } });
    if (existingCode) throw new BadRequestException("Account code already exists");
    const existingName = await this.prisma.account.findUnique({ where: { name: data.name } });
    if (existingName) throw new BadRequestException("Account name already exists");
    if (data.parent_id) {
      const parentAcc = await this.prisma.account.findUnique({ where: { id: data.parent_id } });
      if (!parentAcc) throw new BadRequestException("Parent account not found");
    }
    const account = await this.prisma.account.create({
      data: { name: data.name, code: data.code, type: data.type, parent_id: data.parent_id || null, balance: 0 },
    });
    await this.prisma.auditLog.create({
      data: { action: "CREATE_ACCOUNT", entity_type: "ACCOUNT", entity_id: account.id, new_data: JSON.stringify({ name: data.name, code: data.code, type: data.type, created_by: data.created_by || "System" }), user_id: data.created_by || "System" },
    }).catch(() => {});
    const openingBal = Number(data.opening_balance);
    if (openingBal && openingBal > 0) {
      let obeAcc = await this.prisma.account.findUnique({ where: { code: "3999" } });
      if (!obeAcc) {
        obeAcc = await this.prisma.account.create({ data: { name: "Opening Balance Equity", code: "3999", type: "EQUITY", balance: 0 } });
      }
      const isDebitClass = data.type === "ASSET" || data.type === "EXPENSE";
      await this.postVoucher({ description: `Opening Balance for ${data.name}`, amount: openingBal, debit_code: isDebitClass ? data.code : "3999", credit_code: isDebitClass ? "3999" : data.code, created_by: data.created_by || "System" });
    }
    return this.prisma.account.findUnique({ where: { id: account.id } });
  }

  async postVoucher(data: { description: string; amount: number; debit_code: string; credit_code: string; created_by?: string; transaction_date?: string; invoice_id?: string; payment_id?: string; }) {
    const amt = Number(data.amount);
    if (isNaN(amt) || amt <= 0) throw new BadRequestException("Invalid amount");
    const debitAcc = await this.prisma.account.findUnique({ where: { code: data.debit_code } });
    const creditAcc = await this.prisma.account.findUnique({ where: { code: data.credit_code } });
    if (!debitAcc) throw new BadRequestException(`Debit account with code ${data.debit_code} not found`);
    if (!creditAcc) throw new BadRequestException(`Credit account with code ${data.credit_code} not found`);
    if (debitAcc.id === creditAcc.id) throw new BadRequestException("Debit and credit accounts must be different");
    return this.prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const count = await tx.ledgerEntry.count();
      const voucherNo = `JV-${year}-${String(count + 1).padStart(4, "0")}`;
      const entry = await tx.ledgerEntry.create({
        data: { 
          voucher_no: voucherNo, 
          description: data.description, 
          amount: amt, 
          debit_account_id: debitAcc.id, 
          credit_account_id: creditAcc.id, 
          created_by: data.created_by || "System", 
          transaction_date: data.transaction_date ? new Date(data.transaction_date) : new Date(),
          invoice_id: data.invoice_id || null,
          payment_id: data.payment_id || null
        },
      });
      const debitMult = (debitAcc.type === "ASSET" || debitAcc.type === "EXPENSE") ? 1 : -1;
      await tx.account.update({ where: { id: debitAcc.id }, data: { balance: { increment: amt * debitMult } } });
      const creditMult = (creditAcc.type === "ASSET" || creditAcc.type === "EXPENSE") ? -1 : 1;
      await tx.account.update({ where: { id: creditAcc.id }, data: { balance: { increment: amt * creditMult } } });
      tx.auditLog.create({ data: { action: "POST_VOUCHER", entity_type: "LEDGER_ENTRY", entity_id: entry.id, new_data: JSON.stringify({ voucher_no: voucherNo, debit: `${debitAcc.name} (${debitAcc.code})`, credit: `${creditAcc.name} (${creditAcc.code})`, amount: amt, created_by: data.created_by || "System" }), user_id: data.created_by || "System" } }).catch(() => {});
      return entry;
    });
  }

  async getVouchers() {
    return this.prisma.ledgerEntry.findMany({ include: { debit_account: true, credit_account: true }, orderBy: { transaction_date: "desc" } });
  }

  async getAccountLedger(accountId: string, startDate?: string, endDate?: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException("Account not found");
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); dateFilter.lte = end; }
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { OR: [{ debit_account_id: accountId }, { credit_account_id: accountId }], ...(Object.keys(dateFilter).length > 0 ? { transaction_date: dateFilter } : {}) },
      include: { debit_account: true, credit_account: true },
      orderBy: { transaction_date: "asc" },
    });
    let runningBalance = 0;
    const rows = entries.map(e => {
      const isDebit = e.debit_account_id === accountId;
      const amt = Number(e.amount);
      const isNormalDebit = account.type === "ASSET" || account.type === "EXPENSE";
      runningBalance += isDebit ? (isNormalDebit ? amt : -amt) : (isNormalDebit ? -amt : amt);
      return { id: e.id, voucher_no: e.voucher_no, transaction_date: e.transaction_date, description: e.description, debit: isDebit ? amt : 0, credit: !isDebit ? amt : 0, balance: runningBalance, created_by: e.created_by, particulars: isDebit ? e.credit_account.name : e.debit_account.name, particulars_code: isDebit ? e.credit_account.code : e.debit_account.code, invoice_id: e.invoice_id, payment_id: e.payment_id };
    });
    // Reverse the rows so that the newest transaction appears at the top of the UI list
    const newestFirstRows = [...rows].reverse();
    return { account, entries: newestFirstRows };
  }

  async updateOpeningBalance(accountId: string, newAmount: number, updatedBy?: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException("Account not found");
    const obeAcc = await this.prisma.account.findUnique({ where: { code: "3999" } });
    if (!obeAcc) throw new BadRequestException("Opening Balance Equity account (3999) not found.");
    const existingEntry = await this.prisma.ledgerEntry.findFirst({
      where: { description: { startsWith: `Opening Balance for ${account.name}` }, OR: [{ debit_account_id: accountId }, { credit_account_id: accountId }] },
    });
    const isDebitClass = account.type === "ASSET" || account.type === "EXPENSE";
    const newAmt = Number(newAmount);
    if (existingEntry) {
      const oldAmt = Number(existingEntry.amount);
      const diff = newAmt - oldAmt;
      const isDebitClass = account.type === "ASSET" || account.type === "EXPENSE";
      
      // For ASSETS, debit increases (+diff) and credit decreases (-diff)
      // For EQUITY/LIABILITY/REVENUE, credit increases (+diff) and debit decreases (-diff)
      const targetInc = isDebitClass ? diff : -diff;
      const obeInc = isDebitClass ? -diff : diff;

      await this.prisma.$transaction(async (tx) => {
        // Adjust main account balance
        await tx.account.update({ where: { id: accountId }, data: { balance: { increment: targetInc } } });
        // Adjust balancing Opening Balance Equity account
        await tx.account.update({ where: { id: obeAcc.id }, data: { balance: { increment: obeInc } } });
        // Update the transaction amount in ledger
        await tx.ledgerEntry.update({ where: { id: existingEntry.id }, data: { amount: newAmt, created_by: updatedBy || "System" } });
        
        await tx.auditLog.create({ 
          data: { 
            action: "EDIT_OPENING_BALANCE", 
            entity_type: "ACCOUNT", 
            entity_id: accountId, 
            old_data: JSON.stringify({ opening_balance: oldAmt }), 
            new_data: JSON.stringify({ opening_balance: newAmt, updated_by: updatedBy || "System" }), 
            user_id: updatedBy || "System"
          }
        }).catch(() => {});
      });
    } else {
      await this.postVoucher({ description: `Opening Balance for ${account.name}`, amount: newAmt, debit_code: isDebitClass ? account.code : "3999", credit_code: isDebitClass ? "3999" : account.code, created_by: updatedBy || "System" });
      await this.prisma.auditLog.create({
        data: {
          action: "EDIT_OPENING_BALANCE",
          entity_type: "ACCOUNT",
          entity_id: accountId,
          old_data: JSON.stringify({ opening_balance: 0 }),
          new_data: JSON.stringify({ opening_balance: newAmt, updated_by: updatedBy || "System" }),
          user_id: updatedBy || "System"
        }
      }).catch(() => {});
    }
    return this.prisma.account.findUnique({ where: { id: accountId } });
  }

  async getCashFlowStatement(filter: { period: "monthly" | "halfyearly" | "yearly"; year: number; month?: number }) {
    const { period, year, month } = filter;
    let startDate: Date, endDate: Date;
    if (period === "monthly") {
      const m = month !== undefined ? month : new Date().getMonth();
      startDate = new Date(year, m, 1); endDate = new Date(year, m + 1, 0, 23, 59, 59);
    } else if (period === "halfyearly") {
      const isFirstHalf = month && month < 6;
      startDate = isFirstHalf ? new Date(year, 0, 1) : new Date(year, 6, 1);
      endDate = isFirstHalf ? new Date(year, 5, 30, 23, 59, 59) : new Date(year, 11, 31, 23, 59, 59);
    } else {
      startDate = new Date(year, 0, 1); endDate = new Date(year, 11, 31, 23, 59, 59);
    }
    const cashBankAccounts = await this.prisma.account.findMany({ where: { type: "ASSET" } });
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { transaction_date: { gte: startDate, lte: endDate }, OR: [{ debit_account_id: { in: cashBankAccounts.map(a => a.id) } }, { credit_account_id: { in: cashBankAccounts.map(a => a.id) } }] },
      include: { debit_account: true, credit_account: true },
    });
    const operating: any[] = [], investing: any[] = [], financing: any[] = [];
    entries.forEach(e => {
      const isCashDebit = cashBankAccounts.some(a => a.id === e.debit_account_id);
      const oppositeAccount = isCashDebit ? e.credit_account : e.debit_account;
      const cashChange = isCashDebit ? Number(e.amount) : -Number(e.amount);
      const item = { voucher_no: e.voucher_no, description: e.description, transaction_date: e.transaction_date, amount: cashChange, created_by: e.created_by, opposite_account: `${oppositeAccount.name} (${oppositeAccount.code})` };
      if (oppositeAccount.type === "REVENUE" || oppositeAccount.type === "EXPENSE" || oppositeAccount.type === "LIABILITY") operating.push(item);
      else if (oppositeAccount.type === "ASSET") investing.push(item);
      else financing.push(item);
    });
    const sum = (arr: any[]) => arr.reduce((s, i) => s + i.amount, 0);
    return { period: { startDate, endDate }, operating: { items: operating, total: sum(operating) }, investing: { items: investing, total: sum(investing) }, financing: { items: financing, total: sum(financing) }, netCashFlow: sum(operating) + sum(investing) + sum(financing) };
  }

  async getFinancialReports(filter: { period: "monthly" | "halfyearly" | "yearly"; year: number; month?: number }) {
    const { period, year, month } = filter;
    let startDate: Date, endDate: Date;
    if (period === "monthly") {
      const m = month !== undefined ? month : new Date().getMonth();
      startDate = new Date(year, m, 1); endDate = new Date(year, m + 1, 0, 23, 59, 59);
    } else if (period === "halfyearly") {
      const isFirstHalf = month && month < 6;
      if (isFirstHalf) { startDate = new Date(year, 0, 1); endDate = new Date(year, 5, 30, 23, 59, 59); }
      else { startDate = new Date(year, 6, 1); endDate = new Date(year, 11, 31, 23, 59, 59); }
    } else {
      startDate = new Date(year, 0, 1); endDate = new Date(year, 11, 31, 23, 59, 59);
    }
    const accounts = await this.prisma.account.findMany();
    const ledgerEntries = await this.prisma.ledgerEntry.findMany({ where: { transaction_date: { gte: startDate, lte: endDate } }, include: { debit_account: true, credit_account: true } });
    const baseBalances = accounts.map(acc => {
      let balance = 0;
      ledgerEntries.forEach(entry => {
        if (entry.debit_account_id === acc.id) balance += Number(entry.amount) * ((acc.type === "ASSET" || acc.type === "EXPENSE") ? 1 : -1);
        if (entry.credit_account_id === acc.id) balance += Number(entry.amount) * ((acc.type === "ASSET" || acc.type === "EXPENSE") ? -1 : 1);
      });
      return { ...acc, baseBalance: balance };
    });
    const balancesMap = new Map<string, number>();
    baseBalances.forEach(acc => { balancesMap.set(acc.id, acc.baseBalance); });
    const getAggregatePeriodBalance = (accId: string): number => {
      let total = balancesMap.get(accId) || 0;
      baseBalances.filter(a => a.parent_id === accId).forEach(child => { total += getAggregatePeriodBalance(child.id); });
      return total;
    };
    const statementBalances = baseBalances.map(acc => ({ ...acc, periodBalance: getAggregatePeriodBalance(acc.id) }));
    const isLeafAccount = (accId: string) => !accounts.some(a => a.parent_id === accId);
    const trialBalance = statementBalances
      .filter(acc => isLeafAccount(acc.id))
      .map(acc => ({ id: acc.id, name: acc.name, code: acc.code, type: acc.type, debit: (acc.type === "ASSET" || acc.type === "EXPENSE") ? acc.periodBalance : 0, credit: !(acc.type === "ASSET" || acc.type === "EXPENSE") ? acc.periodBalance : 0 }));
    const profitAndLoss = {
      revenues: statementBalances.filter(a => a.type === "REVENUE"),
      expenses: statementBalances.filter(a => a.type === "EXPENSE"),
      totalRevenue: statementBalances.filter(a => a.type === "REVENUE" && isLeafAccount(a.id)).reduce((sum, a) => sum + a.periodBalance, 0),
      totalExpense: statementBalances.filter(a => a.type === "EXPENSE" && isLeafAccount(a.id)).reduce((sum, a) => sum + a.periodBalance, 0),
    };
    const balanceSheet = {
      assets: statementBalances.filter(a => a.type === "ASSET"),
      liabilities: statementBalances.filter(a => a.type === "LIABILITY"),
      equity: statementBalances.filter(a => a.type === "EQUITY"),
      totalAssets: statementBalances.filter(a => a.type === "ASSET" && isLeafAccount(a.id)).reduce((sum, a) => sum + a.periodBalance, 0),
      totalLiabilities: statementBalances.filter(a => a.type === "LIABILITY" && isLeafAccount(a.id)).reduce((sum, a) => sum + a.periodBalance, 0),
      totalEquity: statementBalances.filter(a => a.type === "EQUITY" && isLeafAccount(a.id)).reduce((sum, a) => sum + a.periodBalance, 0),
    };
    return { trialBalance, profitAndLoss: { ...profitAndLoss, netProfit: profitAndLoss.totalRevenue - profitAndLoss.totalExpense }, balanceSheet, period: { startDate, endDate } };
  }

  async getAuditLog() {
    return this.prisma.auditLog.findMany({ where: { entity_type: { in: ["ACCOUNT", "LEDGER_ENTRY"] } }, orderBy: { created_at: "desc" }, take: 200 });
  }

  async postTransaction(data: { type: "EXPENSE" | "REVENUE"; category_id: string; bank_account_id: string; amount: number; description: string; transaction_date?: string; created_by?: string; }) {
    const categoryAcc = await this.prisma.account.findUnique({ where: { id: data.category_id } });
    const bankAcc = await this.prisma.account.findUnique({ where: { id: data.bank_account_id } });
    if (!categoryAcc) throw new BadRequestException("Selected category account not found");
    if (!bankAcc) throw new BadRequestException("Selected bank account not found");
    if (bankAcc.type !== "ASSET") throw new BadRequestException("Payment/Deposit account must be of classification ASSET");
    const debit_code = data.type === "EXPENSE" ? categoryAcc.code : bankAcc.code;
    const credit_code = data.type === "EXPENSE" ? bankAcc.code : categoryAcc.code;
    return this.postVoucher({ description: data.description, amount: data.amount, debit_code, credit_code, created_by: data.created_by, transaction_date: data.transaction_date });
  }

  async deleteVouchersForInvoice(invoiceId: string) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { invoice_id: invoiceId },
      include: { debit_account: true, credit_account: true }
    });
    
    for (const entry of entries) {
      await this.reverseVoucher(entry);
    }
  }

  async deleteVouchersForPayment(paymentId: string) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { payment_id: paymentId },
      include: { debit_account: true, credit_account: true }
    });
    
    for (const entry of entries) {
      await this.reverseVoucher(entry);
    }
  }

  private async reverseVoucher(entry: any) {
    const amt = Number(entry.amount);
    const debitAcc = entry.debit_account;
    const creditAcc = entry.credit_account;
    
    await this.prisma.$transaction(async (tx) => {
      // Revert debit account balance change
      const debitMult = (debitAcc.type === "ASSET" || debitAcc.type === "EXPENSE") ? 1 : -1;
      await tx.account.update({ where: { id: debitAcc.id }, data: { balance: { decrement: amt * debitMult } } });
      
      // Revert credit account balance change
      const creditMult = (creditAcc.type === "ASSET" || creditAcc.type === "EXPENSE") ? -1 : 1;
      await tx.account.update({ where: { id: creditAcc.id }, data: { balance: { decrement: amt * creditMult } } });
      
      // Delete the entry
      await tx.ledgerEntry.delete({ where: { id: entry.id } });
    });
  }
}
