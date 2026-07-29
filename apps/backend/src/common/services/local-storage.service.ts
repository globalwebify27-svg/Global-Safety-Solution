import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LocalStorageService {
    private readonly uploadDir: string;

    constructor() {
        // Use external persistent directory outside git root on Hostinger so git pulls never wipe user uploads
        const persistentDir = path.join(process.cwd(), '..', 'persistent_uploads');
        const localDir = path.join(process.cwd(), 'public', 'uploads');

        // Check if we are running in production or on Hostinger server
        const isServer = process.env.NODE_ENV === 'production' || process.cwd().includes('hostingersite') || process.cwd().includes('domains');
        
        if (isServer) {
            this.uploadDir = persistentDir;
        } else {
            this.uploadDir = localDir;
        }

        try {
            if (!fs.existsSync(this.uploadDir)) {
                fs.mkdirSync(this.uploadDir, { recursive: true });
            }
        } catch (e) {
            console.warn('Fallback to local uploadDir due to permissions:', e);
            this.uploadDir = localDir;
            if (!fs.existsSync(this.uploadDir)) {
                fs.mkdirSync(this.uploadDir, { recursive: true });
            }
        }
    }

    async saveFile(fileBuffer: Buffer, originalName: string): Promise<string> {
        try {
            const fileExtension = path.extname(originalName || 'file.pdf');
            const uniqueFileName = `${uuidv4()}${fileExtension}`;
            const fullFilePath = path.join(this.uploadDir, uniqueFileName);

            // Save the binary file to persistent disk
            await fs.promises.writeFile(fullFilePath, fileBuffer);

            // Also copy to internal public/uploads if different for immediate local availability
            const internalDir = path.join(process.cwd(), 'public', 'uploads');
            if (this.uploadDir !== internalDir) {
                try {
                    if (!fs.existsSync(internalDir)) {
                        fs.mkdirSync(internalDir, { recursive: true });
                    }
                    await fs.promises.writeFile(path.join(internalDir, uniqueFileName), fileBuffer);
                } catch (copyErr) {
                    // Ignore internal copy error if read-only
                }
            }

            // Return the public access URL
            const domain = process.env.BACKEND_URL || 'http://localhost:3001';
            return `${domain}/public/uploads/${uniqueFileName}`;
        } catch (error) {
            console.error('Failed to save file to disk:', error);
            throw new InternalServerErrorException('File upload failed');
        }
    }
}