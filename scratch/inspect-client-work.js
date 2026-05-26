const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== CLIENTS ===');
  const clients = await prisma.client.findMany({
    include: {
      projects: {
        include: {
          tasks: true,
          work_orders: true
        }
      },
      inspections: true
    }
  });

  clients.forEach(c => {
    console.log(`[Client]: ${c.name} (ID: ${c.id})`);
    console.log(` - Projects: ${c.projects.length}`);
    c.projects.forEach(p => {
      console.log(`   * Project: "${p.name}" (Status: ${p.status})`);
      console.log(`     - Tasks: ${p.tasks.length}`);
      p.tasks.forEach(t => {
        console.log(`       > Task: "${t.title}" (Status: ${t.status})`);
      });
      console.log(`     - Work Orders: ${p.work_orders.length}`);
      p.work_orders.forEach(w => {
        console.log(`       > Work Order: "${w.work_order_no}" (Status: ${w.status})`);
      });
    });
    console.log(` - Inspections: ${c.inspections.length}`);
    c.inspections.forEach(i => {
      console.log(`   * Inspection ID: ${i.id} (Status: ${i.status})`);
    });
    console.log('----------------------------------------------------');
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
