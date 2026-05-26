import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password_hash = await bcrypt.hash('Staff@123', 10);
  
  const emails = ['amit@gmail.com', 'kartik@gmail.com', 'admin@globalsafety.com'];
  
  for (const email of emails) {
    try {
      await prisma.user.update({
        where: { email },
        data: { password_hash }
      });
      console.log(`Successfully reset password for: ${email}`);
    } catch (e) {
      console.log(`Failed to reset password for ${email}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
