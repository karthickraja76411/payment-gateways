import type { VerifyWebhookParams, WebhookEvent } from '../../interfaces/webhook.interface.js';
import { bodyToString } from '../../utils/body.js';
import { resolveConfig } from './ccavenue.config.js';
import { decryptCallback } from './ccavenue.crypto.js';
import { toWebhookEvent } from './ccavenue.mapper.js';
import type { CCAvenueConfig } from './ccavenue.types.js';

/**
 * CCAvenue notifications are not signed; they carry AES-encrypted `encResponse` data. `body` is the raw
 * form body or the bare `encResponse`, and `signature` is unused. Valid means it decrypts with the working key.
 */
export function verifyWebhookSignature(params: VerifyWebhookParams, config: CCAvenueConfig): boolean {
  const { workingKey } = resolveConfig(config);
  try {
    decryptCallback(bodyToString(params.body), workingKey);
    return true;
  } catch {
    return false;
  }
}

export function parseWebhookEvent(params: VerifyWebhookParams, config: CCAvenueConfig): WebhookEvent {
  const { workingKey } = resolveConfig(config);
  try {
    return toWebhookEvent(decryptCallback(bodyToString(params.body), workingKey));
  } catch {
    throw new Error('Invalid CCAvenue webhook payload');
  }
}
