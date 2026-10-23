export type Notes = Record<string, string | number>;

export interface CreateOrderParams {
  /** Sent to the gateway as-is. */
  amount: number;
  currency: string;
  receipt?: string | undefined;
  notes?: Notes | undefined;
  partialPayment?: boolean | undefined;
  /** CCAvenue only: URL the customer is redirected to after payment; defaults to `config.redirectUrl`. */
  callbackUrl?: string | undefined;
  /** CCAvenue only: URL for cancelled payments; defaults to `config.cancelUrl`. */
  cancelUrl?: string | undefined;
}

export interface FetchOrderParams {
  orderId: string;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface FetchPaymentParams {
  paymentId: string;
}

export interface CapturePaymentParams {
  paymentId: string;
  /** Sent as-is. Must match the authorized amount. */
  amount: number;
  currency: string;
}
