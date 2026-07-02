const { PrismaClient } = require('@repo/database');
const prisma = new PrismaClient();

async function main() {
  console.log('Resetting ledger board and account balances to 0...');

  // 1. Delete all ledger entries
  const deletedLedgers = await prisma.ledgerEntry.deleteMany({});
  console.log(`Deleted ${deletedLedgers.count || 0} ledger entries.`);

  // 2. Reset account balances to 0
  const updatedAccounts = await prisma.account.updateMany({
    data: { balance: 0.00 }
  });
  console.log(`Reset ${updatedAccounts.count || 0} accounts to 0 balance.`);
  console.log('Ledger board successfully reset!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
