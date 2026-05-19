const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const clients = await prisma.client.findMany({
      where: { name: 'xljbx' },
      include: { inspections: true }
    });

    console.log('CLIENT DETAILS:', JSON.stringify(clients, null, 2));

  } catch (err) {
    console.error('Prisma Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
