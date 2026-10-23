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
import { toOrder, toPayment } from './ccavenue.mapper.js';
import * as payment from './ccavenue.payment.js';
import * as refund from './ccavenue.refund.js';
import type { CCAvenueConfig } from './ccavenue.types.js';
import * as webhook from './ccavenue.webhook.js';

type Req<P> = P & WithConfig<CCAvenueConfig>;

export class CCAvenueGateway implements Gateway<CCAvenueConfig> {
  readonly name = 'ccavenue' as const;

  async createOrder({ config, ...params }: Req<CreateOrderParams>): Promise<Order> {
    return payment.createOrder(params, config);
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
    return refund.refundPayment(params, config);
  }

  async fetchRefund({ config: _config, ...params }: Req<FetchRefundParams>): Promise<RefundDetails> {
    return refund.fetchRefund(params);
  }

  verifyWebhook({ config, ...params }: Req<VerifyWebhookParams>): boolean {
    return webhook.verifyWebhookSignature(params, config);
  }

  parseWebhook({ config, ...params }: Req<VerifyWebhookParams>): WebhookEvent {
    return webhook.parseWebhookEvent(params, config);
  }
}
