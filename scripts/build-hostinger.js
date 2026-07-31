const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Hostinger optimized build...');

// 1. Build the NestJS backend (outputs to apps/backend/dist)
execSync('npm run build --workspace=backend', { stdio: 'inherit' });

// 2. Prepare the root-level dist/ folder
const rootDist = path.join(__dirname, '../dist');

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

// Helper: delete everything in a directory EXCEPT specified folder names
function cleanDirExcept(dir, exceptNames) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (exceptNames.includes(entry.name)) {
      console.log(`Preserved: dist/${entry.name}/`);
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
}

// Clean dist/ but NEVER delete public/ (contains uploaded files from staff)
// This prevents uploaded images/PDFs from being wiped on every deploy.
if (fs.existsSync(rootDist)) {
  cleanDirExcept(rootDist, ['public']);
  console.log('Cleaned dist/ folder (preserved dist/public/ with uploads)');
} else {
  fs.mkdirSync(rootDist, { recursive: true });
  console.log('Created root-level dist/ folder');
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

// 5. Copy prisma folder to root-level dist/
const srcPrisma = path.join(__dirname, '../apps/backend/prisma');
const destPrisma = path.join(__dirname, '../dist/prisma');
if (fs.existsSync(srcPrisma)) {
  copyDirSync(srcPrisma, destPrisma);
  console.log('Copied prisma schema folder to root-level dist/');
}

// 5.1 Copy src/assets (gss-logo.png) to root-level dist/assets/
const srcAssets = path.join(__dirname, '../apps/backend/src/assets');
const destAssets = path.join(__dirname, '../dist/assets');
if (fs.existsSync(srcAssets)) {
  copyDirSync(srcAssets, destAssets);
  console.log('Copied src/assets folder to root-level dist/assets/');
}

// 5.1.1 Copy pdfkit font data files to root-level dist/data/
const pdfkitDataSrc = path.join(__dirname, '../node_modules/pdfkit/js/data');
const pdfkitDataDest = path.join(__dirname, '../dist/data');
if (fs.existsSync(pdfkitDataSrc)) {
  copyDirSync(pdfkitDataSrc, pdfkitDataDest);
  console.log('Copied pdfkit font data (.afm files) to root-level dist/data/');
}

// 5.2 Ensure public/uploads directory exists (but NEVER delete existing files)
const destUploads = path.join(__dirname, '../dist/public/uploads');
fs.mkdirSync(destUploads, { recursive: true });
console.log('Ensured dist/public/uploads/ directory exists');

// 6. Install production dependencies directly inside dist/
console.log('Installing production dependencies into dist/node_modules...');
try {
  execSync('npm install --omit=dev --legacy-peer-deps', { cwd: rootDist, stdio: 'inherit' });
  console.log('Production dependencies installed in dist/node_modules successfully!');
} catch (err) {
  console.warn('Note: Local dist npm install skipped (Hostinger will install production dependencies automatically on server deployment).');
}

console.log('Hostinger root-level dist packaging completed successfully!');
