import { DEFAULT_RETRIES, RETRYABLE_STATUS_CODES, RETRY_BASE_DELAY_MS } from '../constants/http.constants.js';
import { HttpError } from './http-error.js';
import type { HttpMethod } from './http-request.js';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export function resolveRetries(retries: number | undefined, method: HttpMethod): number {
  if (retries === undefined) return method === 'GET' ? DEFAULT_RETRIES : 0;
  if (!Number.isInteger(retries) || retries < 0) {
    throw new RangeError('retries must be a non-negative integer');
  }
  return retries;
}

export function isRetryableError(error: unknown): boolean {
  return error instanceof HttpError && (error.status === 0 || RETRYABLE_STATUS_CODES.has(error.status));
}

export async function withRetry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries || !isRetryableError(error)) throw error;
      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
    }
  }
}
