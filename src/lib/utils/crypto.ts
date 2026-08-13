import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = crypto
  .createHash('sha256')
  .update(process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET || 'msr-insight-secret-key-default-2026')
  .digest();

/**
 * Encrypts a plain text string (e.g. 4-digit PIN) using AES-256-GCM.
 */
export function encryptText(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an encrypted string back to plain text.
 */
export function decryptText(encryptedHash: string): string {
  if (!encryptedHash || !encryptedHash.includes(':')) return '';
  try {
    const [ivHex, authTagHex, encryptedText] = encryptedHash.split(':');
    if (!ivHex || !authTagHex || !encryptedText) return '';
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[Crypto] Decryption failed:', error);
    return '';
  }
}

/**
 * Decrypts a field string if it is encrypted in 'iv:authTag:ciphertext' format.
 * Returns the plain string as-is if it's not encrypted (for backward compatibility).
 */
export function decryptField(val: string | null | undefined): string {
  if (!val) return '';
  if (typeof val === 'string' && val.includes(':') && val.split(':').length === 3) {
    const decrypted = decryptText(val);
    if (decrypted) return decrypted;
  }
  return val;
}

/**
 * Encrypts an arbitrary JSON object/data structure into an AES-256-GCM encrypted wrapper object.
 */
export function encryptJSON(data: any): { _encrypted: string } {
  if (data === null || data === undefined) return { _encrypted: '' };
  try {
    const jsonString = JSON.stringify(data);
    return { _encrypted: encryptText(jsonString) };
  } catch (err) {
    console.error('[Crypto] JSON encryption failed:', err);
    return { _encrypted: '' };
  }
}

/**
 * Decrypts an encrypted JSON wrapper object back into its original TypeScript data structure.
 * Falls back to returning raw data if it is not encrypted.
 */
export function decryptJSON<T = any>(encryptedObj: any): T {
  if (!encryptedObj) return {} as T;
  if (typeof encryptedObj === 'object' && encryptedObj !== null && '_encrypted' in encryptedObj) {
    const cipherText = encryptedObj._encrypted;
    if (!cipherText) return {} as T;
    const decryptedText = decryptText(cipherText);
    if (!decryptedText) return {} as T;
    try {
      return JSON.parse(decryptedText);
    } catch {
      return {} as T;
    }
  }
  // Backward compatibility for unencrypted legacy JSON fields
  return encryptedObj as T;
}

