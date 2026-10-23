import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const IV_BYTES = 12;
const TAG_BYTES = 16;

function parseKey(key: string): Buffer {
  const buffer = Buffer.from(key, 'hex');
  if (buffer.length !== 32) throw new RangeError('key must be 32 bytes encoded as 64 hex characters');
  return buffer;
}

/** AES-256-GCM. Output is base64 of iv | authTag | ciphertext. */
export function encrypt(plaintext: string, key: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', parseKey(key), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}

export function decrypt(payload: string, key: string): string {
  const data = Buffer.from(payload, 'base64');
  const iv = data.subarray(0, IV_BYTES);
  const tag = data.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv('aes-256-gcm', parseKey(key), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString('utf8');
}
