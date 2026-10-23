export class HttpError extends Error {
  /** HTTP status, or 0 when no response was received (network failure, timeout). */
  readonly status: number;
  readonly data: unknown;
  readonly code: string | undefined;

  constructor(message: string, status: number, data?: unknown, code?: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.data = data;
    this.code = code;
  }
}
