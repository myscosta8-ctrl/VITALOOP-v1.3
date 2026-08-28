/**
 * Cliente HTTP mínimo (Doc 2 §31/§34). Sem lógica de autorização aqui —
 * a decisão de acesso é sempre do backend; o frontend só reflete o resultado.
 */

export interface ApiErrorShape {
  readonly code: string;
  readonly message: string;
  readonly requestId: string;
  readonly details?: ReadonlyArray<{ field?: string; issue: string }>;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string;
  readonly details?: ReadonlyArray<{ field?: string; issue: string }>;
  constructor(status: number, shape: ApiErrorShape) {
    super(shape.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = shape.code;
    this.requestId = shape.requestId;
    if (shape.details) this.details = shape.details;
  }
}

export interface ApiClientOptions {
  readonly baseUrl: string;
  getAccessToken(): string | null;
}

export const createApiClient = (opts: ApiClientOptions) => {
  const request = async <T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<T> => {
    const token = opts.getAccessToken();
    const res = await fetch(`${opts.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(extraHeaders ?? {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (res.status === 204) return undefined as T;

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const shape = json?.error ?? {
        code: 'UNKNOWN_ERROR',
        message: 'Erro desconhecido.',
        requestId: '',
      };
      throw new ApiError(res.status, shape);
    }
    return json?.data as T;
  };

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: unknown, extraHeaders?: Record<string, string>) =>
      request<T>('POST', path, body, extraHeaders),
    patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  };
};

export type ApiClient = ReturnType<typeof createApiClient>;
