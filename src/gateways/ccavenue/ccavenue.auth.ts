import { HttpClient } from '../../http/http-client.js';
import { HttpError } from '../../http/http-error.js';
import type { HttpResponse } from '../../http/http-response.js';
import { isRecord, nonEmptyString } from '../../utils/object.js';
import { decryptPayload, encryptPayload } from './ccavenue.crypto.js';
import { resolveConfig } from './ccavenue.config.js';
import type { CCAvenueConfig } from './ccavenue.types.js';

const client = new HttpClient();

const API_PATH = '/apis/servlet/DoWebTrans';

export interface CCAvenueCall {
  command: string;
  payload: unknown;
  /** Key wrapping the result object in the decrypted JSON, e.g. `Order_Status_Result`. */
  resultKey: string;
}

const isFailure = (status: unknown): boolean => status === 1 || status === '1';

function tryDecrypt(hex: string | null, workingKey: string): string | undefined {
  if (!hex) return undefined;
  try {
    return decryptPayload(hex, workingKey);
  } catch {
    return undefined;
  }
}

/** Validates the envelope (`status=0&enc_response=...`) and returns the decrypted JSON text. */
function decryptEnvelope(response: HttpResponse<unknown>, workingKey: string): string {
  if (typeof response.data !== 'string') {
    throw new HttpError('CCAvenue: unexpected response format', response.status, response.data);
  }
  const params = new URLSearchParams(response.data.trim());
  const encResponse = params.get('enc_response');
  const errorCode = params.get('enc_error_code');

  if (params.get('status') !== '0') {
    const detail = tryDecrypt(encResponse, workingKey) ?? errorCode ?? 'request failed';
    throw new HttpError(`CCAvenue: ${detail}`, response.status, response.data, errorCode ?? undefined);
  }

  const text = tryDecrypt(encResponse, workingKey);
  if (text === undefined) {
    throw new HttpError('CCAvenue: unable to decrypt response (check workingKey)', response.status, response.data);
  }
  return text;
}

/** Parses the decrypted JSON, unwraps `resultKey`, and turns an API-level failure into an `HttpError`. */
function unwrapResult<T>(text: string, resultKey: string, httpStatus: number): T {
  const parsed: unknown = JSON.parse(text);
  const result = isRecord(parsed) && isRecord(parsed[resultKey]) ? parsed[resultKey] : parsed;
  if (!isRecord(result)) throw new HttpError('CCAvenue: malformed response', httpStatus, parsed);

  if (isFailure(result['status'])) {
    const description = nonEmptyString(result['error_desc']) ?? 'request failed';
    const code = nonEmptyString(result['error_code']) ?? undefined;
    throw new HttpError(`CCAvenue: ${description}`, httpStatus, result, code);
  }
  return result as T;
}

/** Sends an encrypted DoWebTrans command and returns the decrypted, unwrapped result object. */
export async function ccavenueRequest<T>(config: CCAvenueConfig, call: CCAvenueCall): Promise<T> {
  const { accessCode, workingKey, baseUrl, timeout, retries } = resolveConfig(config);
  const form = new URLSearchParams({
    enc_request: encryptPayload(JSON.stringify(call.payload), workingKey),
    access_code: accessCode,
    command: call.command,
    request_type: 'JSON',
    response_type: 'JSON',
    version: '1.1',
  });

  const response = await client.request<unknown>({
    method: 'POST',
    url: `${baseUrl}${API_PATH}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    timeout,
    retries,
  });

  const text = decryptEnvelope(response, workingKey);
  return unwrapResult<T>(text, call.resultKey, response.status);
}
