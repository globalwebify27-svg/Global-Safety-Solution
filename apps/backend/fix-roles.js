const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  // Find the role ID for FIELD_ENGINEER
  const fieldEngineerRole = await prisma.role.findUnique({
    where: { name: 'FIELD_ENGINEER' }
  });

  if (!fieldEngineerRole) {
    console.error('Role FIELD_ENGINEER not found.');
    return;
  }

  // Delete all UserRole links for FIELD_ENGINEER except for karan@gmail.com
  const deleted = await prisma.userRole.deleteMany({
    where: {
      role_id: fieldEngineerRole.id,
      user: {
        email: {
          not: 'karan@gmail.com'
        }
      }
    }
  });

  console.log(`Successfully removed FIELD_ENGINEER role from ${deleted.count} users.`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
