import {
  CCAVENUE_API_BASE_URL,
  CCAVENUE_CHECKOUT_URL,
  CCAVENUE_SANDBOX_API_BASE_URL,
  CCAVENUE_SANDBOX_CHECKOUT_URL,
} from '../../constants/gateway.constants.js';
import { resolveTimeout } from '../../http/timeout.js';
import { assertConfig, assertNonEmptyString } from '../../utils/validation.js';
import type { CCAvenueConfig } from './ccavenue.types.js';

export interface ResolvedCCAvenueConfig {
  merchantId: string;
  accessCode: string;
  workingKey: string;
  redirectUrl: string | undefined;
  cancelUrl: string | undefined;
  language: string;
  baseUrl: string;
  checkoutUrl: string;
  timeout: number;
  retries: number | undefined;
}

export function resolveConfig(config: CCAvenueConfig): ResolvedCCAvenueConfig {
  assertConfig(config);
  assertNonEmptyString(config.merchantId, 'config.merchantId');
  assertNonEmptyString(config.accessCode, 'config.accessCode');
  assertNonEmptyString(config.workingKey, 'config.workingKey');
  const sandbox = config.sandbox === true;
  const defaultBase = sandbox ? CCAVENUE_SANDBOX_API_BASE_URL : CCAVENUE_API_BASE_URL;
  return {
    merchantId: config.merchantId,
    accessCode: config.accessCode,
    workingKey: config.workingKey,
    redirectUrl: config.redirectUrl,
    cancelUrl: config.cancelUrl,
    language: config.language ?? 'EN',
    baseUrl: (config.baseUrl ?? defaultBase).replace(/\/+$/, ''),
    checkoutUrl: sandbox ? CCAVENUE_SANDBOX_CHECKOUT_URL : CCAVENUE_CHECKOUT_URL,
    timeout: resolveTimeout(config.timeout),
    retries: config.retries,
  };
}
