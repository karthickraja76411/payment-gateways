export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  /** Required only for webhook verification. */
  webhookSecret?: string | undefined;
  baseUrl?: string | undefined;
  /** Request timeout in milliseconds. */
  timeout?: number | undefined;
  /** Retries for GET requests; write requests are never retried unless set explicitly. */
  retries?: number | undefined;
}

type RazorpayNotes = Record<string, unknown> | unknown[];

export interface RazorpayOrderResponse {
  id: string;
  entity: 'order';
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string | null;
  status: 'created' | 'attempted' | 'paid';
  attempts: number;
  notes: RazorpayNotes;
  created_at: number;
}

export interface RazorpayPaymentResponse {
  id: string;
  entity: 'payment';
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id: string | null;
  method: string | null;
  amount_refunded: number;
  captured: boolean;
  description: string | null;
  email: string | null;
  contact: string | null;
  error_code: string | null;
  error_description: string | null;
  notes: RazorpayNotes;
  created_at: number;
}

export interface RazorpayRefundResponse {
  id: string;
  entity: 'refund';
  amount: number;
  currency: string;
  payment_id: string;
  receipt: string | null;
  status: 'pending' | 'processed' | 'failed';
  notes: RazorpayNotes;
  created_at: number;
}

export interface RazorpayWebhookPayload {
  entity: 'event';
  account_id?: string;
  event: string;
  created_at: number;
  payload: {
    payment?: { entity: RazorpayPaymentResponse };
    order?: { entity: RazorpayOrderResponse };
    refund?: { entity: RazorpayRefundResponse };
  };
}

export interface RazorpayErrorResponse {
  error: {
    code: string;
    description: string;
    source?: string;
    step?: string;
    reason?: string;
    field?: string;
  };
}
