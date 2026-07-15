const { PrismaClient } = require('@repo/database');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo accounts and sub-heads...');

  // 1. Create Parent: Duties & Taxes Demo Group
  const parentDuties = await prisma.account.upsert({
    where: { code: '2299' },
    update: {
      name: 'Duties & Taxes (Demo Group)',
      type: 'LIABILITY'
    },
    create: {
      code: '2299',
      name: 'Duties & Taxes (Demo Group)',
      type: 'LIABILITY',
      balance: 0.00,
    }
  });

  // Create Sub-heads under Duties & Taxes
  await prisma.account.upsert({
    where: { code: '2299.1' },
    update: {
      parent_id: parentDuties.id
    },
    create: {
      code: '2299.1',
      name: 'ITC - Input Tax Credit (Demo)',
      type: 'LIABILITY',
      parent_id: parentDuties.id,
      balance: 0.00,
    }
  });

  await prisma.account.upsert({
    where: { code: '2299.2' },
    update: {
      parent_id: parentDuties.id
    },
    create: {
      code: '2299.2',
      name: 'CGST (Demo)',
      type: 'LIABILITY',
      parent_id: parentDuties.id,
      balance: 0.00,
    }
  });

  await prisma.account.upsert({
    where: { code: '2299.3' },
    update: {
      parent_id: parentDuties.id
    },
    create: {
      code: '2299.3',
      name: 'SGST (Demo)',
      type: 'LIABILITY',
      parent_id: parentDuties.id,
      balance: 0.00,
    }
  });

  // 2. Create Parent: Office Utilities Expense Demo Group
  const parentExpenses = await prisma.account.upsert({
    where: { code: '5399' },
    update: {
      name: 'Office Utilities (Demo Group)',
      type: 'EXPENSE'
    },
    create: {
      code: '5399',
      name: 'Office Utilities (Demo Group)',
      type: 'EXPENSE',
      balance: 0.00,
    }
  });

  // Create Sub-heads under Office Utilities
  await prisma.account.upsert({
    where: { code: '5399.1' },
    update: {
      parent_id: parentExpenses.id
    },
    create: {
      code: '5399.1',
      name: 'Internet & Wi-Fi Expense (Demo)',
      type: 'EXPENSE',
      parent_id: parentExpenses.id,
      balance: 0.00,
    }
  });

  await prisma.account.upsert({
    where: { code: '5399.2' },
    update: {
      parent_id: parentExpenses.id
    },
    create: {
      code: '5399.2',
      name: 'Electricity Expense (Demo)',
      type: 'EXPENSE',
      parent_id: parentExpenses.id,
      balance: 0.00,
    }
  });

  console.log('Demo accounts and sub-heads seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
