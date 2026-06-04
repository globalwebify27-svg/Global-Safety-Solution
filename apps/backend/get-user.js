const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({
    include: {
      roles: {
        include: {
          role: true
        }
      }
    }
  });
  console.log('All Users:', JSON.stringify(users.map(u => ({
    email: u.email,
    designation: u.designation,
    rolesCount: u.roles.length,
    roles: u.roles.map(ur => ur.role.name)
  })), null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
