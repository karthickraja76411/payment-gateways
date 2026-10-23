import type { OrderStatus, PaymentStatus, RefundStatus } from './response.interface.js';

export type PaymentOperation =
  | 'create_order'
  | 'fetch_order'
  | 'verify_payment'
  | 'fetch_payment'
  | 'capture_payment'
  | 'refund_payment'
  | 'fetch_refund'
  | 'verify_webhook'
  | 'parse_webhook';

export type TraceStatus = 'success' | 'failure';

/** When set on a request, a `PaymentLogEvent` is POSTed to `url` after the call finishes (success or failure). */
export interface LoggerConfig {
  url: string;
  headers?: Record<string, string> | undefined;
  /** Signs the body with HMAC-SHA256 (hex) in the `X-Payment-Gateway-Signature` header. */
  secret?: string | undefined;
  /** Delivery timeout in milliseconds; defaults to 5000. */
  timeout?: number | undefined;
  /** Await delivery before an async call resolves. Delivery failures never affect the payment call. */
  wait?: boolean | undefined;
}

export type PaymentLogErrorCode =
  | 'GATEWAY_HTTP_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'VALIDATION_ERROR'
  | 'SIGNATURE_MISMATCH'
  | 'PAYMENT_FAILED'
  | 'UNKNOWN_ERROR';

export interface PaymentLogError {
  code: PaymentLogErrorCode;
  name: string;
  message: string;
  /** HTTP status from the gateway; 0 when no response was received. */
  httpStatus: number | null;
  /** The gateway's own error code, when it reports one. */
  gatewayCode: string | null;
  details: unknown;
}

export interface PaymentLogEvent {
  /** Unique per event; use it to de-duplicate deliveries. */
  id: string;
  /** `<operation>.<status>`, e.g. `create_order.success`. */
  event: string;
  operation: PaymentOperation;
  status: TraceStatus;
  gateway: string;
  /** ISO-8601 time the call finished. */
  timestamp: string;
  durationMs: number;
  /** Status of the order, payment or refund as reported by the gateway. */
  paymentStatus: OrderStatus | PaymentStatus | RefundStatus | null;
  references: { orderId: string | null; paymentId: string | null; refundId: string | null };
  /** Request params with credentials, signatures and webhook bodies removed. */
  request: Record<string, unknown>;
  /** Summary of the result; the gateway's raw payload is never included. */
  response: Record<string, unknown> | null;
  error: PaymentLogError | null;
}
