import type { WithConfig } from '../core/gateway-types.js';
import type { CapturePaymentParams, CreateOrderParams, FetchOrderParams, FetchPaymentParams, VerifyPaymentParams } from './payment.interface.js';
import type { FetchRefundParams, RefundPaymentParams } from './refund.interface.js';
import type { Order, PaymentDetails, RefundDetails } from './response.interface.js';
import type { VerifyWebhookParams, WebhookEvent } from './webhook.interface.js';

/** Stateless: credentials are supplied via `config` on every call. */
export interface Gateway<TConfig> {
  readonly name: string;
  createOrder(params: CreateOrderParams & WithConfig<TConfig>): Promise<Order>;
  fetchOrder(params: FetchOrderParams & WithConfig<TConfig>): Promise<Order>;
  verifyPayment(params: VerifyPaymentParams & WithConfig<TConfig>): boolean;
  fetchPayment(params: FetchPaymentParams & WithConfig<TConfig>): Promise<PaymentDetails>;
  capturePayment(params: CapturePaymentParams & WithConfig<TConfig>): Promise<PaymentDetails>;
  refundPayment(params: RefundPaymentParams & WithConfig<TConfig>): Promise<RefundDetails>;
  fetchRefund(params: FetchRefundParams & WithConfig<TConfig>): Promise<RefundDetails>;
  verifyWebhook(params: VerifyWebhookParams & WithConfig<TConfig>): boolean;
  /** Verifies the signature, then parses. Throws if the signature is invalid. */
  parseWebhook(params: VerifyWebhookParams & WithConfig<TConfig>): WebhookEvent;
}
