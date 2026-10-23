import { randomBytes } from 'node:crypto';
import type {
  CapturePaymentParams,
  CreateOrderParams,
  FetchOrderParams,
  FetchPaymentParams,
  VerifyPaymentParams,
} from '../../interfaces/payment.interface.js';
import type { Order } from '../../interfaces/response.interface.js';
import { assertNonEmptyString, assertPositiveNumber } from '../../utils/validation.js';
import { ccavenueRequest } from './ccavenue.auth.js';
import { resolveConfig } from './ccavenue.config.js';
import { decryptCallback, encryptPayload } from './ccavenue.crypto.js';
import type {
  CCAvenueCheckout,
  CCAvenueConfig,
  CCAvenueConfirmResponse,
  CCAvenueOrderStatusResponse,
} from './ccavenue.types.js';

const MAX_MERCHANT_PARAMS = 5;

/**
 * CCAvenue has no server-side order creation: this builds the encrypted checkout request.
 * POST `raw.encRequest` and `raw.accessCode` to `raw.url` from the customer's browser.
 */
export function createOrder(params: CreateOrderParams, config: CCAvenueConfig): Order {
  assertPositiveNumber(params.amount, 'amount');
  const resolved = resolveConfig(config);
  const { currency } = params;
  assertNonEmptyString(currency, 'currency');

  const redirectUrl = params.callbackUrl ?? resolved.redirectUrl;
  assertNonEmptyString(redirectUrl, 'callbackUrl or config.redirectUrl');
  const cancelUrl = params.cancelUrl ?? resolved.cancelUrl ?? redirectUrl;

  const orderId = params.receipt ?? `ord_${randomBytes(12).toString('hex')}`;
  assertNonEmptyString(orderId, 'receipt');

  const fields: Record<string, string> = {
    merchant_id: resolved.merchantId,
    order_id: orderId,
    currency,
    amount: String(params.amount),
    redirect_url: redirectUrl,
    cancel_url: cancelUrl,
    language: resolved.language,
  };
  const notes = Object.entries(params.notes ?? {});
  if (notes.length > MAX_MERCHANT_PARAMS) {
    throw new RangeError(`CCAvenue supports at most ${MAX_MERCHANT_PARAMS} notes (merchant_param1-${MAX_MERCHANT_PARAMS})`);
  }
  notes.forEach(([, value], index) => {
    fields[`merchant_param${index + 1}`] = String(value);
  });

  const merchantData = Object.entries(fields)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  const checkout: CCAvenueCheckout = {
    url: resolved.checkoutUrl,
    encRequest: encryptPayload(merchantData, resolved.workingKey),
    accessCode: resolved.accessCode,
  };

  return {
    id: orderId,
    amount: params.amount,
    amountPaid: 0,
    amountDue: params.amount,
    currency,
    receipt: params.receipt ?? null,
    status: 'created',
    attempts: 0,
    notes: { ...params.notes },
    createdAt: new Date(),
    raw: checkout,
  };
}

function orderStatus(payload: Record<string, string>, config: CCAvenueConfig): Promise<CCAvenueOrderStatusResponse> {
  return ccavenueRequest(config, { command: 'orderStatusTracker', payload, resultKey: 'Order_Status_Result' });
}

export function fetchOrder(params: FetchOrderParams, config: CCAvenueConfig): Promise<CCAvenueOrderStatusResponse> {
  assertNonEmptyString(params.orderId, 'orderId');
  return orderStatus({ order_no: params.orderId }, config);
}

/** `paymentId` is CCAvenue's reference number (the `tracking_id` in the callback). */
export function fetchPayment(params: FetchPaymentParams, config: CCAvenueConfig): Promise<CCAvenueOrderStatusResponse> {
  assertNonEmptyString(params.paymentId, 'paymentId');
  return orderStatus({ reference_no: params.paymentId }, config);
}

/** Confirms (captures) a pre-authorized order, then returns its refreshed status. */
export async function capturePayment(params: CapturePaymentParams, config: CCAvenueConfig): Promise<CCAvenueOrderStatusResponse> {
  assertNonEmptyString(params.paymentId, 'paymentId');
  assertPositiveNumber(params.amount, 'amount');
  const result = await ccavenueRequest<CCAvenueConfirmResponse>(config, {
    command: 'confirmOrder',
    payload: { order_List: [{ reference_no: params.paymentId, amount: String(params.amount) }] },
    resultKey: 'Order_Result',
  });
  if (Number(result.failed_count ?? 0) > 0) throw new Error('CCAvenue: failed to confirm the order');
  return fetchPayment({ paymentId: params.paymentId }, config);
}

/**
 * Checks the callback: `signature` is the `encResponse` posted to the redirect URL. Authenticity rests on it
 * decrypting with the working key; the order and tracking ids must match and the payment must have succeeded.
 */
export function verifyPaymentSignature(params: VerifyPaymentParams, config: CCAvenueConfig): boolean {
  assertNonEmptyString(params.orderId, 'orderId');
  assertNonEmptyString(params.paymentId, 'paymentId');
  assertNonEmptyString(params.signature, 'signature');
  const { workingKey } = resolveConfig(config);
  try {
    const payload = decryptCallback(params.signature, workingKey);
    return (
      payload.order_id === params.orderId && payload.tracking_id === params.paymentId && payload.order_status === 'Success'
    );
  } catch {
    return false;
  }
}
