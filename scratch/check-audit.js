const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leadId = '0eda1a64-16d6-4136-8447-5c9951570ab4';
  
  console.log('--- ALL AUDIT LOGS ---');
  const allLogs = await prisma.auditLog.findMany({
    orderBy: { created_at: 'desc' },
    take: 10
  });
  console.log(JSON.stringify(allLogs, null, 2));

  console.log('\n--- AUDIT LOGS FOR LEAD ---');
  const leadLogs = await prisma.auditLog.findMany({
    where: { entity_id: leadId },
    orderBy: { created_at: 'desc' }
  });
  console.log(`Found ${leadLogs.length} audit logs for lead ${leadId}`);
  console.log(JSON.stringify(leadLogs, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
