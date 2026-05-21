import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const quote = await prisma.quotation.findFirst({
    where: { quote_number: 'GSS/2026/011' },
    include: { lead: true, client: true }
  });
  console.log("Quote 011:", quote);
}

check().catch(console.error).finally(() => prisma.$disconnect());
