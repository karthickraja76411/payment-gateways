import { describe, expect, it } from 'vitest';
import { createHmacSignature } from '../../security/signature.js';
import { gateway } from '../../core/payment-gateway.js';

const config = { keyId: 'rzp_test_key', keySecret: 'secret', webhookSecret: 'whsec' };
const gateway_type = 'razorpay' as const;

describe('RazorpayGateway signatures', () => {
  it('verifies a checkout signature', () => {
    const signature = createHmacSignature('order_1|pay_1', config.keySecret);
    expect(gateway.verifyPayment({ gateway_type, orderId: 'order_1', paymentId: 'pay_1', signature, config })).toBe(true);
    expect(gateway.verifyPayment({ gateway_type, orderId: 'order_1', paymentId: 'pay_2', signature, config })).toBe(false);
  });

  it('verifies and parses a webhook', () => {
    const body = JSON.stringify({
      entity: 'event',
      event: 'refund.processed',
      created_at: 1700000000,
      payload: {
        refund: {
          entity: {
            id: 'rfnd_1', entity: 'refund', amount: 10000, currency: 'INR', payment_id: 'pay_1',
            receipt: null, status: 'processed', notes: [], created_at: 1700000000,
          },
        },
      },
    });
    const signature = createHmacSignature(body, config.webhookSecret);
    const event = gateway.parseWebhook({ gateway_type, body, signature, config });
    expect(event.event).toBe('refund.processed');
    expect(event.refund?.amount).toBe(10000);
    expect(() => gateway.parseWebhook({ gateway_type, body, signature: 'bad', config })).toThrow();
  });

  it('requires credentials', () => {
    expect(() =>
      gateway.verifyPayment({ gateway_type, orderId: 'o', paymentId: 'p', signature: 's', config: { keyId: '', keySecret: '' } }),
    ).toThrow(TypeError);
  });

  it('rejects an unknown gateway_type', () => {
    // @ts-expect-error unsupported gateway
    expect(() => gateway.verifyPayment({ gateway_type: 'nope', orderId: 'o', paymentId: 'p', signature: 's', config })).toThrow(/Unsupported/);
  });
});
