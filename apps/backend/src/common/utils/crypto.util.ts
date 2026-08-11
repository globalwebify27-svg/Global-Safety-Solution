import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 10000;

// Use process.env.APP_SECRET or default to a safe secret key
const SECRET = process.env.APP_SECRET || 'gss-enterprise-whatsapp-gateway-key-secret-9988';

export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  const key = crypto.pbkdf2Sync(SECRET, salt, ITERATIONS, KEY_LENGTH, 'sha512');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag().toString('hex');
  
  // Format: salt:iv:tag:encrypted
  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 4) return encryptedText; // return as is if not encrypted format
    
    const salt = Buffer.from(parts[0], 'hex');
    const iv = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];
    
    try {
      const key = crypto.pbkdf2Sync(SECRET, salt, ITERATIONS, KEY_LENGTH, 'sha512');
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (e) {
      // Fallback decryption using default static secret key
      const defaultSecret = 'gss-enterprise-whatsapp-gateway-key-secret-9988';
      if (SECRET !== defaultSecret) {
        const key = crypto.pbkdf2Sync(defaultSecret, salt, ITERATIONS, KEY_LENGTH, 'sha512');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
      }
      throw e;
    }
  } catch (error) {
    // If decryption fails, return plain text (handles pre-migration values)
    return encryptedText;
  }
}
