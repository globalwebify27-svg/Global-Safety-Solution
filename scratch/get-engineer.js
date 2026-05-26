const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      is_active: true,
      OR: [
        { designation: { contains: 'engineer' } },
        { designation: { contains: 'technician' } },
        { designation: { contains: 'field' } }
      ]
    },
    select: {
      name: true,
      email: true,
      designation: true
    },
    take: 5
  });
  console.log("ENGINEERS:", JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
