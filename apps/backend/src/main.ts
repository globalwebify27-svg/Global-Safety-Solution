try {
  require('dotenv').config();
} catch (e) {
  // Hostinger handles environment variables natively
}
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { execSync } from 'child_process';




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

  // Serve static assets from external persistent_uploads folder (outside git root)
  const fs = require('fs');
  const mainCwd = process.cwd();
  const persistentUploadsDir = (mainCwd.endsWith('apps/backend') || mainCwd.endsWith('apps\\backend'))
    ? join(mainCwd, '..', '..', 'persistent_uploads')
    : join(mainCwd, 'persistent_uploads');

  if (!fs.existsSync(persistentUploadsDir)) {
    try {
      fs.mkdirSync(persistentUploadsDir, { recursive: true });
    } catch (e) {
      // Ignore permissions issue
    }
  }
  app.useStaticAssets(persistentUploadsDir, {
    prefix: '/public/uploads',
  });

  // Enable Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
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
