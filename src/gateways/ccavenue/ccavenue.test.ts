import { describe, expect, it } from 'vitest';
import { gateway } from '../../core/payment-gateway.js';
import { decryptPayload, encryptPayload } from './ccavenue.crypto.js';
import type { CCAvenueCheckout } from './ccavenue.types.js';

const config = {
  merchantId: '12345',
  accessCode: 'AVXX',
  workingKey: '0123456789abcdef0123456789abcdef',
  redirectUrl: 'https://example.com/return',
  sandbox: true,
};
const gateway_type = 'ccavenue' as const;

const encResponse = (fields: Record<string, string>, key = config.workingKey): string =>
  encryptPayload(new URLSearchParams(fields).toString(), key);

const success = { order_id: 'ord_1', tracking_id: '1001', order_status: 'Success', amount: '499.99', currency: 'INR' };

describe('CCAvenue crypto', () => {
  it('round-trips a payload', () => {
    expect(decryptPayload(encryptPayload('a=1&b=2', config.workingKey), config.workingKey)).toBe('a=1&b=2');
  });
});

describe('CCAvenueGateway', () => {
  it('builds an encrypted checkout request', async () => {
    const order = await gateway.createOrder({
      gateway_type,
      amount: 499.99,
      currency: 'INR',
      receipt: 'ord_1',
      notes: { cart: 'c1' },
      config,
    });
    const checkout = order.raw as CCAvenueCheckout;
    expect(order.id).toBe('ord_1');
    expect(checkout.url).toContain('test.ccavenue.com');
    const fields = new URLSearchParams(decryptPayload(checkout.encRequest, config.workingKey));
    expect(fields.get('amount')).toBe('499.99');
    expect(fields.get('merchant_id')).toBe('12345');
    expect(fields.get('redirect_url')).toBe(config.redirectUrl);
    expect(fields.get('merchant_param1')).toBe('c1');
  });

  it('requires a redirect url', async () => {
    const { redirectUrl: _omit, ...rest } = config;
    await expect(gateway.createOrder({ gateway_type, amount: 10, currency: 'INR', config: rest })).rejects.toThrow(TypeError);
  });

  it('verifies a callback', () => {
    const signature = encResponse(success);
    expect(gateway.verifyPayment({ gateway_type, orderId: 'ord_1', paymentId: '1001', signature, config })).toBe(true);
    expect(gateway.verifyPayment({ gateway_type, orderId: 'ord_1', paymentId: '9999', signature, config })).toBe(false);
    expect(gateway.verifyPayment({ gateway_type, orderId: 'ord_1', paymentId: '1001', signature: 'zz', config })).toBe(false);
    const wrongKey = encResponse(success, 'another-working-key');
    expect(gateway.verifyPayment({ gateway_type, orderId: 'ord_1', paymentId: '1001', signature: wrongKey, config })).toBe(false);
    const failed = encResponse({ ...success, order_status: 'Failure' });
    expect(gateway.verifyPayment({ gateway_type, orderId: 'ord_1', paymentId: '1001', signature: failed, config })).toBe(false);
  });

  it('parses a webhook from the raw form body', () => {
    const body = `encResponse=${encResponse({ ...success, payment_mode: 'Net Banking', trans_date: '15/01/2024 10:30:00' })}`;
    const event = gateway.parseWebhook({ gateway_type, body, signature: '', config });
    expect(event.event).toBe('payment.captured');
    expect(event.payment?.amount).toBe(499.99);
    expect(event.payment?.method).toBe('Net Banking');
    expect(event.order?.status).toBe('paid');
    expect(gateway.verifyWebhook({ gateway_type, body: 'garbage', signature: '', config })).toBe(false);
    expect(() => gateway.parseWebhook({ gateway_type, body: 'garbage', signature: '', config })).toThrow();
  });

  it('requires credentials', () => {
    expect(() =>
      gateway.verifyPayment({ gateway_type, orderId: 'o', paymentId: 'p', signature: 's', config: { merchantId: '', accessCode: '', workingKey: '' } }),
    ).toThrow(TypeError);
  });

  it('cannot fetch a refund by id', async () => {
    await expect(gateway.fetchRefund({ gateway_type, refundId: 'r1', config })).rejects.toThrow(/not support/);
  });
});
