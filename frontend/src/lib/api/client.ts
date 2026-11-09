import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseEnabled, publicEnv } from "@/lib/env";

export class ApiError extends Error {
  status: number;
  code: string;
  meta?: unknown;

  constructor(status: number, code: string, message: string, meta?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.meta = meta;
  }
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

type ApiClient = {
  get<T>(path: string, opts?: { signal?: AbortSignal }): Promise<T>;
  post<T>(
    path: string,
    body: unknown,
    opts?: { idempotencyKey?: string; signal?: AbortSignal },
  ): Promise<T>;
  delete<T>(path: string, opts?: { signal?: AbortSignal }): Promise<T>;
};

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

async function readError(response: Response): Promise<ApiError> {
  const fallback = new ApiError(
    response.status,
    "HTTP_ERROR",
    `Request failed (${response.status})`,
  );
  try {
    const body = await response.json();
    if (typeof body?.code !== "string") return fallback;
    return new ApiError(response.status, body.code, body.message, body.meta);
  } catch {
    return fallback;
  }
}

export function createApiClient(p: {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  fetchFn?: typeof fetch;
}): ApiClient {
  async function request<T>(
    path: string,
    init: RequestInit,
    headers: Record<string, string>,
  ): Promise<T> {
    const token = await p.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const fetchFn = p.fetchFn ?? fetch;

    let response: Response;
    try {
      response = await fetchFn(`${p.baseUrl}${path}`, { ...init, headers });
    } catch (error) {
      if (isAbort(error)) throw error;
      const message = error instanceof Error ? error.message : "Network error";
      throw new ApiError(0, "NETWORK_ERROR", message);
    }
    if (!response.ok) throw await readError(response);
    return (await response.json()) as T;
  }

  return {
    get: (path, opts) =>
      request(path, { method: "GET", signal: opts?.signal }, {}),
    delete: (path, opts) =>
      request(path, { method: "DELETE", signal: opts?.signal }, {}),
    post: (path, body, opts) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (opts?.idempotencyKey)
        headers["Idempotency-Key"] = opts.idempotencyKey;
      return request(
        path,
        { method: "POST", body: JSON.stringify(body), signal: opts?.signal },
        headers,
      );
    },
  };
}

/** The app's client: signed in with the browser session, pointed at the backend. */
export const api: ApiClient = {
  get: (path, opts) => defaultClient().get(path, opts),
  post: (path, body, opts) => defaultClient().post(path, body, opts),
  delete: (path, opts) => defaultClient().delete(path, opts),
};

function defaultClient(): ApiClient {
  return createApiClient({
    baseUrl: publicEnv().apiUrl,
    getAccessToken: async () => {
      // Supabase is off: there is no session, so no Authorization header.
      if (!isSupabaseEnabled()) return null;
      const { data } = await createSupabaseBrowserClient().auth.getSession();
      return data.session?.access_token ?? null;
    },
  });
}
