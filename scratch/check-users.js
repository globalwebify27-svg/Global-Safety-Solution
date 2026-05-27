const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: "mysql://u745630191_adminglobal:Admin%407209@82.25.121.200:3306/u745630191_globalsafety" } } });

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, name: true, designation: true }
  });
  console.log(users);
}
main().catch(console.error).finally(() => prisma.$disconnect());
