try {
  require('dotenv').config();
} catch (e) {
  // Hostinger handles environment variables natively
}
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { execSync } from 'child_process';

// Force Prisma to generate the library engine client on startup only if not already generated
try {
  require.resolve('@prisma/client');
  // Check if it's actually generated (sometimes a dummy index.js exists but no runtime)
  const fs = require('fs');
  const path = require('path');
  const clientPath = path.dirname(require.resolve('@prisma/client'));
  if (!fs.existsSync(path.join(clientPath, 'schema.prisma')) && !fs.existsSync(path.join(clientPath, 'index.d.ts'))) {
    throw new Error('Prisma Client not fully generated');
  }
} catch (error) {
  try {
    const fs = require('fs');
    let schemaPath = 'dist/prisma/schema.prisma';
    if (!fs.existsSync(schemaPath)) {
      schemaPath = 'prisma/schema.prisma';
    }
    console.log(`Generating Prisma Client on startup using schema: ${schemaPath}`);
    execSync(`npx prisma generate --schema=${schemaPath}`, { stdio: 'inherit' });
  } catch (genError) {
    console.error('Failed to generate Prisma client on startup:', genError);
  }
}

import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { PrismaClientExceptionFilter } from './common/filters/prisma-client-exception.filter';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Increase payload limit for Base64 image transfers
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization, Accept',
  });

  // Simple logging middleware
  app.use((req: any, res: any, next: any) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Serve static assets
  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '/public',
  });

  // Enable Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable Global Exception Filter for Prisma
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend is running on: http://localhost:${port}`);
}
bootstrap();
