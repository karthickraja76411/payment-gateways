import { RAZORPAY_API_BASE_URL } from '../../constants/gateway.constants.js';
import { resolveTimeout } from '../../http/timeout.js';
import { assertConfig, assertNonEmptyString } from '../../utils/validation.js';
import type { RazorpayConfig } from './razorpay.types.js';

export interface ResolvedRazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string | undefined;
  baseUrl: string;
  timeout: number;
  retries: number | undefined;
}

export function resolveConfig(config: RazorpayConfig): ResolvedRazorpayConfig {
  assertConfig(config);
  assertNonEmptyString(config.keyId, 'config.keyId');
  assertNonEmptyString(config.keySecret, 'config.keySecret');
  return {
    keyId: config.keyId,
    keySecret: config.keySecret,
    webhookSecret: config.webhookSecret,
    baseUrl: (config.baseUrl ?? RAZORPAY_API_BASE_URL).replace(/\/+$/, ''),
    timeout: resolveTimeout(config.timeout),
    retries: config.retries,
  };
}
