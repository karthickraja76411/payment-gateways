export const DEFAULT_TIMEOUT_MS = 30_000;

// Only idempotent requests are retried by default; retrying a POST could duplicate an order or refund.
export const DEFAULT_RETRIES = 2;
export const RETRY_BASE_DELAY_MS = 300;

export const RETRYABLE_STATUS_CODES: ReadonlySet<number> = new Set([408, 429, 500, 502, 503, 504]);
