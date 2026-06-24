import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RBACService } from './rbac/rbac.service';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const rbacService = app.get(RBACService);
  const prisma = app.get(PrismaService);

  console.log('Seeding RBAC role permissions mapping...');
  const seedRes = await rbacService.seedRbac();
  console.log('RBAC seed result:', seedRes);

  console.log('Finding user karan...');
  const karan = await prisma.user.findUnique({
    where: { email: 'karan@gmail.com' }
  });

  if (!karan) {
    console.error('Karan user not found!');
  } else {
    console.log('Karan user found. Assigning FIELD_ENGINEER role...');
    const fieldEngineerRole = await prisma.role.findUnique({
      where: { name: 'FIELD_ENGINEER' }
    });

    if (fieldEngineerRole) {
      await prisma.userRole.upsert({
        where: {
          user_id_role_id: {
            user_id: karan.id,
            role_id: fieldEngineerRole.id
          }
        },
        update: {},
        create: {
          user_id: karan.id,
          role_id: fieldEngineerRole.id
        }
      });
      console.log('Successfully assigned FIELD_ENGINEER role to karan@gmail.com');
    } else {
      console.error('FIELD_ENGINEER role not found!');
    }
  }

  await app.close();
}

bootstrap().catch(console.error);
