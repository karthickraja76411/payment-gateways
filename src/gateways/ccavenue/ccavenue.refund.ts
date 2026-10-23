import { randomBytes } from 'node:crypto';
import type { FetchRefundParams, RefundPaymentParams } from '../../interfaces/refund.interface.js';
import type { RefundDetails } from '../../interfaces/response.interface.js';
import { HttpError } from '../../http/http-error.js';
import { assertNonEmptyString, assertPositiveNumber } from '../../utils/validation.js';
import { ccavenueRequest } from './ccavenue.auth.js';
import { toRefund } from './ccavenue.mapper.js';
import { fetchPayment } from './ccavenue.payment.js';
import type { CCAvenueConfig, CCAvenueRefundResponse } from './ccavenue.types.js';

/** `paymentId` is CCAvenue's reference number. `receipt` becomes the unique `refund_ref_no`. */
export async function refundPayment(params: RefundPaymentParams, config: CCAvenueConfig): Promise<RefundDetails> {
  assertNonEmptyString(params.paymentId, 'paymentId');

  let { amount, currency } = params;
  if (amount === undefined || currency === undefined) {
    const payment = await fetchPayment({ paymentId: params.paymentId }, config);
    amount ??= Number(payment.order_amt ?? 0);
    currency ??= payment.order_currncy;
  }
  assertPositiveNumber(amount, 'amount');
  assertNonEmptyString(currency, 'currency');

  const refundId = params.receipt ?? `ref_${randomBytes(12).toString('hex')}`;
  const result = await ccavenueRequest<CCAvenueRefundResponse>(config, {
    command: 'refundOrder',
    payload: { reference_no: params.paymentId, refund_amount: String(amount), refund_ref_no: refundId },
    resultKey: 'Refund_Order_Result',
  });
  if (Number(result.refund_status ?? 1) !== 0) {
    throw new HttpError(`CCAvenue: ${result.reason ?? 'refund failed'}`, 200, result);
  }

  return toRefund(result, {
    refundId,
    paymentId: params.paymentId,
    amount,
    currency,
    receipt: params.receipt,
    notes: params.notes,
  });
}

// CCAvenue exposes no API to look up a single refund by its reference.
export function fetchRefund(params: FetchRefundParams): Promise<RefundDetails> {
  assertNonEmptyString(params.refundId, 'refundId');
  return Promise.reject(new Error('CCAvenue does not support fetching a refund by id'));
}
