const { PrismaClient } = require('@repo/database');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Finding user...");
    const user = await prisma.user.findUnique({
      where: { email: 'admin@globalsafety.com' },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
                feature_permissions: true,
              },
            },
          },
        },
        user_feature_overrides: true,
      },
    });

    if (!user) {
      console.log("User not found!");
      return;
    }

    console.log("User found:", user.email);
    console.log("Password hash:", user.password_hash);
    
    // Test the passwords:
    const pass1 = 'superadmin123';
    const match1 = await bcrypt.compare(pass1, user.password_hash);
    console.log(`Password "${pass1}" match:`, match1);

    const pass2 = 'Staff@123';
    const match2 = await bcrypt.compare(pass2, user.password_hash);
    console.log(`Password "${pass2}" match:`, match2);

  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
