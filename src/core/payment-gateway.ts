import { CCAvenueGateway } from '../gateways/ccavenue/ccavenue.gateway.js';
import { RazorpayGateway } from '../gateways/razorpay/razorpay.gateway.js';
import type { Gateway } from '../interfaces/gateway.interface.js';
import type {
  CapturePaymentParams,
  CreateOrderParams,
  FetchOrderParams,
  FetchPaymentParams,
  VerifyPaymentParams,
} from '../interfaces/payment.interface.js';
import type { FetchRefundParams, RefundPaymentParams } from '../interfaces/refund.interface.js';
import type { Order, PaymentDetails, RefundDetails } from '../interfaces/response.interface.js';
import type { VerifyWebhookParams, WebhookEvent } from '../interfaces/webhook.interface.js';
import type { PaymentOperation } from '../interfaces/logger.interface.js';
import { trace } from '../logger/payment-logger.js';
import type { GatewayConfigMap, GatewayName, GatewayRequest } from './gateway-types.js';

const implementations: { [K in GatewayName]: Gateway<GatewayConfigMap[K]> } = {
  razorpay: new RazorpayGateway(),
  ccavenue: new CCAvenueGateway(),
};

function resolve<K extends GatewayName>(type: K): Gateway<GatewayConfigMap[K]> {
  const implementation = implementations[type];
  if (!implementation) throw new Error(`Unsupported gateway_type: ${String(type)}`);
  return implementation;
}

function traced<T>(operation: PaymentOperation, params: GatewayRequest<GatewayName>, fn: () => Promise<T>): Promise<T>;
function traced<T>(operation: PaymentOperation, params: GatewayRequest<GatewayName>, fn: () => T): T;
function traced<T>(operation: PaymentOperation, params: GatewayRequest<GatewayName>, fn: () => T | Promise<T>): T | Promise<T> {
  return trace(
    { operation, gateway: String(params.gateway_type), logger: params.logger, params: params as unknown as Record<string, unknown> },
    fn as () => T,
  );
}

/**
 * Single entry point: every call names its gateway via `gateway_type` and supplies its own credentials.
 * Pass `logger` on any call to have its outcome (success or failure) posted to your webhook.
 */
export class PaymentGateway {
  createOrder<K extends GatewayName>(params: CreateOrderParams & GatewayRequest<K>): Promise<Order> {
    return traced('create_order', params, () => resolve(params.gateway_type).createOrder(params));
  }

  fetchOrder<K extends GatewayName>(params: FetchOrderParams & GatewayRequest<K>): Promise<Order> {
    return traced('fetch_order', params, () => resolve(params.gateway_type).fetchOrder(params));
  }

  verifyPayment<K extends GatewayName>(params: VerifyPaymentParams & GatewayRequest<K>): boolean {
    return traced('verify_payment', params, () => resolve(params.gateway_type).verifyPayment(params));
  }

  fetchPayment<K extends GatewayName>(params: FetchPaymentParams & GatewayRequest<K>): Promise<PaymentDetails> {
    return traced('fetch_payment', params, () => resolve(params.gateway_type).fetchPayment(params));
  }

  capturePayment<K extends GatewayName>(params: CapturePaymentParams & GatewayRequest<K>): Promise<PaymentDetails> {
    return traced('capture_payment', params, () => resolve(params.gateway_type).capturePayment(params));
  }

  refundPayment<K extends GatewayName>(params: RefundPaymentParams & GatewayRequest<K>): Promise<RefundDetails> {
    return traced('refund_payment', params, () => resolve(params.gateway_type).refundPayment(params));
  }

  fetchRefund<K extends GatewayName>(params: FetchRefundParams & GatewayRequest<K>): Promise<RefundDetails> {
    return traced('fetch_refund', params, () => resolve(params.gateway_type).fetchRefund(params));
  }

  verifyWebhook<K extends GatewayName>(params: VerifyWebhookParams & GatewayRequest<K>): boolean {
    return traced('verify_webhook', params, () => resolve(params.gateway_type).verifyWebhook(params));
  }

  /** Verifies the signature, then parses. Throws if the signature is invalid. */
  parseWebhook<K extends GatewayName>(params: VerifyWebhookParams & GatewayRequest<K>): WebhookEvent {
    return traced('parse_webhook', params, () => resolve(params.gateway_type).parseWebhook(params));
  }
}

export const gateway = new PaymentGateway();
