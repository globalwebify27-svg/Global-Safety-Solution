const { PrismaClient } = require('@repo/database');
const prisma = new PrismaClient();

async function main() {
  const inspections = await prisma.inspection.findMany({
    where: {
      status: {
        in: ['IN_PROGRESS', 'PENDING_REVIEW']
      }
    },
    include: {
      items: true,
      client: true,
      engineer: true,
    }
  });
  console.log("Found inspections in progress or pending review:", inspections.length);
  inspections.forEach(i => {
    console.log(`Inspection ID: ${i.id}`);
    console.log(`Client: ${i.client.name}`);
    console.log(`Engineer: ${i.engineer ? i.engineer.name : 'Unassigned'}`);
    console.log(`Status: ${i.status}`);
    console.log("Items:");
    i.items.forEach(item => {
      console.log(`  - [${item.status}] ${item.description} (notes: ${item.notes})`);
    });
    console.log("------------------------");
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
