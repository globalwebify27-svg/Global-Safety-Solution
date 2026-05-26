const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const act = await prisma.leadActivity.findFirst({
    orderBy: { created_at: 'desc' }
  });
  console.log(JSON.stringify(act, null, 2));
}

main().finally(() => prisma.$disconnect());
