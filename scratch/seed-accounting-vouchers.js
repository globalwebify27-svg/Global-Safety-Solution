const { PrismaClient } = require('@repo/database');
const prisma = new PrismaClient();

const demoVouchers = [
  {
    description: 'Initial Capital Investment by Promoter',
    amount: 500000.00,
    debit_code: '1010', // Bank Current Account (Asset)
    credit_code: '3000', // Owner's Capital (Equity)
  },
  {
    description: 'Safety Audit Consulting Service Invoice',
    amount: 150000.00,
    debit_code: '1200', // Accounts Receivable (Asset)
    credit_code: '4100', // Service Revenue (Revenue)
  },
  {
    description: 'Payment received for Invoice GSS/2026/001',
    amount: 100000.00,
    debit_code: '1010', // Bank Current Account (Asset)
    credit_code: '1200', // Accounts Receivable (Asset)
  },
  {
    description: 'Monthly Office Staff Payroll Payment',
    amount: 45000.00,
    debit_code: '5100', // Salary & Wage Expense (Expense)
    credit_code: '1010', // Bank Current Account (Asset)
  },
  {
    description: 'Office Broadband and Utility Bills Paid',
    amount: 14000.00,
    debit_code: '5300', // Utilities & General Expenses (Expense)
    credit_code: '1010', // Bank Current Account (Asset)
  },
  {
    description: 'Product sale of fire extinguishers',
    amount: 85000.00,
    debit_code: '1200', // Accounts Receivable (Asset)
    credit_code: '4000', // Sales Revenue (Revenue)
  }
];

async function main() {
  console.log('Fetching accounts...');
  const accounts = await prisma.account.findMany();
  const accountMap = new Map(accounts.map(a => [a.code, a]));

  console.log('Seeding journal entry vouchers...');
  
  for (let i = 0; i < demoVouchers.length; i++) {
    const v = demoVouchers[i];
    const debitAcc = accountMap.get(v.debit_code);
    const creditAcc = accountMap.get(v.credit_code);

    if (!debitAcc || !creditAcc) {
      console.error(`Skipping due to missing accounts: ${v.debit_code} or ${v.credit_code}`);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const count = await tx.ledgerEntry.count();
      const voucherNo = `JV-${year}-${String(count + 1).padStart(4, '0')}`;

      // Create Ledger Entry
      const entry = await tx.ledgerEntry.create({
        data: {
          voucher_no: voucherNo,
          description: v.description,
          amount: v.amount,
          debit_account_id: debitAcc.id,
          credit_account_id: creditAcc.id,
          created_by: 'System Seed',
          transaction_date: new Date()
        }
      });

      // Update Debit Account
      const debitMultiplier = (debitAcc.type === 'ASSET' || debitAcc.type === 'EXPENSE') ? 1 : -1;
      await tx.account.update({
        where: { id: debitAcc.id },
        data: { balance: { increment: v.amount * debitMultiplier } }
      });

      // Update Credit Account
      const creditMultiplier = (creditAcc.type === 'ASSET' || creditAcc.type === 'EXPENSE') ? -1 : 1;
      await tx.account.update({
        where: { id: creditAcc.id },
        data: { balance: { increment: v.amount * creditMultiplier } }
      });

      console.log(`Posted voucher: ${voucherNo} - ${v.description}`);
    });
  }

  console.log('All demo accounting vouchers seeded successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
