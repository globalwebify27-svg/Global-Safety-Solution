const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.task.findMany({
    include: {
      assignee: true,
      project: {
        include: {
          client: true
        }
      }
    }
  });

  console.log(`=== ALL TASKS IN SYSTEM: ${tasks.length} ===`);
  tasks.forEach((t, idx) => {
    console.log(`[Task ${idx + 1}]: "${t.title}" (Status: ${t.status}, Assigned To: ${t.assignee ? t.assignee.name : 'Unassigned'})`);
    if (t.project) {
      console.log(` - Project: "${t.project.name}" (ID: ${t.project.id})`);
      if (t.project.client) {
        console.log(` - Client: "${t.project.client.name}" (ID: ${t.project.client.id})`);
      }
    }
    console.log('---');
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
