import { HttpError } from '../../http/http-error.js';
import type { Order, PaymentDetails, RefundDetails } from '../../interfaces/response.interface.js';
import type { WebhookEvent } from '../../interfaces/webhook.interface.js';
import { isRecord } from '../../utils/object.js';
import type {
  RazorpayOrderResponse,
  RazorpayPaymentResponse,
  RazorpayRefundResponse,
  RazorpayWebhookPayload,
} from './razorpay.types.js';

const toDate = (seconds: number): Date => new Date(seconds * 1000);
// Razorpay returns [] instead of {} when there are no notes.
const toNotes = (notes: unknown): Record<string, unknown> => (isRecord(notes) ? notes : {});

export function toOrder(raw: RazorpayOrderResponse): Order {
  const { currency } = raw;
  return {
    id: raw.id,
    amount: raw.amount,
    amountPaid: raw.amount_paid,
    amountDue: raw.amount_due,
    currency,
    receipt: raw.receipt ?? null,
    status: raw.status,
    attempts: raw.attempts,
    notes: toNotes(raw.notes),
    createdAt: toDate(raw.created_at),
    raw,
  };
}

export function toPayment(raw: RazorpayPaymentResponse): PaymentDetails {
  const { currency } = raw;
  return {
    id: raw.id,
    orderId: raw.order_id ?? null,
    amount: raw.amount,
    amountRefunded: raw.amount_refunded ?? 0,
    currency,
    status: raw.status,
    method: raw.method ?? null,
    captured: raw.captured,
    email: raw.email ?? null,
    contact: raw.contact ?? null,
    description: raw.description ?? null,
    errorCode: raw.error_code ?? null,
    errorDescription: raw.error_description ?? null,
    notes: toNotes(raw.notes),
    createdAt: toDate(raw.created_at),
    raw,
  };
}

export function toRefund(raw: RazorpayRefundResponse): RefundDetails {
  return {
    id: raw.id,
    paymentId: raw.payment_id,
    amount: raw.amount,
    currency: raw.currency,
    status: raw.status,
    receipt: raw.receipt ?? null,
    notes: toNotes(raw.notes),
    createdAt: toDate(raw.created_at),
    raw,
  };
}

export function toWebhookEvent(raw: RazorpayWebhookPayload): WebhookEvent {
  const { payment, order, refund } = raw.payload ?? {};
  return {
    event: raw.event,
    accountId: raw.account_id ?? null,
    createdAt: toDate(raw.created_at),
    ...(payment && { payment: toPayment(payment.entity) }),
    ...(order && { order: toOrder(order.entity) }),
    ...(refund && { refund: toRefund(refund.entity) }),
    raw,
  };
}

/** Replaces the generic HTTP error with Razorpay's error code and description when present. */
export function toGatewayError(error: unknown): unknown {
  if (!(error instanceof HttpError) || !isRecord(error.data) || !isRecord(error.data['error'])) return error;
  const { code, description } = error.data['error'];
  if (typeof description !== 'string') return error;
  return new HttpError(`Razorpay: ${description}`, error.status, error.data, typeof code === 'string' ? code : undefined);
}
