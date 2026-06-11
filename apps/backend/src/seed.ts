import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { RBACService } from './rbac/rbac.service';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const rbacService = app.get(RBACService);
  const prisma = app.get(PrismaService);

  console.log('Seeding database...');

  // 1. Create Super Admin User
  const admin = await usersService.createSuperAdmin();
  console.log('Super Admin user ensured.');

  // 2. Seed RBAC (Permissions, Roles, and Admin Assignment)
  const result = await rbacService.seedRbac();
  console.log(`${result.permissionsCount} permissions seeded.`);
  console.log(`${result.rolesCount} roles seeded.`);
  console.log(`Admin assigned to SUPER_ADMIN: ${result.adminAssigned}`);

  // 3. Seed Chart of Accounts
  console.log('Seeding Chart of Accounts...');
  const defaultAccounts = [
    { code: '1010', name: 'Bank Current Account', type: 'ASSET' },
    { code: '1020', name: 'Cash Account', type: 'ASSET' },
    { code: '1200', name: 'Accounts Receivable', type: 'ASSET' },
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
    { code: '3000', name: 'Owner Equity', type: 'EQUITY' },
    { code: '4000', name: 'Sales Revenue', type: 'REVENUE' },
    { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' },
  ];

  for (const acc of defaultAccounts) {
    await prisma.account.upsert({
      where: { code: acc.code },
      update: {},
      create: {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        balance: 0.00,
      },
    });
  }
  console.log('Chart of Accounts seeded.');

  await app.close();
}
bootstrap();
