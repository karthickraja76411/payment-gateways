import type { Notes } from './payment.interface.js';

export interface RefundPaymentParams {
  paymentId: string;
  /** Sent as-is. Omit for a full refund. */
  amount?: number | undefined;
  /** CCAvenue only: looked up from the payment when omitted. */
  currency?: string | undefined;
  speed?: 'normal' | 'optimum' | undefined;
  receipt?: string | undefined;
  notes?: Notes | undefined;
}

export interface FetchRefundParams {
  refundId: string;
}
