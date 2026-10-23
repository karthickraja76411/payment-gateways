import type { VerifyWebhookParams, WebhookEvent } from '../../interfaces/webhook.interface.js';
import { verifySignature } from '../../security/signature.js';
import { bodyToString } from '../../utils/body.js';
import { isRecord } from '../../utils/object.js';
import { assertNonEmptyString } from '../../utils/validation.js';
import { resolveConfig } from './razorpay.config.js';
import { toWebhookEvent } from './razorpay.mapper.js';
import type { RazorpayConfig, RazorpayWebhookPayload } from './razorpay.types.js';

/** Checks X-Razorpay-Signature: HMAC-SHA256 of the raw body with the webhook secret. */
export function verifyWebhookSignature(params: VerifyWebhookParams, config: RazorpayConfig): boolean {
  assertNonEmptyString(params.signature, 'signature');
  const { webhookSecret } = resolveConfig(config);
  assertNonEmptyString(webhookSecret, 'config.webhookSecret');
  return verifySignature(params.body, params.signature, webhookSecret);
}

export function parseWebhookEvent(params: VerifyWebhookParams, config: RazorpayConfig): WebhookEvent {
  if (!verifyWebhookSignature(params, config)) {
    throw new Error('Invalid Razorpay webhook signature');
  }
  const parsed: unknown = JSON.parse(bodyToString(params.body));
  if (!isRecord(parsed) || typeof parsed['event'] !== 'string') {
    throw new Error('Malformed Razorpay webhook payload');
  }
  return toWebhookEvent(parsed as unknown as RazorpayWebhookPayload);
}
