import * as fs from 'fs';
import * as path from 'path';

export function getPublicPath(): string {
  const paths = [
    path.join(process.cwd(), 'apps', 'backend', 'public'),
    path.join(process.cwd(), 'public'),
    path.join(__dirname, '..', '..', '..', 'public'), // from dist/src/common/utils
    path.join(__dirname, '..', '..', 'public'),
    path.join(__dirname, '..', 'public'),
    path.join(__dirname, 'public'),
  ];
  
  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  
  // Fallback: Create and return 'public' in current working directory
  const fallback = path.join(process.cwd(), 'public');
  if (!fs.existsSync(fallback)) {
    fs.mkdirSync(fallback, { recursive: true });
  }
  return fallback;
}
