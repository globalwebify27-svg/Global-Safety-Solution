const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Hostinger optimized build...');

// 1. Build the NestJS backend (outputs to apps/backend/dist)
execSync('npm run build --workspace=backend', { stdio: 'inherit' });

// 2. Prepare the root-level dist/ folder
const rootDist = path.join(__dirname, '../dist');
if (fs.existsSync(rootDist)) {
  fs.rmSync(rootDist, { recursive: true, force: true });
}
fs.mkdirSync(rootDist, { recursive: true });
console.log('Created root-level dist/ folder');

// Helper function to recursively copy directories
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 3. Copy the compiled backend files to root-level dist/
const backendDist = path.join(__dirname, '../apps/backend/dist');
copyDirSync(backendDist, rootDist);
console.log('Successfully copied all backend build files to root-level dist/');

// 4. Copy backend package.json to root-level dist/
const srcPackage = path.join(__dirname, '../apps/backend/package.json');
const destPackage = path.join(__dirname, '../dist/package.json');
fs.copyFileSync(srcPackage, destPackage);
console.log('Copied package.json to root-level dist/');

// 5. Copy main.js to root-level dist/
const srcMain = path.join(__dirname, '../apps/backend/main.js');
const destMain = path.join(__dirname, '../dist/main.js');
fs.copyFileSync(srcMain, destMain);
console.log('Copied main.js to root-level dist/');

// 6. Copy prisma folder to root-level dist/
const srcPrisma = path.join(__dirname, '../apps/backend/prisma');
const destPrisma = path.join(__dirname, '../dist/prisma');
if (fs.existsSync(srcPrisma)) {
  copyDirSync(srcPrisma, destPrisma);
  console.log('Copied prisma schema folder to root-level dist/');
}

console.log('Hostinger root-level dist packaging completed successfully!');
