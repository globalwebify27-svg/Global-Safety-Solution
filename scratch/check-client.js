require('dotenv').config({ path: 'apps/backend/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.client.findFirst({
    where: { id: "5a83713e-e52b-46af-8dcf-6b1b96321ad8" },
    include: { assigned_staff: true }
  });
  console.log(c?.assigned_staff?.name);
  const logs = await prisma.auditLog.findMany({
    where: { entity_id: "5a83713e-e52b-46af-8dcf-6b1b96321ad8" }
  });
  console.log(logs.length, "audit logs");
}
main().catch(console.error).finally(() => prisma.$disconnect());
