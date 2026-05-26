const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const password_hash = await bcrypt.hash('Staff@123', 10);
  
  const updatedUser = await prisma.user.update({
    where: { email: 'amit@gmail.com' },
    data: { password_hash }
  });
  
  console.log("Successfully reset password for:", updatedUser.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
