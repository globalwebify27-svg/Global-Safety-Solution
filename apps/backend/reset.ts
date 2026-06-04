const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const password_hash = await bcrypt.hash('Staff@123', 10);
  const users = await prisma.user.findMany();
  
  for (const user of users) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { password_hash }
      });
      console.log(`Successfully reset password for: ${user.email}`);
    } catch (e) {
      console.log(`Failed to reset password for ${user.email}: ${e.message}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
