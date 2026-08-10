import * as path from 'path';
import * as fs from 'fs';

/**
 * Returns the absolute path to the centralized persistent_uploads directory.
 * Resolves paths consistently across local development and Hostinger production environments.
 */
export function getPersistentUploadsDir(): string {
  // 1. Support explicit environment variable override
  if (process.env.PERSISTENT_UPLOAD_DIR) {
    return path.resolve(process.env.PERSISTENT_UPLOAD_DIR);
  }

  const mainCwd = process.cwd();

  // 3. Local Monorepo directory structure detection
  if (mainCwd.endsWith('apps/backend') || mainCwd.endsWith('apps\\backend')) {
    return path.join(mainCwd, '..', '..', 'persistent_uploads');
  }

  return path.join(mainCwd, 'persistent_uploads');
}
