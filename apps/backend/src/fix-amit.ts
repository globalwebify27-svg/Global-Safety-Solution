import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'amit@gmail.com' } });
  const role = await prisma.role.findUnique({ where: { name: 'FIELD_ENGINEER' } });

  if (user && role) {
    await prisma.userRole.upsert({
      where: {
        user_id_role_id: { user_id: user.id, role_id: role.id }
      },
      update: {},
      create: { user_id: user.id, role_id: role.id }
    });
    console.log('Successfully assigned FIELD_ENGINEER role to amit@gmail.com');
  } else {
    console.log('User or role not found');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
