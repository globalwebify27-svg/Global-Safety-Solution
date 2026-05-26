const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const roles = await prisma.role.findMany({
    include: { permissions: { include: { permission: true } } }
  });
  
  roles.forEach(role => {
    console.log(`\nROLE: ${role.name}`);
    const perms = role.permissions.map(rp => rp.permission.name);
    console.log(perms.join(', '));
  });
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
