export function bodyToString(body: string | Uint8Array): string {
  return typeof body === 'string' ? body : Buffer.from(body).toString('utf8');
}
