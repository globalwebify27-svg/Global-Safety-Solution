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

  await app.close();
}
bootstrap();
