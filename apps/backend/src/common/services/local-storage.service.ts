import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// ----- File Validation Constants -----
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.gif', '.webp',           // Images
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',            // Documents
    '.csv', '.txt', '.ppt', '.pptx',                     // Other docs
]);

const BLOCKED_EXTENSIONS = new Set([
    '.exe', '.sh', '.bat', '.cmd', '.ps1', '.msi', '.com', // Executables
    '.js', '.php', '.py', '.rb', '.pl', '.cgi',            // Server scripts
    '.jar', '.war', '.dll', '.so', '.bin',                  // Binaries
]);

// Magic byte signatures for MIME validation
const MIME_SIGNATURES: Array<{ ext: string[]; bytes: number[]; offset?: number }> = [
    { ext: ['.jpg', '.jpeg'], bytes: [0xFF, 0xD8, 0xFF] },
    { ext: ['.png'], bytes: [0x89, 0x50, 0x4E, 0x47] },
    { ext: ['.gif'], bytes: [0x47, 0x49, 0x46, 0x38] },
    { ext: ['.pdf'], bytes: [0x25, 0x50, 0x44, 0x46] },       // %PDF
    { ext: ['.webp'], bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF
    { ext: ['.doc', '.xls', '.ppt'], bytes: [0xD0, 0xCF, 0x11, 0xE0] }, // OLE2
    { ext: ['.docx', '.xlsx', '.pptx'], bytes: [0x50, 0x4B, 0x03, 0x04] }, // ZIP/OOXML
];

@Injectable()
export class LocalStorageService {
    private readonly primaryDir: string;
    private readonly backupDir: string;

    constructor() {
        // Direct public uploads folder inside application root (100% visible in Hostinger File Manager)
        this.primaryDir = path.join(process.cwd(), 'public', 'uploads');
        // External persistent backup directory outside web root
        this.backupDir = path.join(process.cwd(), '..', 'persistent_uploads');

        // Ensure both directories exist
        [this.primaryDir, this.backupDir].forEach((dir) => {
            try {
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            } catch (e) {
                console.warn(`Directory creation warning for ${dir}:`, e);
            }
        });
    }

    // =====================================================================
    // FILE VALIDATION
    // =====================================================================

    /**
     * Validates file before saving: checks size, extension, blocked types,
     * filename sanitization, and MIME magic bytes.
     * Throws BadRequestException with meaningful error messages on failure.
     */
    validateFile(fileBuffer: Buffer, originalName: string, fileMimeType?: string): void {
        // 1. File size check
        if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
            const sizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(1);
            throw new BadRequestException(
                `File size (${sizeMB} MB) exceeds maximum allowed limit of 25 MB.`,
            );
        }

        // 2. Sanitize and validate filename
        const sanitizedName = this.sanitizeFilename(originalName);
        const ext = path.extname(sanitizedName).toLowerCase();

        // 3. Block dangerous executable extensions
        if (BLOCKED_EXTENSIONS.has(ext)) {
            throw new BadRequestException(
                `File type "${ext}" is not allowed for security reasons.`,
            );
        }

        // 4. Check allowed extensions
        if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
            throw new BadRequestException(
                `File type "${ext}" is not supported. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}`,
            );
        }

        // 5. MIME magic byte validation (cross-check extension vs actual file content)
        if (ext && fileBuffer.length >= 4) {
            this.validateMimeBytes(fileBuffer, ext);
        }
    }

    /**
     * Sanitizes a filename: strips directory traversal, path separators,
     * null bytes, and control characters.
     */
    private sanitizeFilename(name: string): string {
        if (!name) return 'file.pdf';
        return name
            .replace(/\.\./g, '')           // Remove directory traversal
            .replace(/[\/\\]/g, '')          // Remove path separators
            .replace(/\0/g, '')              // Remove null bytes
            .replace(/[\x00-\x1f\x7f]/g, '') // Remove control characters
            .trim() || 'file.pdf';
    }

    /**
     * Validates file content magic bytes against the declared extension.
     * Only warns on mismatch for common types (non-blocking for .txt, .csv).
     */
    private validateMimeBytes(buffer: Buffer, ext: string): void {
        const sig = MIME_SIGNATURES.find((s) => s.ext.includes(ext));
        if (!sig) return; // No signature to check for this extension

        const offset = sig.offset || 0;
        const matches = sig.bytes.every(
            (byte, i) => buffer.length > offset + i && buffer[offset + i] === byte,
        );

        if (!matches) {
            // For image and PDF files, strictly reject mismatched magic bytes
            const strictExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.webp']);
            if (strictExts.has(ext)) {
                throw new BadRequestException(
                    `File content does not match the declared file type "${ext}". The file may be corrupted or misnamed.`,
                );
            }
        }
    }

    // =====================================================================
    // FILE SAVE (with validation and dual-write)
    // =====================================================================

    /**
     * Validates, saves file to both primary and backup directories,
     * and returns the public access URL.
     * Throws on validation failure or if both writes fail.
     */
    async saveFile(fileBuffer: Buffer, originalName: string, fileMimeType?: string): Promise<string> {
        try {
            // Validate before writing
            this.validateFile(fileBuffer, originalName, fileMimeType);

            const sanitizedName = this.sanitizeFilename(originalName);
            const fileExtension = path.extname(sanitizedName).toLowerCase() || '.pdf';
            const uniqueFileName = `${uuidv4()}${fileExtension}`;

            const primaryPath = path.join(this.primaryDir, uniqueFileName);
            const backupPath = path.join(this.backupDir, uniqueFileName);

            let primaryOk = false;
            let backupOk = false;

            // 1. Save to primary public/uploads directory (Hostinger File Manager visible)
            try {
                await fs.promises.writeFile(primaryPath, fileBuffer);
                primaryOk = true;
            } catch (err) {
                console.warn('Failed to write to primaryDir:', err);
            }

            // 2. Dual-sync write to backup persistent_uploads directory
            try {
                await fs.promises.writeFile(backupPath, fileBuffer);
                backupOk = true;
            } catch (err) {
                console.warn('Failed to write to backupDir:', err);
            }

            // If both writes failed, throw error
            if (!primaryOk && !backupOk) {
                throw new InternalServerErrorException(
                    'File upload failed: unable to write to any storage directory.',
                );
            }

            // Determine domain URL
            const localDomain = (process.env.BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
            const isLocalhost = localDomain.includes('localhost') || localDomain.includes('127.0.0.1');

            const hostingerUrl = (process.env.REMOTE_HOSTINGER_URL || 'https://papayawhip-dolphin-790455.hostingersite.com').replace(/\/$/, '');

            // 3. Remote Sync: If testing on localhost connected to main database, sync file to Hostinger server
            if (isLocalhost && hostingerUrl && !hostingerUrl.includes('localhost')) {
                this.syncToRemoteHostinger(fileBuffer, uniqueFileName, hostingerUrl).catch((err) => {
                    console.warn('Background sync to Hostinger server notice:', err?.message || err);
                });
            }

            // If connected to remote database or testing on localhost, use Hostinger URL for database persistence so links work anywhere
            const isRemoteDb = process.env.DATABASE_URL?.includes('hstgr.io') || process.env.DATABASE_URL?.includes('prisma-data.net') || isLocalhost;
            const targetDomain = (isLocalhost && isRemoteDb) ? hostingerUrl : localDomain;
            const cleanDomain = targetDomain.replace(/\/api$/, '');
            return `${cleanDomain}/public/uploads/${uniqueFileName}`;
        } catch (error) {
            // Re-throw BadRequestException as-is (validation errors)
            if (error instanceof BadRequestException) {
                throw error;
            }
            console.error('Failed to save file to disk:', error);
            throw new InternalServerErrorException('File upload failed');
        }
    }

    // =====================================================================
    // RAW FILE SAVE (used by remote sync endpoint)
    // =====================================================================

    /**
     * Saves a raw file buffer directly to both primary and backup directories.
     * Used by sync endpoint to receive files from local testing.
     */
    async saveRawFile(fileBuffer: Buffer, fileName: string): Promise<void> {
        const sanitized = this.sanitizeFilename(fileName);
        const primaryPath = path.join(this.primaryDir, sanitized);
        const backupPath = path.join(this.backupDir, sanitized);

        try {
            await fs.promises.writeFile(primaryPath, fileBuffer);
        } catch (e) {
            console.warn('saveRawFile primary write error:', e);
        }

        try {
            await fs.promises.writeFile(backupPath, fileBuffer);
        } catch (e) {
            console.warn('saveRawFile backup write error:', e);
        }
    }

    // =====================================================================
    // FILE DELETE (physical cleanup from both directories)
    // =====================================================================

    /**
     * Extracts the filename from a full URL and deletes the physical file
     * from both primary (public/uploads) and backup (persistent_uploads) directories.
     * Returns true if at least one file was deleted, false if neither existed.
     * Never throws — logs warnings on failure.
     */
    async deleteFile(fileUrl: string): Promise<boolean> {
        if (!fileUrl) return false;

        try {
            // Extract filename from URL (e.g., "https://domain.com/public/uploads/abc-123.jpg" → "abc-123.jpg")
            const fileName = this.extractFilenameFromUrl(fileUrl);
            if (!fileName) {
                console.warn('Could not extract filename from URL for deletion:', fileUrl);
                return false;
            }

            // Security: Ensure filename has no path traversal
            if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
                console.warn('Suspicious filename rejected for deletion:', fileName);
                return false;
            }

            let deleted = false;

            // Delete from primary directory
            const primaryPath = path.join(this.primaryDir, fileName);
            try {
                if (fs.existsSync(primaryPath)) {
                    await fs.promises.unlink(primaryPath);
                    deleted = true;
                }
            } catch (err) {
                console.warn(`Failed to delete from primaryDir: ${primaryPath}`, err);
            }

            // Delete from backup directory
            const backupPath = path.join(this.backupDir, fileName);
            try {
                if (fs.existsSync(backupPath)) {
                    await fs.promises.unlink(backupPath);
                    deleted = true;
                }
            } catch (err) {
                console.warn(`Failed to delete from backupDir: ${backupPath}`, err);
            }

            if (deleted) {
                console.log(`Physical file deleted: ${fileName}`);
            }

            return deleted;
        } catch (error) {
            console.warn('deleteFile unexpected error:', error);
            return false;
        }
    }

    /**
     * Extracts the filename from a URL path.
     * Handles: "https://domain.com/public/uploads/abc-123.jpg" → "abc-123.jpg"
     * Handles: "/public/uploads/abc-123.jpg" → "abc-123.jpg"
     */
    private extractFilenameFromUrl(fileUrl: string): string | null {
        if (!fileUrl || fileUrl === '#') return null;
        try {
            // Handle data: URIs (base64) — nothing to delete
            if (fileUrl.startsWith('data:')) return null;

            // Try to parse as full URL first
            let urlPath = fileUrl;
            try {
                const parsed = new URL(fileUrl);
                urlPath = parsed.pathname;
            } catch {
                // Not a full URL, treat as a path
            }

            // Extract filename from path
            const parts = urlPath.split('/').filter(Boolean);
            const filename = parts[parts.length - 1];

            // Basic validation: must have an extension
            if (filename && filename.includes('.')) {
                return filename;
            }
            return null;
        } catch {
            return null;
        }
    }

    // =====================================================================
    // ROLLBACK HELPER
    // =====================================================================

    /**
     * Deletes a file that was just saved, used for transactional rollback
     * when database insertion fails after file was written to disk.
     */
    async rollbackSavedFile(fileUrl: string): Promise<void> {
        try {
            await this.deleteFile(fileUrl);
            console.log('Rollback: cleaned up orphan file after DB failure:', fileUrl);
        } catch (err) {
            console.warn('Rollback: failed to clean up orphan file:', fileUrl, err);
        }
    }

    // =====================================================================
    // REMOTE HOSTINGER SYNC
    // =====================================================================

    private async syncToRemoteHostinger(
        fileBuffer: Buffer,
        uniqueFileName: string,
        remoteHostingerUrl: string,
    ): Promise<void> {
        try {
            const targetUrl = `${remoteHostingerUrl.replace(/\/$/, '')}/api/documents/sync-raw-file`;
            const formData = new FormData();
            const blob = new Blob([new Uint8Array(fileBuffer)], { type: 'application/octet-stream' });
            formData.append('file', blob, uniqueFileName);

            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'x-sync-secret': 'gss_internal_sync_2026',
                },
                body: formData,
            });

            if (!response.ok) {
                console.warn('Sync to Hostinger returned status:', response.status, await response.text());
            } else {
                console.log('Successfully synced file to Hostinger File Manager:', uniqueFileName);
            }
        } catch (e: any) {
            console.warn('Background sync to Hostinger server notice:', e?.message || e);
        }
    }
}