import axios, { isAxiosError, type AxiosRequestConfig } from 'axios';
import { omitUndefined } from '../utils/object.js';
import { HttpError } from './http-error.js';
import type { HttpRequest } from './http-request.js';
import type { HttpResponse } from './http-response.js';
import { resolveRetries, withRetry } from './retry.js';
import { resolveTimeout } from './timeout.js';

export class HttpClient {
  async request<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>> {
    const retries = resolveRetries(req.retries, req.method);
    return withRetry(() => this.send<T>(req), retries);
  }

  private async send<T>(req: HttpRequest): Promise<HttpResponse<T>> {
    const config: AxiosRequestConfig = omitUndefined({
      method: req.method,
      url: req.url,
      headers: req.headers,
      params: req.query,
      data: req.body,
      auth: req.auth,
      timeout: resolveTimeout(req.timeout),
      validateStatus: () => true,
    });

    let res;
    try {
      res = await axios.request<T>(config);
    } catch (error) {
      if (isAxiosError(error)) throw new HttpError(error.message, 0, undefined, error.code);
      throw error;
    }

    if (res.status < 200 || res.status >= 300) {
      throw new HttpError(`Request failed with status ${res.status}`, res.status, res.data);
    }

    const headers = Object.fromEntries(Object.entries(res.headers).map(([key, value]) => [key, String(value)]));
    return { status: res.status, headers, data: res.data };
  }
}
