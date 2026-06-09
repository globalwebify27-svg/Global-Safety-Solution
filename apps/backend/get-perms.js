const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const permissions = await prisma.permission.findMany();
  console.log('All Permissions:', permissions.map(p => p.name).sort());
}

check().catch(console.error).finally(() => prisma.$disconnect());
