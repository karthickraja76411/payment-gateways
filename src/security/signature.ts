import { createHmac, timingSafeEqual } from 'node:crypto';

export function createHmacSignature(payload: string | Uint8Array, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifySignature(payload: string | Uint8Array, signature: string, secret: string): boolean {
  const expected = Buffer.from(createHmacSignature(payload, secret));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
