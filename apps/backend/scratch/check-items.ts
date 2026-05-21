import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const quote = await prisma.quotation.findFirst({
    where: { quote_number: 'GSS/2026/410' },
    include: { items: true }
  });
  console.log("Quote 410 Items:");
  console.log(quote?.items);
}

check().catch(console.error).finally(() => prisma.$disconnect());
