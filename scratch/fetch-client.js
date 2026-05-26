require('dotenv').config({ path: 'apps/backend/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.auditLog.findMany({
    where: { entity_type: 'CLIENT' }
  });
  console.log(JSON.stringify(logs, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
