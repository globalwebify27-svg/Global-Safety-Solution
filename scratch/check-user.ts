import { PrismaClient } from '@repo/database';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://u745630191_adminglobal:Admin%407209@srv2205.hstgr.io:3306/u745630191_globalsafety"
    }
  }
});

async function check() {
  const role = await prisma.role.findUnique({
    where: { name: 'FIELD_ENGINEER' },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (!role) {
    console.log("Role FIELD_ENGINEER not found in production!");
    return;
  }

  console.log(`Role in production: ${role.name}`);
  console.log("Permissions assigned in production:");
  role.permissions.forEach(rp => {
    console.log(`- ${rp.permission.name} (Module: ${rp.permission.module})`);
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
