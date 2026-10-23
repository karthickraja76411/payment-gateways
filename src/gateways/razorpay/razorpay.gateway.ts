import type { WithConfig } from '../../core/gateway-types.js';
import type { Gateway } from '../../interfaces/gateway.interface.js';
import type {
  CapturePaymentParams,
  CreateOrderParams,
  FetchOrderParams,
  FetchPaymentParams,
  VerifyPaymentParams,
} from '../../interfaces/payment.interface.js';
import type { FetchRefundParams, RefundPaymentParams } from '../../interfaces/refund.interface.js';
import type { Order, PaymentDetails, RefundDetails } from '../../interfaces/response.interface.js';
import type { VerifyWebhookParams, WebhookEvent } from '../../interfaces/webhook.interface.js';
import { toOrder, toPayment, toRefund } from './razorpay.mapper.js';
import * as payment from './razorpay.payment.js';
import * as refund from './razorpay.refund.js';
import type { RazorpayConfig } from './razorpay.types.js';
import * as webhook from './razorpay.webhook.js';

type Req<P> = P & WithConfig<RazorpayConfig>;

export class RazorpayGateway implements Gateway<RazorpayConfig> {
  readonly name = 'razorpay' as const;

  async createOrder({ config, ...params }: Req<CreateOrderParams>): Promise<Order> {
    return toOrder(await payment.createOrder(params, config));
  }

  async fetchOrder({ config, ...params }: Req<FetchOrderParams>): Promise<Order> {
    return toOrder(await payment.fetchOrder(params, config));
  }

  verifyPayment({ config, ...params }: Req<VerifyPaymentParams>): boolean {
    return payment.verifyPaymentSignature(params, config);
  }

  async fetchPayment({ config, ...params }: Req<FetchPaymentParams>): Promise<PaymentDetails> {
    return toPayment(await payment.fetchPayment(params, config));
  }

  async capturePayment({ config, ...params }: Req<CapturePaymentParams>): Promise<PaymentDetails> {
    return toPayment(await payment.capturePayment(params, config));
  }

  async refundPayment({ config, ...params }: Req<RefundPaymentParams>): Promise<RefundDetails> {
    return toRefund(await refund.refundPayment(params, config));
  }

  async fetchRefund({ config, ...params }: Req<FetchRefundParams>): Promise<RefundDetails> {
    return toRefund(await refund.fetchRefund(params, config));
  }

  verifyWebhook({ config, ...params }: Req<VerifyWebhookParams>): boolean {
    return webhook.verifyWebhookSignature(params, config);
  }

  parseWebhook({ config, ...params }: Req<VerifyWebhookParams>): WebhookEvent {
    return webhook.parseWebhookEvent(params, config);
  }
}
