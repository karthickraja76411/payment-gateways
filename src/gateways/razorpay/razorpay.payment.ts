import { verifySignature } from '../../security/signature.js';
import type {
  CapturePaymentParams,
  CreateOrderParams,
  FetchOrderParams,
  FetchPaymentParams,
  VerifyPaymentParams,
} from '../../interfaces/payment.interface.js';
import { omitUndefined } from '../../utils/object.js';
import { assertNonEmptyString, assertPositiveNumber } from '../../utils/validation.js';
import { razorpayRequest } from './razorpay.auth.js';
import { resolveConfig } from './razorpay.config.js';
import type { RazorpayConfig, RazorpayOrderResponse, RazorpayPaymentResponse } from './razorpay.types.js';

export function createOrder(params: CreateOrderParams, config: RazorpayConfig): Promise<RazorpayOrderResponse> {
  assertPositiveNumber(params.amount, 'amount');
  assertNonEmptyString(params.currency, 'currency');
  const body = omitUndefined({
    amount: params.amount,
    currency: params.currency,
    receipt: params.receipt,
    notes: params.notes,
    partial_payment: params.partialPayment,
  });
  return razorpayRequest(config, { method: 'POST', path: '/orders', body });
}

export function fetchOrder(params: FetchOrderParams, config: RazorpayConfig): Promise<RazorpayOrderResponse> {
  assertNonEmptyString(params.orderId, 'orderId');
  return razorpayRequest(config, { method: 'GET', path: `/orders/${encodeURIComponent(params.orderId)}` });
}

export function fetchPayment(params: FetchPaymentParams, config: RazorpayConfig): Promise<RazorpayPaymentResponse> {
  assertNonEmptyString(params.paymentId, 'paymentId');
  return razorpayRequest(config, { method: 'GET', path: `/payments/${encodeURIComponent(params.paymentId)}` });
}

export function capturePayment(params: CapturePaymentParams, config: RazorpayConfig): Promise<RazorpayPaymentResponse> {
  assertNonEmptyString(params.paymentId, 'paymentId');
  assertPositiveNumber(params.amount, 'amount');
  assertNonEmptyString(params.currency, 'currency');
  return razorpayRequest(config, {
    method: 'POST',
    path: `/payments/${encodeURIComponent(params.paymentId)}/capture`,
    body: { amount: params.amount, currency: params.currency },
  });
}

/** Checks the checkout callback: HMAC-SHA256 of "orderId|paymentId" with the key secret. */
export function verifyPaymentSignature(params: VerifyPaymentParams, config: RazorpayConfig): boolean {
  assertNonEmptyString(params.orderId, 'orderId');
  assertNonEmptyString(params.paymentId, 'paymentId');
  assertNonEmptyString(params.signature, 'signature');
  const { keySecret } = resolveConfig(config);
  return verifySignature(`${params.orderId}|${params.paymentId}`, params.signature, keySecret);
}
