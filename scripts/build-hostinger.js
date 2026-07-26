const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Hostinger optimized build...');

// 1. Build the NestJS backend
execSync('npm run build --workspace=backend', { stdio: 'inherit' });

// 2. Copy package.json to the dist directory
const srcPackage = path.join(__dirname, '../apps/backend/package.json');
const destPackage = path.join(__dirname, '../apps/backend/dist/package.json');
fs.copyFileSync(srcPackage, destPackage);
console.log('Copied package.json to dist/');

// 3. Copy main.js to the dist directory
const srcMain = path.join(__dirname, '../apps/backend/main.js');
const destMain = path.join(__dirname, '../apps/backend/dist/main.js');
fs.copyFileSync(srcMain, destMain);
console.log('Copied main.js to dist/');

// 4. Copy prisma folder to the dist directory (so Prisma Client can be generated on startup)
const srcPrisma = path.join(__dirname, '../apps/backend/prisma');
const destPrisma = path.join(__dirname, '../apps/backend/dist/prisma');
if (fs.existsSync(srcPrisma)) {
  fs.mkdirSync(destPrisma, { recursive: true });
  fs.readdirSync(srcPrisma).forEach(file => {
    fs.copyFileSync(path.join(srcPrisma, file), path.join(destPrisma, file));
  });
  console.log('Copied prisma schema folder to dist/');
}

console.log('Hostinger build completed successfully!');
