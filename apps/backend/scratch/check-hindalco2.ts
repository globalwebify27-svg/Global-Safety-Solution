import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const leads = await prisma.lead.findMany({
    where: { company_name: 'hindalco' },
    include: { quotations: true }
  });
  console.log("Found leads:");
  leads.forEach(l => {
    console.log(`ID: ${l.id}, Expected Value: ${l.expected_value}`);
    console.log(`Quotations: ${l.quotations.map(q => q.total_amount).join(', ')}`);
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
