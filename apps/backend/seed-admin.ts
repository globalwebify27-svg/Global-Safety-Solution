import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password_hash = await bcrypt.hash('superadmin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@globalsafety.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@globalsafety.com',
      password_hash,
      is_active: true,
      is_email_verified: true,
    },
  });

  console.log('Super Admin created:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
