const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const inspections = await prisma.inspection.findMany({
      include: { client: true, engineer: true, certificate: true }
    });
    console.log('ALL INSPECTIONS:', JSON.stringify(inspections.map(i => ({
      id: i.id,
      clientName: i.client.name,
      status: i.status,
      completed_date: i.completed_date,
      hasCertificate: !!i.certificate
    })), null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
