const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const quotations = await prisma.quotation.findMany();
    console.log('ALL QUOTATIONS:', JSON.stringify(quotations.map(q => ({
      id: q.id,
      quote_number: q.quote_number,
      status: q.status
    })), null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
