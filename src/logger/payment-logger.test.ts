import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gateway } from '../core/payment-gateway.js';
import { createHmacSignature } from '../security/signature.js';
import type { PaymentLogEvent } from '../interfaces/logger.interface.js';

const config = { keyId: 'rzp_test_key', keySecret: 'secret', webhookSecret: 'whsec' };
const gateway_type = 'razorpay' as const;
const logger = { url: 'https://logs.example.com/hook', secret: 'logsecret', wait: true };

function logCalls(spy: ReturnType<typeof vi.spyOn>): { event: PaymentLogEvent; headers: Record<string, string> }[] {
  return spy.mock.calls
    .filter(([req]: any[]) => req.url === logger.url)
    .map(([req]: any[]) => ({ event: JSON.parse(req.data) as PaymentLogEvent, headers: req.headers }));
}

afterEach(() => vi.restoreAllMocks());

function firstLog(spy: ReturnType<typeof vi.spyOn>): { event: PaymentLogEvent; headers: Record<string, string> } {
  const [first] = logCalls(spy);
  if (!first) throw new Error('logger webhook was not called');
  return first;
}

describe('logger webhook', () => {
  it('reports a successful createOrder without leaking credentials', async () => {
    const spy = vi.spyOn(axios, 'request').mockImplementation(async (req: any) =>
      req.url === logger.url
        ? { status: 200, headers: {}, data: {} }
        : {
            status: 200,
            headers: {},
            data: { id: 'order_1', entity: 'order', amount: 100, amount_paid: 0, amount_due: 100, currency: 'INR', receipt: 'r1', status: 'created', attempts: 0, notes: [], created_at: 1700000000 },
          },
    );

    await gateway.createOrder({ gateway_type, amount: 100, currency: 'INR', receipt: 'r1', config, logger });

    const { event, headers } = firstLog(spy);
    expect(event.event).toBe('create_order.success');
    expect(event.paymentStatus).toBe('created');
    expect(event.references.orderId).toBe('order_1');
    expect(event.error).toBeNull();
    expect(JSON.stringify(event)).not.toContain(config.keySecret);
    expect(headers['X-Payment-Gateway-Signature']).toBe(createHmacSignature(JSON.stringify(event), logger.secret));
  });

  it('reports a gateway failure and still rethrows', async () => {
    const spy = vi.spyOn(axios, 'request').mockImplementation(async (req: any) =>
      req.url === logger.url
        ? { status: 200, headers: {}, data: {} }
        : { status: 400, headers: {}, data: { error: { code: 'BAD_REQUEST_ERROR', description: 'bad' } } },
    );

    await expect(gateway.fetchPayment({ gateway_type, paymentId: 'pay_1', config, logger })).rejects.toThrow();

    const { event } = firstLog(spy);
    expect(event.event).toBe('fetch_payment.failure');
    expect(event.error).toMatchObject({ code: 'GATEWAY_HTTP_ERROR', httpStatus: 400, gatewayCode: 'BAD_REQUEST_ERROR' });
    expect(event.references.paymentId).toBe('pay_1');
  });

  it('reports verifyPayment results and redacts the signature', () => {
    const spy = vi.spyOn(axios, 'request').mockResolvedValue({ status: 200, headers: {}, data: {} });

    expect(gateway.verifyPayment({ gateway_type, orderId: 'o', paymentId: 'p', signature: 'bad', config, logger })).toBe(false);

    const { event } = firstLog(spy);
    expect(event.event).toBe('verify_payment.failure');
    expect(event.error?.code).toBe('SIGNATURE_MISMATCH');
    expect(JSON.stringify(event.request)).not.toContain('bad');
  });

  it('does not let a broken logger affect the payment call', async () => {
    vi.spyOn(axios, 'request').mockImplementation(async (req: any) => {
      if (req.url === logger.url) throw new Error('down');
      return { status: 200, headers: {}, data: { id: 'pay_1', entity: 'payment', amount: 100, currency: 'INR', status: 'captured', order_id: 'o', method: null, amount_refunded: 0, captured: true, description: null, email: null, contact: null, error_code: null, error_description: null, notes: [], created_at: 1700000000 } };
    });

    await expect(gateway.fetchPayment({ gateway_type, paymentId: 'pay_1', config, logger })).resolves.toMatchObject({ id: 'pay_1' });
  });
});
