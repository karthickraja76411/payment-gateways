import { DEFAULT_TIMEOUT_MS } from '../constants/http.constants.js';

export function resolveTimeout(timeout?: number): number {
  if (timeout === undefined) return DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new RangeError('timeout must be a positive number of milliseconds');
  }
  return timeout;
}
