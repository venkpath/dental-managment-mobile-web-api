"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = require("crypto");
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ENCODING = 'base64';
const PREFIX = 'enc:';
function getKey() {
    const envKey = process.env['ENCRYPTION_KEY'];
    if (envKey) {
        const buf = Buffer.from(envKey, 'hex');
        if (buf.length === 32)
            return buf;
        const { createHash } = require('crypto');
        return createHash('sha256').update(envKey).digest();
    }
    const { createHash } = require('crypto');
    return createHash('sha256').update('development-only-key-change-in-prod').digest();
}
function encrypt(plaintext) {
    const key = getKey();
    const iv = (0, crypto_1.randomBytes)(IV_LENGTH);
    const cipher = (0, crypto_1.createCipheriv)(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${PREFIX}${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted.toString(ENCODING)}`;
}
function decrypt(ciphertext) {
    if (!ciphertext.startsWith(PREFIX)) {
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
    const decipher = (0, crypto_1.createDecipheriv)(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
}
//# sourceMappingURL=encryption.util.js.map