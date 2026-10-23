import { createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import type { CCAvenueCallbackPayload } from './ccavenue.types.js';

// CCAvenue's scheme: AES-128-CBC, key = MD5(workingKey), fixed IV 0x00..0x0f, hex-encoded output.
const IV = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

const keyFor = (workingKey: string): Buffer => createHash('md5').update(workingKey).digest();

export function encryptPayload(plaintext: string, workingKey: string): string {
  const cipher = createCipheriv('aes-128-cbc', keyFor(workingKey), IV);
  return Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]).toString('hex');
}

export function decryptPayload(hex: string, workingKey: string): string {
  const decipher = createDecipheriv('aes-128-cbc', keyFor(workingKey), IV);
  return Buffer.concat([decipher.update(Buffer.from(hex.trim(), 'hex')), decipher.final()]).toString('utf8');
}

/** Accepts the bare `encResponse` hex or the raw form body (`encResponse=...&...`). Throws if it can't be decrypted. */
export function decryptCallback(input: string, workingKey: string): CCAvenueCallbackPayload {
  const trimmed = input.trim();
  const encResponse = trimmed.includes('=') ? new URLSearchParams(trimmed).get('encResponse') : trimmed;
  if (!encResponse) throw new Error('Missing CCAvenue encResponse');
  const payload = Object.fromEntries(new URLSearchParams(decryptPayload(encResponse, workingKey)));
  if (!payload['order_id']) throw new Error('Malformed CCAvenue response');
  return payload;
}
