import type { FetchRefundParams, RefundPaymentParams } from '../../interfaces/refund.interface.js';
import { omitUndefined } from '../../utils/object.js';
import { assertNonEmptyString } from '../../utils/validation.js';
import { razorpayRequest } from './razorpay.auth.js';
import type { RazorpayConfig, RazorpayRefundResponse } from './razorpay.types.js';

export function refundPayment(params: RefundPaymentParams, config: RazorpayConfig): Promise<RazorpayRefundResponse> {
  assertNonEmptyString(params.paymentId, 'paymentId');
  const body = omitUndefined({
    amount: params.amount,
    speed: params.speed,
    receipt: params.receipt,
    notes: params.notes,
  });
  return razorpayRequest(config, {
    method: 'POST',
    path: `/payments/${encodeURIComponent(params.paymentId)}/refund`,
    body,
  });
}

export function fetchRefund(params: FetchRefundParams, config: RazorpayConfig): Promise<RazorpayRefundResponse> {
  assertNonEmptyString(params.refundId, 'refundId');
  return razorpayRequest(config, { method: 'GET', path: `/refunds/${encodeURIComponent(params.refundId)}` });
}
