# payment-gateway

Stateless payment gateway client built on the gateways' REST APIs (no vendor SDKs). Credentials are passed on every call; nothing is stored. Currently supported: Razorpay and CCAvenue.

```ts
import { gateway } from 'payment-gateway';

const gateway_type = 'razorpay';
const config = {
  keyId: process.env.RAZORPAY_KEY_ID!,
  keySecret: process.env.RAZORPAY_KEY_SECRET!,
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET, // only for webhooks
};

// Amount and currency are sent to the gateway as-is (Razorpay expects paise: 49999 = INR 499.99).
const order = await gateway.createOrder({ gateway_type, amount: 49999, currency: 'INR', receipt: 'rcpt_1', config });

// After client-side checkout, verify the callback signature on your server.
const ok = gateway.verifyPayment({ gateway_type, orderId, paymentId, signature, config });

await gateway.capturePayment({ gateway_type, paymentId, amount: 49999, currency: 'INR', config });
await gateway.refundPayment({ gateway_type, paymentId, amount: 100, config }); // omit amount for a full refund

// Webhooks: pass the raw request body and the X-Razorpay-Signature header.
const event = gateway.parseWebhook({ gateway_type, body: rawBody, signature, config });
```

Also available: `fetchOrder`, `fetchPayment`, `fetchRefund`, `verifyWebhook`.

## CCAvenue

```ts
const gateway_type = 'ccavenue';
const config = {
  merchantId: process.env.CCAVENUE_MERCHANT_ID!,
  accessCode: process.env.CCAVENUE_ACCESS_CODE!,
  workingKey: process.env.CCAVENUE_WORKING_KEY!,
  redirectUrl: 'https://example.com/payment/return',
  sandbox: true, // test environment
};

// No server-side order exists: this builds the encrypted checkout request.
const order = await gateway.createOrder({ gateway_type, amount: 499.99, currency: 'INR', receipt: 'ORDER123', config });
const { url, encRequest, accessCode } = order.raw as CCAvenueCheckout; // POST these from the browser

// On the redirect URL, pass the posted `encResponse` as `signature`.
const ok = gateway.verifyPayment({ gateway_type, orderId, paymentId: trackingId, signature: encResponse, config });

// Notifications are encrypted, not signed: pass the raw body; `signature` is unused.
const event = gateway.parseWebhook({ gateway_type, body: rawBody, signature: '', config });
```

Notes:
- `paymentId` is CCAvenue's reference number (`tracking_id`); `orderId` is your `order_id`.
- `createOrder` takes `callbackUrl`/`cancelUrl` (or the config defaults); `notes` map to `merchant_param1-5` (max 5).
- `capturePayment` confirms a pre-authorized order; `refundPayment` uses `receipt` as the unique `refund_ref_no`.
- `fetchRefund` is not supported by the CCAvenue API and rejects.

## Logger webhook

Add `logger` to any call and the outcome (success or failure) is POSTed to your URL after the call finishes. Delivery never throws or changes the call's result.

```ts
await gateway.createOrder({
  gateway_type, amount: 49999, currency: 'INR', config,
  logger: { url: 'https://example.com/payment-logs', secret: process.env.LOG_SECRET, wait: true },
});
```

Options: `headers`, `secret` (HMAC-SHA256 of the body in `X-Payment-Gateway-Signature`), `timeout` (default 5000 ms), `wait` (await delivery before async calls resolve; sync calls like `verifyPayment` are always fire-and-forget).

Every operation emits the same payload (`PaymentLogEvent`): `event` (`create_order.success`, `verify_payment.failure`, ...), `operation`, `status`, `gateway`, `timestamp`, `durationMs`, `paymentStatus`, `references` (`orderId`/`paymentId`/`refundId`), `request`, `response` and `error`. Credentials, signatures, webhook bodies and the gateway's raw payload are never sent.

`error.code` is one of `GATEWAY_HTTP_ERROR`, `NETWORK_ERROR`, `TIMEOUT`, `VALIDATION_ERROR`, `SIGNATURE_MISMATCH`, `PAYMENT_FAILED` (a fetched/captured payment with status `failed`), `UNKNOWN_ERROR`.

Failed API calls throw `HttpError` (`status`, `code`, `data`); `status` is `0` for network errors and timeouts. GET requests are retried by default; write requests are not, to avoid duplicate orders or refunds.
