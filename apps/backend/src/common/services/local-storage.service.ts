import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LocalStorageService {
    private readonly uploadDir = path.join(process.cwd(), 'public', 'uploads');

    constructor() {
        // Automatically creates the 'public/uploads' folder if it doesn't exist
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async saveFile(fileBuffer: Buffer, originalName: string): Promise<string> {
        try {
            const fileExtension = path.extname(originalName);
            const uniqueFileName = `${uuidv4()}${fileExtension}`;
            const fullFilePath = path.join(this.uploadDir, uniqueFileName);

            // Save the binary file to your computer's local disk
            await fs.promises.writeFile(fullFilePath, fileBuffer);

            // Return the access link
            const domain = process.env.BACKEND_URL || 'http://localhost:3001';
            return `${domain}/public/uploads/${uniqueFileName}`;
        } catch (error) {
            console.error('Failed to save file to disk:', error);
            throw new InternalServerErrorException('File upload failed');
        }
    }
}