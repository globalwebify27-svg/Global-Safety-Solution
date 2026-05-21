import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const leadId = "14f4a969-1ff1-4f0d-8194-97250bdcfa9f"; 
  
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      quotations: true
    }
  });
  console.log("Lead Details:");
  console.log("Status:", lead?.status);
  console.log("Expected Value:", lead?.expected_value);
  console.log("Quotations:", lead?.quotations.map(q => ({ id: q.id, quote_number: q.quote_number, amount: q.total_amount, created_at: q.created_at })));
}

check().catch(console.error).finally(() => prisma.$disconnect());
