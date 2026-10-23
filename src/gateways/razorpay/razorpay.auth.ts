import { HttpClient } from '../../http/http-client.js';
import type { HttpMethod } from '../../http/http-request.js';
import { resolveConfig } from './razorpay.config.js';
import { toGatewayError } from './razorpay.mapper.js';
import type { RazorpayConfig } from './razorpay.types.js';

const client = new HttpClient();

export interface RazorpayCall {
  method: HttpMethod;
  path: string;
  body?: unknown;
}

/** Sends a Basic-auth (keyId:keySecret) request to the Razorpay REST API and returns the JSON body. */
export async function razorpayRequest<T>(config: RazorpayConfig, call: RazorpayCall): Promise<T> {
  const { keyId, keySecret, baseUrl, timeout, retries } = resolveConfig(config);
  try {
    const response = await client.request<T>({
      method: call.method,
      url: `${baseUrl}${call.path}`,
      body: call.body,
      auth: { username: keyId, password: keySecret },
      timeout,
      retries,
    });
    return response.data;
  } catch (error) {
    throw toGatewayError(error);
  }
}
