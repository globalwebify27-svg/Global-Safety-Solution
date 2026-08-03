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
    private readonly persistentDir: string;

    constructor() {
        // Locate monorepo root folder cleanly regardless of where backend is executed
        const cwd = process.cwd();
        if (cwd.endsWith('apps/backend') || cwd.endsWith('apps\\backend')) {
            this.persistentDir = path.join(cwd, '..', '..', 'persistent_uploads');
        } else {
            this.persistentDir = path.join(cwd, 'persistent_uploads');
        }

        try {
            if (!fs.existsSync(this.persistentDir)) {
                fs.mkdirSync(this.persistentDir, { recursive: true });
            }
        } catch (e) {
            console.warn('Persistent directory creation warning:', e);
        }
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
     */
    private validateMimeBytes(buffer: Buffer, ext: string): void {
        const sig = MIME_SIGNATURES.find((s) => s.ext.includes(ext));
        if (!sig) return;

        const offset = sig.offset || 0;
        const matches = sig.bytes.every(
            (byte, i) => buffer.length > offset + i && buffer[offset + i] === byte,
        );

        if (!matches) {
            const strictExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.webp']);
            if (strictExts.has(ext)) {
                throw new BadRequestException(
                    `File content does not match the declared file type "${ext}". The file may be corrupted or misnamed.`,
                );
            }
        }
    }

    // =====================================================================
    // FILE SAVE
    // =====================================================================

    /**
     * Validates, saves file strictly to single permanent persistent_uploads directory,
     * and returns the public access URL.
     */
    async saveFile(fileBuffer: Buffer, originalName: string, fileMimeType?: string): Promise<string> {
        try {
            // Validate before writing
            this.validateFile(fileBuffer, originalName, fileMimeType);

            const sanitizedName = this.sanitizeFilename(originalName);
            const fileExtension = path.extname(sanitizedName).toLowerCase() || '.pdf';
            const uniqueFileName = `${uuidv4()}${fileExtension}`;

            const filePath = path.join(this.persistentDir, uniqueFileName);

            if (!fs.existsSync(this.persistentDir)) {
                fs.mkdirSync(this.persistentDir, { recursive: true });
            }

            await fs.promises.writeFile(filePath, fileBuffer);

            // Determine domain URL dynamically:
            // Localhost environment -> http://localhost:3001/public/uploads/... (served from local persistent_uploads)
            // Hostinger environment -> https://papayawhip-dolphin.../public/uploads/... (served from Hostinger persistent_uploads)
            const envBackendUrl = (process.env.BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
            const cleanDomain = envBackendUrl.replace(/\/api$/, '');
            return `${cleanDomain}/public/uploads/${uniqueFileName}`;
        } catch (error) {
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
     * Saves a raw file buffer directly to permanent storage.
     * Used by sync endpoint to receive files from local testing.
     */
    async saveRawFile(fileBuffer: Buffer, fileName: string): Promise<void> {
        const sanitized = this.sanitizeFilename(fileName);
        if (!fs.existsSync(this.persistentDir)) {
            fs.mkdirSync(this.persistentDir, { recursive: true });
        }
        await fs.promises.writeFile(path.join(this.persistentDir, sanitized), fileBuffer);
    }

    // =====================================================================
    // FILE DELETE (physical cleanup from persistent_uploads)
    // =====================================================================

    /**
     * Extracts the filename from a full URL and deletes the physical file
     * strictly from persistent_uploads storage.
     * Returns true if file was deleted, false if file did not exist.
     * Never throws — logs warnings on failure.
     */
    async deleteFile(fileUrl: string): Promise<boolean> {
        if (!fileUrl) return false;

        try {
            const fileName = this.extractFilenameFromUrl(fileUrl);
            if (!fileName) {
                console.warn('Could not extract filename from URL for deletion:', fileUrl);
                return false;
            }

            if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
                console.warn('Suspicious filename rejected for deletion:', fileName);
                return false;
            }

            const targetPath = path.join(this.persistentDir, fileName);
            if (fs.existsSync(targetPath)) {
                await fs.promises.unlink(targetPath);
                console.log(`Physical file unlinked cleanly from persistent_uploads: ${fileName}`);
                return true;
            }
            return false;
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
            if (fileUrl.startsWith('data:')) return null;

            let urlPath = fileUrl;
            try {
                const parsed = new URL(fileUrl);
                urlPath = parsed.pathname;
            } catch {
                // Not a full URL, treat as a path
            }

            const parts = urlPath.split('/').filter(Boolean);
            const filename = parts[parts.length - 1];

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
                console.log('Successfully synced file to Hostinger persistent storage:', uniqueFileName);
            }
        } catch (e: any) {
            console.warn('Background sync to Hostinger server notice:', e?.message || e);
        }
    }
}