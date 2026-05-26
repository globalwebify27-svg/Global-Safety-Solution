const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const roles = await prisma.role.findMany();
  console.log(roles.map(r => r.name));
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
