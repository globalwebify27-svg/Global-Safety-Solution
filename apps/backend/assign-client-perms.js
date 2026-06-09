const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientRole = await prisma.role.findUnique({
    where: { name: 'CLIENT' },
  });
  
  if (!clientRole) {
    console.error('CLIENT role not found!');
    return;
  }
  
  const readDocPerm = await prisma.permission.findUnique({
    where: { name: 'READ_DOCUMENT' },
  });
  
  if (!readDocPerm) {
    console.error('READ_DOCUMENT permission not found!');
    return;
  }
  
  await prisma.rolePermission.upsert({
    where: {
      role_id_permission_id: {
        role_id: clientRole.id,
        permission_id: readDocPerm.id,
      },
    },
    update: {},
    create: {
      role_id: clientRole.id,
      permission_id: readDocPerm.id,
    },
  });
  
  console.log('Successfully assigned READ_DOCUMENT to CLIENT role.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
