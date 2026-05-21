import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  const leadId = "14f4a969-1ff1-4f0d-8194-97250bdcfa9f"; 
  
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      expected_value: 20000
    }
  });
  console.log("Fixed lead expected value!");
}

fix().catch(console.error).finally(() => prisma.$disconnect());
