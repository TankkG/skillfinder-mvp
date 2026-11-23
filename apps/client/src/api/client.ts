import type { ApiErrorBody, AuthResult } from '@skillfinder/shared';
import { API_URL } from '../config';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status: number, code = 'ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  skipAuthRetry?: boolean;
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshing: Promise<AuthResult> | null = null;

export const setAuthTokens = (tokens: {
  accessToken: string | null;
  refreshToken: string | null;
}): void => {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
};

export const getRefreshToken = (): string | null => refreshToken;

let sessionListener: ((result: AuthResult) => void) | null = null;
let unauthorizedListener: (() => void) | null = null;

export const setSessionListener = (
  listener: ((result: AuthResult) => void) | null,
): void => {
  sessionListener = listener;
};

export const setUnauthorizedListener = (
  listener: (() => void) | null,
): void => {
  unauthorizedListener = listener;
};

const parseBody = (body: unknown): BodyInit | undefined => {
  if (body === undefined || body === null) return undefined;
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return body;
  }
  return JSON.stringify(body);
};

const parseError = async (response: Response): Promise<ApiError> => {
  let payload: ApiErrorBody | null = null;
  try {
    payload = (await response.json()) as ApiErrorBody;
  } catch {
    payload = null;
  }
  const message =
    payload?.error?.message ??
    `No se pudo completar la solicitud (${response.status}).`;
  return new ApiError(
    message,
    response.status,
    payload?.error?.code ?? 'ERROR',
    payload?.error?.details,
  );
};

const executeRefresh = async (): Promise<AuthResult> => {
  if (!refreshToken) {
    throw new ApiError('La sesion expiro.', 401, 'NO_SESSION');
  }
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    accessToken = null;
    refreshToken = null;
    throw await parseError(response);
  }
  const result = (await response.json()) as AuthResult;
  accessToken = result.accessToken;
  refreshToken = result.refreshToken;
  sessionListener?.(result);
  return result;
};

export const refreshSession = async (): Promise<AuthResult> => {
  if (!refreshing) {
    refreshing = executeRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
};

const request = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  const headers: Record<string, string> = { ...options.headers };
  const body = parseBody(options.body);
  if (body && !(typeof FormData !== 'undefined' && body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: options.signal,
    });
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Verifica tu conexion.',
      0,
      'NETWORK_ERROR',
    );
  }

  if (response.status === 401 && refreshToken && !options.skipAuthRetry) {
    try {
      await refreshSession();
      return request<T>(path, { ...options, skipAuthRetry: true });
    } catch {
      accessToken = null;
      refreshToken = null;
      unauthorizedListener?.();
      throw new ApiError('La sesion expiro. Inicia sesion nuevamente.', 401);
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
};

const query = (params: object): string => {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const api = {
  get: <T>(path: string, params?: object) =>
    request<T>(`${path}${params ? query(params) : ''}`),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, body: FormData) =>
    request<T>(path, { method: 'POST', body }),
};
