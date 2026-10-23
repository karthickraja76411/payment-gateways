import type { Notes } from '../../interfaces/payment.interface.js';
import type {
  Order,
  OrderStatus,
  PaymentDetails,
  PaymentStatus,
  RefundDetails,
} from '../../interfaces/response.interface.js';
import type { WebhookEvent } from '../../interfaces/webhook.interface.js';
import { nonEmptyString as text } from '../../utils/object.js';
import type { CCAvenueCallbackPayload, CCAvenueOrderStatusResponse } from './ccavenue.types.js';

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

// CCAvenue timestamps carry no zone; the platform runs on Indian Standard Time.
const IST = '+05:30';

export function toDate(value: unknown): Date {
  if (typeof value !== 'string') return new Date(Number.NaN);
  const iso = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(value);
  if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T${iso[4]}:${iso[5]}:${iso[6]}${IST}`);
  const dmy = /^(\d{2})[-/](\d{2})[-/](\d{4})[ T](\d{2}):(\d{2}):(\d{2})/.exec(value);
  if (dmy) return new Date(`${dmy[3]}-${dmy[2]}-${dmy[1]}T${dmy[4]}:${dmy[5]}:${dmy[6]}${IST}`);
  return new Date(value);
}

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------

const CAPTURED = new Set(['Successful', 'Shipped', 'Success']);
const FAILED = new Set(['Unsuccessful', 'Aborted', 'Invalid', 'Timeout', 'Cancelled', 'Auto-Cancelled', 'Failure']);
const REFUNDED = new Set(['Refunded', 'Auto-Reversed']);

export function toPaymentStatus(status: string | undefined): PaymentStatus {
  if (!status) return 'created';
  if (CAPTURED.has(status)) return 'captured';
  if (FAILED.has(status)) return 'failed';
  if (REFUNDED.has(status)) return 'refunded';
  if (status === 'Authorized') return 'authorized';
  return 'created';
}

export function toOrderStatus(status: string | undefined): OrderStatus {
  const payment = toPaymentStatus(status);
  if (payment === 'captured' || payment === 'refunded') return 'paid';
  if (payment === 'created' && status !== 'Awaited') return 'created';
  return 'attempted';
}

/** A paid order has nothing due; any other status owes the full amount. */
function orderAmounts(amount: number, status: OrderStatus) {
  const paid = status === 'paid';
  return { amount, amountPaid: paid ? amount : 0, amountDue: paid ? 0 : amount };
}

// ---------------------------------------------------------------------------
// DoWebTrans (orderStatusTracker) -> models
// ---------------------------------------------------------------------------

export function toOrder(raw: CCAvenueOrderStatusResponse): Order {
  const status = toOrderStatus(raw.order_status);
  return {
    id: String(raw.order_no ?? ''),
    ...orderAmounts(Number(raw.order_amt ?? 0), status),
    currency: raw.order_currncy ?? '',
    receipt: null,
    status,
    attempts: status === 'created' ? 0 : 1,
    notes: {},
    createdAt: toDate(raw.order_date_time),
    raw,
  };
}

export function toPayment(raw: CCAvenueOrderStatusResponse): PaymentDetails {
  const amount = Number(raw.order_amt ?? 0);
  const status = toPaymentStatus(raw.order_status);
  const failed = status === 'failed';
  return {
    id: String(raw.reference_no ?? ''),
    orderId: text(raw.order_no),
    amount,
    amountRefunded: status === 'refunded' ? amount : 0,
    currency: raw.order_currncy ?? '',
    status,
    method: text(raw.order_option_type) ?? text(raw.order_card_name),
    captured: status === 'captured',
    email: text(raw.order_bill_email),
    contact: text(raw.order_bill_tel),
    description: null,
    errorCode: failed ? text(raw.error_code) : null,
    errorDescription: failed ? text(raw.order_bank_response) : null,
    notes: {},
    createdAt: toDate(raw.order_date_time),
    raw,
  };
}

// ---------------------------------------------------------------------------
// Refund (built from the request context; CCAvenue returns no refund entity)
// ---------------------------------------------------------------------------

export interface RefundContext {
  refundId: string;
  paymentId: string;
  amount: number;
  currency: string;
  receipt: string | undefined;
  notes: Notes | undefined;
}

export function toRefund(raw: unknown, ctx: RefundContext): RefundDetails {
  return {
    id: ctx.refundId,
    paymentId: ctx.paymentId,
    amount: ctx.amount,
    currency: ctx.currency,
    status: 'processed',
    receipt: ctx.receipt ?? null,
    notes: { ...ctx.notes },
    createdAt: new Date(),
    raw,
  };
}

// ---------------------------------------------------------------------------
// Callback / webhook (decrypted encResponse) -> models
// ---------------------------------------------------------------------------

function callbackNotes(raw: CCAvenueCallbackPayload): Record<string, unknown> {
  const notes: Record<string, unknown> = {};
  for (let i = 1; i <= 5; i++) {
    const value = raw[`merchant_param${i}`];
    if (value) notes[`merchant_param${i}`] = value;
  }
  return notes;
}

export function callbackToPayment(raw: CCAvenueCallbackPayload): PaymentDetails {
  const status = toPaymentStatus(raw.order_status);
  const failed = status === 'failed';
  return {
    id: raw.tracking_id ?? '',
    orderId: text(raw.order_id),
    amount: Number(raw.amount ?? 0),
    amountRefunded: 0,
    currency: raw.currency ?? '',
    status,
    method: text(raw.payment_mode),
    captured: status === 'captured',
    email: text(raw.billing_email),
    contact: text(raw.billing_tel),
    description: null,
    errorCode: failed ? text(raw.status_code) : null,
    errorDescription: failed ? text(raw.failure_message) ?? text(raw.status_message) : null,
    notes: callbackNotes(raw),
    createdAt: toDate(raw.trans_date),
    raw,
  };
}

export function callbackToOrder(raw: CCAvenueCallbackPayload): Order {
  const status = toOrderStatus(raw.order_status);
  return {
    id: raw.order_id ?? '',
    ...orderAmounts(Number(raw.amount ?? 0), status),
    currency: raw.currency ?? '',
    receipt: null,
    status,
    attempts: 1,
    notes: callbackNotes(raw),
    createdAt: toDate(raw.trans_date),
    raw,
  };
}

export function toWebhookEvent(raw: CCAvenueCallbackPayload): WebhookEvent {
  const payment = callbackToPayment(raw);
  return {
    event: `payment.${payment.status}`,
    accountId: null,
    createdAt: payment.createdAt,
    payment,
    order: callbackToOrder(raw),
    raw,
  };
}
