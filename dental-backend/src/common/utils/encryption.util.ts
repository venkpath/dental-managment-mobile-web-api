import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ENCODING = 'base64' as const;
const PREFIX = 'enc:';

/**
 * Returns the 32-byte encryption key derived from the environment variable.
 * Falls back to a development-only deterministic key if not set.
 */
function getKey(): Buffer {
  const envKey = process.env['ENCRYPTION_KEY'];
  if (envKey) {
    // If the key is hex-encoded (64 chars), decode it; otherwise use as-is and hash
    const buf = Buffer.from(envKey, 'hex');
    if (buf.length === 32) return buf;
    // Fallback: SHA-256 hash of the key string to get 32 bytes
    const { createHash } = require('crypto') as typeof import('crypto');
    return createHash('sha256').update(envKey).digest();
  }
  // Development-only fallback — NOT secure for production
  const { createHash } = require('crypto') as typeof import('crypto');
  return createHash('sha256').update('development-only-key-change-in-prod').digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a prefixed base64 string: "enc:<iv>:<authTag>:<ciphertext>"
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted.toString(ENCODING)}`;
}

/**
 * Decrypt a string previously encrypted with `encrypt()`.
 * If the value is not encrypted (no "enc:" prefix), returns it as-is (backward compatible).
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext.startsWith(PREFIX)) {
    // Not encrypted — return as-is for backward compatibility with existing tokens
    return ciphertext;
  }

  const parts = ciphertext.slice(PREFIX.length).split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }

  const [ivStr, authTagStr, encryptedStr] = parts;
  const key = getKey();
  const iv = Buffer.from(ivStr, ENCODING);
  const authTag = Buffer.from(authTagStr, ENCODING);
  const encrypted = Buffer.from(encryptedStr, ENCODING);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
