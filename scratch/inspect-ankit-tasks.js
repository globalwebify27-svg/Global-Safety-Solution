const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ankit = await prisma.user.findFirst({
    where: { email: 'ankit@gmail.com' },
    include: {
      tasks: {
        include: {
          project: {
            include: {
              client: true
            }
          }
        }
      }
    }
  });

  if (!ankit) {
    console.log('Ankit not found');
    return;
  }

  console.log(`[User]: ${ankit.name} (ID: ${ankit.id})`);
  console.log(`Assigned Tasks: ${ankit.tasks.length}`);
  ankit.tasks.forEach(t => {
    console.log(` - Task: "${t.title}" (Status: ${t.status})`);
    if (t.project) {
      console.log(`   * Project: "${t.project.name}" (ID: ${t.project.id})`);
      if (t.project.client) {
        console.log(`   * Client: "${t.project.client.name}" (ID: ${t.project.client.id})`);
      } else {
        console.log(`   * Client: None`);
      }
    } else {
      console.log(`   * Project: None`);
    }
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
