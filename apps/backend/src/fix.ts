import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'kartik@gmail.com' } });
  const role = await prisma.role.findUnique({ where: { name: 'HR_MANAGER' } });

  if (user && role) {
    await prisma.userRole.upsert({
      where: {
        user_id_role_id: { user_id: user.id, role_id: role.id }
      },
      update: {},
      create: { user_id: user.id, role_id: role.id }
    });
    console.log('Successfully assigned HR_MANAGER role to kartik@gmail.com');
  } else {
    console.log('User or role not found');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
