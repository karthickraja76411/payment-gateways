export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HttpRequest {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string> | undefined;
  query?: Record<string, string | number | boolean> | undefined;
  body?: unknown;
  auth?: { username: string; password: string } | undefined;
  timeout?: number | undefined;
  retries?: number | undefined;
}
