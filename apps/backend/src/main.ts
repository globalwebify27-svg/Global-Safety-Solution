try {
  require('dotenv').config();
} catch (e) {
  // Hostinger handles environment variables natively
}

// Sanitize DATABASE_URL: Hostinger may wrap env var values in quotes
if (process.env.DATABASE_URL) {
  const raw = process.env.DATABASE_URL;
  // Strip surrounding double quotes if present
  process.env.DATABASE_URL = raw.replace(/^["']|["']$/g, '');
  // Strip DATABASE_URL= prefix if accidentally included
  if (process.env.DATABASE_URL.startsWith('DATABASE_URL=')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^DATABASE_URL=["']?/, '').replace(/["']$/, '');
  }
  console.log(`[DB] DATABASE_URL length=${process.env.DATABASE_URL.length}, starts=${process.env.DATABASE_URL.substring(0, 10)}, ends=${process.env.DATABASE_URL.substring(process.env.DATABASE_URL.length - 10)}`);
}
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { execSync } from 'child_process';




import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { PrismaClientExceptionFilter } from './common/filters/prisma-client-exception.filter';
import { json, urlencoded } from 'express';
import { getPersistentUploadsDir } from './common/utils/storage-utils';

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
  const path = require('path');
  const persistentUploadsDir = getPersistentUploadsDir();

  if (!fs.existsSync(persistentUploadsDir)) {
    try {
      fs.mkdirSync(persistentUploadsDir, { recursive: true });
    } catch (e) {
      // Ignore permissions issue
    }
  }

  // Run backward-compatible startup migration to copy existing files from non-persistent build/temp locations
  try {
    const cwd = process.cwd();
    const sourceDirs = [
      join(cwd, 'public', 'uploads'),
      join(cwd, '..', 'persistent_uploads'),
    ];

    for (const srcDir of sourceDirs) {
      const resolvedSrc = path.resolve(srcDir);
      const resolvedDest = path.resolve(persistentUploadsDir);
      
      // Do not copy from ourselves
      if (resolvedSrc === resolvedDest) continue;

      if (fs.existsSync(resolvedSrc)) {
        console.log(`[Startup Migration] Scanning source directory for migration: ${resolvedSrc}`);
        const files = fs.readdirSync(resolvedSrc);
        for (const file of files) {
          const srcPath = join(resolvedSrc, file);
          const destPath = join(resolvedDest, file);

          const stat = fs.statSync(srcPath);
          if (stat.isFile()) {
            if (!fs.existsSync(destPath)) {
              console.log(`[Startup Migration] Copying file: ${file} to ${resolvedDest}`);
              fs.copyFileSync(srcPath, destPath);
            }
          } else if (stat.isDirectory()) {
            // Handle subfolders like 'certificates'
            const destSubDir = join(resolvedDest, file);
            if (!fs.existsSync(destSubDir)) {
              fs.mkdirSync(destSubDir, { recursive: true });
            }
            const subFiles = fs.readdirSync(srcPath);
            for (const subFile of subFiles) {
              const subSrcPath = join(srcPath, subFile);
              const subDestPath = join(destSubDir, subFile);
              if (fs.statSync(subSrcPath).isFile() && !fs.existsSync(subDestPath)) {
                console.log(`[Startup Migration] Copying subfolder file: ${file}/${subFile}`);
                fs.copyFileSync(subSrcPath, subDestPath);
              }
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[Startup Migration] Notice:', err?.message || err);
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
