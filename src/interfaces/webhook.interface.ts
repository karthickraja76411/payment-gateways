import type { Order, PaymentDetails, RefundDetails } from './response.interface.js';

export interface VerifyWebhookParams {
  /** The raw, unparsed request body exactly as received. */
  body: string | Uint8Array;
  /** Value of the X-Razorpay-Signature header. */
  signature: string;
}

export interface WebhookEvent {
  event: string;
  accountId: string | null;
  createdAt: Date;
  payment?: PaymentDetails;
  order?: Order;
  refund?: RefundDetails;
  raw: unknown;
}
