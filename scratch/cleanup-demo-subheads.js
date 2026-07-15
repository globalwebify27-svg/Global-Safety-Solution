const { PrismaClient } = require('@repo/database');
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up demo accounts and sub-heads...');

  // Delete sub-heads first
  await prisma.account.deleteMany({
    where: {
      code: {
        in: ['2200.1', '2200.2', '2200.3', '2299.1', '2299.2', '2299.3', '5300.1', '5300.2', '5399.1', '5399.2']
      }
    }
  });

  // Delete parents
  await prisma.account.deleteMany({
    where: {
      code: {
        in: ['2299', '5399']
      }
    }
  });

  console.log('Demo accounts cleaned up successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
