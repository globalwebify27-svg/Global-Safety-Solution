const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const doc = await prisma.document.findFirst({
    orderBy: { created_at: 'desc' }
  });
  console.log(JSON.stringify(doc, null, 2));
}

main().finally(() => prisma.$disconnect());
