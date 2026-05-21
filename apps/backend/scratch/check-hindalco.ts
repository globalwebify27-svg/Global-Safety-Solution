import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const leadId = "81ef9aee-ee17-48c8-ab68-0e79e738065a"; 
  
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      quotations: true
    }
  });
  console.log("Lead Details:");
  console.log("Company Name:", lead?.company_name);
  console.log("Expected Value:", lead?.expected_value);
  console.log("Quotations:", lead?.quotations.map(q => ({ id: q.id, quote_number: q.quote_number, amount: q.total_amount, created_at: q.created_at })));
}

check().catch(console.error).finally(() => prisma.$disconnect());
