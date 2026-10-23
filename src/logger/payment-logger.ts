import { randomUUID } from 'node:crypto';
import { HttpClient } from '../http/http-client.js';
import { HttpError } from '../http/http-error.js';
import type {
  LoggerConfig,
  PaymentLogError,
  PaymentLogEvent,
  PaymentOperation,
} from '../interfaces/logger.interface.js';
import { createHmacSignature } from '../security/signature.js';
import { isRecord } from '../utils/object.js';

const DEFAULT_LOGGER_TIMEOUT_MS = 5_000;
const SENSITIVE_KEY = /secret|password|passwd|token|signature|authorization|api[-_]?key|card|cvv|pin$/i;
const REDACTED = '[REDACTED]';
const MAX_DEPTH = 5;
const EXCLUDED_PARAMS = new Set(['config', 'logger', 'gateway_type', 'signature', 'body']);

const http = new HttpClient();

interface TraceContext {
  operation: PaymentOperation;
  gateway: string;
  logger: LoggerConfig | undefined;
  params: Record<string, unknown>;
}

/** Runs `fn`, reports the outcome to the logger webhook, and returns or rethrows exactly what `fn` did. */
export function trace<T>(ctx: TraceContext, fn: () => Promise<T>): Promise<T>;
export function trace<T>(ctx: TraceContext, fn: () => T): T;
export function trace<T>(ctx: TraceContext, fn: () => T | Promise<T>): T | Promise<T> {
  const startedAt = Date.now();
  const finish = (result: { value: T } | { error: unknown }): Promise<void> => {
    if (!ctx.logger) return Promise.resolve();
    return deliver(ctx.logger, buildEvent(ctx, Date.now() - startedAt, result));
  };

  let outcome: T | Promise<T>;
  try {
    outcome = fn();
  } catch (error) {
    void finish({ error });
    throw error;
  }

  if (!(outcome instanceof Promise)) {
    void finish({ value: outcome });
    return outcome;
  }

  return outcome.then(
    async (value) => {
      const delivery = finish({ value });
      if (ctx.logger?.wait) await delivery;
      return value;
    },
    async (error: unknown) => {
      const delivery = finish({ error });
      if (ctx.logger?.wait) await delivery;
      throw error;
    },
  );
}

function buildEvent(ctx: TraceContext, durationMs: number, result: { value: unknown } | { error: unknown }): PaymentLogEvent {
  const failed = 'error' in result;
  const outcome = failed ? null : summarize(ctx.operation, result.value);
  const error = failed ? toLogError(result.error) : outcome?.error ?? null;
  const status = failed || outcome?.verified === false ? 'failure' : 'success';

  return {
    id: randomUUID(),
    event: `${ctx.operation}.${status}`,
    operation: ctx.operation,
    status,
    gateway: ctx.gateway,
    timestamp: new Date().toISOString(),
    durationMs,
    paymentStatus: outcome?.paymentStatus ?? null,
    references: {
      orderId: outcome?.references.orderId ?? stringParam(ctx.params, 'orderId'),
      paymentId: outcome?.references.paymentId ?? stringParam(ctx.params, 'paymentId'),
      refundId: outcome?.references.refundId ?? stringParam(ctx.params, 'refundId'),
    },
    request: sanitizeParams(ctx.params),
    response: outcome?.response ?? null,
    error: outcome?.verified === false ? signatureMismatch() : error,
  };
}

interface Summary {
  response: Record<string, unknown>;
  paymentStatus: PaymentLogEvent['paymentStatus'];
  references: Partial<PaymentLogEvent['references']>;
  error?: PaymentLogError;
  /** Set by boolean verification operations. */
  verified?: boolean;
}

function summarize(operation: PaymentOperation, value: unknown): Summary {
  if (typeof value === 'boolean') {
    return { response: { verified: value }, paymentStatus: null, references: {}, verified: value };
  }
  if (!isRecord(value)) return { response: {}, paymentStatus: null, references: {} };

  switch (operation) {
    case 'create_order':
    case 'fetch_order':
      return {
        response: pick(value, ['id', 'amount', 'amountPaid', 'amountDue', 'currency', 'receipt', 'status', 'attempts']),
        paymentStatus: value.status as Summary['paymentStatus'],
        references: { orderId: str(value.id) },
      };
    case 'fetch_payment':
    case 'capture_payment': {
      const failedPayment = value.status === 'failed';
      return {
        response: pick(value, [
          'id', 'orderId', 'amount', 'amountRefunded', 'currency', 'status', 'method', 'captured', 'errorCode', 'errorDescription',
        ]),
        paymentStatus: value.status as Summary['paymentStatus'],
        references: { paymentId: str(value.id), orderId: str(value.orderId) },
        ...(failedPayment && {
          error: {
            code: 'PAYMENT_FAILED' as const,
            name: 'PaymentFailed',
            message: str(value.errorDescription) ?? 'Payment failed',
            httpStatus: null,
            gatewayCode: str(value.errorCode),
            details: null,
          },
        }),
      };
    }
    case 'refund_payment':
    case 'fetch_refund':
      return {
        response: pick(value, ['id', 'paymentId', 'amount', 'currency', 'receipt', 'status']),
        paymentStatus: value.status as Summary['paymentStatus'],
        references: { refundId: str(value.id), paymentId: str(value.paymentId) },
      };
    case 'parse_webhook': {
      const payment = isRecord(value.payment) ? value.payment : undefined;
      const order = isRecord(value.order) ? value.order : undefined;
      const refund = isRecord(value.refund) ? value.refund : undefined;
      return {
        response: pick(value, ['event', 'accountId']),
        paymentStatus: (payment?.status ?? refund?.status ?? order?.status ?? null) as Summary['paymentStatus'],
        references: {
          paymentId: str(payment?.id) ?? str(refund?.paymentId),
          orderId: str(order?.id) ?? str(payment?.orderId),
          refundId: str(refund?.id),
        },
      };
    }
    default:
      return { response: {}, paymentStatus: null, references: {} };
  }
}

function signatureMismatch(): PaymentLogError {
  return {
    code: 'SIGNATURE_MISMATCH',
    name: 'SignatureMismatch',
    message: 'Signature verification failed',
    httpStatus: null,
    gatewayCode: null,
    details: null,
  };
}

function toLogError(error: unknown): PaymentLogError {
  if (error instanceof HttpError) {
    const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
    return {
      code: timedOut ? 'TIMEOUT' : error.status === 0 ? 'NETWORK_ERROR' : 'GATEWAY_HTTP_ERROR',
      name: error.name,
      message: error.message,
      httpStatus: error.status,
      gatewayCode: error.code ?? gatewayErrorCode(error.data),
      details: redact(error.data, 0),
    };
  }
  if (error instanceof Error) {
    const validation = error instanceof TypeError || error instanceof RangeError || /Unsupported/.test(error.message);
    const signature = /signature/i.test(error.message);
    return {
      code: validation ? 'VALIDATION_ERROR' : signature ? 'SIGNATURE_MISMATCH' : 'UNKNOWN_ERROR',
      name: error.name,
      message: error.message,
      httpStatus: null,
      gatewayCode: null,
      details: null,
    };
  }
  return { code: 'UNKNOWN_ERROR', name: 'UnknownError', message: String(error), httpStatus: null, gatewayCode: null, details: null };
}

function gatewayErrorCode(data: unknown): string | null {
  if (!isRecord(data)) return null;
  const nested = isRecord(data.error) ? data.error.code : undefined;
  return str(nested) ?? str(data.error_code);
}

function sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
  const entries = Object.entries(params).filter(([key, value]) => !EXCLUDED_PARAMS.has(key) && value !== undefined);
  return redact(Object.fromEntries(entries), 0) as Record<string, unknown>;
}

function redact(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return '[TRUNCATED]';
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? REDACTED : redact(item, depth + 1)]),
  );
}

function pick(source: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(keys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function stringParam(params: Record<string, unknown>, key: string): string | null {
  return str(params[key]);
}

/** Never throws: a failing logger must not break or alter a payment call. */
async function deliver(logger: LoggerConfig, event: PaymentLogEvent): Promise<void> {
  try {
    const body = JSON.stringify(event);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Payment-Gateway-Event': event.event,
      'X-Payment-Gateway-Event-Id': event.id,
      ...logger.headers,
    };
    if (logger.secret) headers['X-Payment-Gateway-Signature'] = createHmacSignature(body, logger.secret);
    await http.request({
      method: 'POST',
      url: logger.url,
      headers,
      body,
      timeout: logger.timeout ?? DEFAULT_LOGGER_TIMEOUT_MS,
      retries: 0,
    });
  } catch {
    // Intentionally swallowed.
  }
}
