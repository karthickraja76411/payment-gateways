export interface CCAvenueConfig {
  merchantId: string;
  accessCode: string;
  /** Used for AES encryption of requests and decryption of responses. */
  workingKey: string;
  /** Default URL CCAvenue posts the encrypted response to; can be overridden per order. */
  redirectUrl?: string | undefined;
  /** Default URL for cancelled payments; can be overridden per order. */
  cancelUrl?: string | undefined;
  /** Checkout page language; defaults to EN. */
  language?: string | undefined;
  /** Use CCAvenue's test environment. */
  sandbox?: boolean | undefined;
  /** Overrides the API host (the checkout host is chosen by `sandbox`). */
  baseUrl?: string | undefined;
  /** Request timeout in milliseconds. */
  timeout?: number | undefined;
  /** Retries for GET requests; write requests are never retried unless set explicitly. */
  retries?: number | undefined;
}

/** Returned in `Order.raw` by `createOrder`: POST `encRequest` and `accessCode` to `url` from the browser. */
export interface CCAvenueCheckout {
  url: string;
  encRequest: string;
  accessCode: string;
}

/** Fields of the DoWebTrans orderStatusTracker result that this package reads. */
export interface CCAvenueOrderStatusResponse {
  status?: number | string;
  error_code?: string;
  error_desc?: string;
  reference_no?: string;
  order_no?: string;
  order_currncy?: string;
  order_amt?: string | number;
  order_date_time?: string;
  order_status?: string;
  order_bank_ref_no?: string;
  order_bank_response?: string;
  order_card_name?: string;
  order_bill_email?: string;
  order_bill_tel?: string;
  order_notes?: string;
  [key: string]: unknown;
}

export interface CCAvenueRefundResponse {
  refund_status?: number | string;
  reason?: string;
  [key: string]: unknown;
}

export interface CCAvenueConfirmResponse {
  success_count?: number;
  failed_count?: number;
  failed_List?: unknown[];
  [key: string]: unknown;
}

/** Decrypted `encResponse` posted to the redirect URL (and to the webhook URL). */
export interface CCAvenueCallbackPayload {
  order_id?: string;
  tracking_id?: string;
  bank_ref_no?: string;
  order_status?: string;
  failure_message?: string;
  payment_mode?: string;
  card_name?: string;
  status_code?: string;
  status_message?: string;
  currency?: string;
  amount?: string;
  billing_email?: string;
  billing_tel?: string;
  merchant_param1?: string;
  merchant_param2?: string;
  merchant_param3?: string;
  merchant_param4?: string;
  merchant_param5?: string;
  trans_date?: string;
  [key: string]: string | undefined;
}
