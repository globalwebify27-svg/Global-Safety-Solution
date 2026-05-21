const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const quotes = await prisma.quotation.findMany({
      where: { lead_id: '28a1788c-0bf2-49b4-911b-1a39ae3d5514' },
      include: { items: true }
    });
    console.log('Quotations for sheryians coding school:');
    for (const q of quotes) {
      console.log(`- ID: ${q.id}, Number: ${q.quote_number}, Total Amount: ${q.total_amount}, Status: ${q.status}, Items:`, q.items);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
