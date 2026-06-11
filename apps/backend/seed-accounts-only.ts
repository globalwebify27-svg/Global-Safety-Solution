import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const defaultAccounts = [
  { code: '1010', name: 'Bank Current Account', type: 'ASSET' },
  { code: '1020', name: 'Cash Account', type: 'ASSET' },
  { code: '1200', name: 'Accounts Receivable', type: 'ASSET' },
  { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
  { code: '3000', name: 'Owner Equity', type: 'EQUITY' },
  { code: '4000', name: 'Sales Revenue', type: 'REVENUE' },
  { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' },
];

async function main() {
  console.log('Connecting to database...');
  
  let createdCount = 0;
  let skippedCount = 0;

  for (const acc of defaultAccounts) {
    const existing = await prisma.account.findUnique({
      where: { code: acc.code }
    });

    if (!existing) {
      await prisma.account.create({
        data: {
          code: acc.code,
          name: acc.name,
          type: acc.type,
          balance: 0.00,
        }
      });
      console.log(`Created missing account: [${acc.code}] ${acc.name}`);
      createdCount++;
    } else {
      console.log(`Account already exists: [${acc.code}] ${acc.name} (Skipped)`);
      skippedCount++;
    }
  }

  console.log(`\nMigration complete. Created: ${createdCount}, Skipped: ${skippedCount}`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
