// Thin fetch wrapper for the amr-blog backend.
// Auth is cookie-based (httpOnly), so every request sends credentials and never
// touches tokens directly. On a 401 we transparently try one token refresh.

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

// Backend origin without the "/api/v1" path — e.g. the Swagger UI is served at
// `${API_ORIGIN}/swagger-ui`. Derived from NEXT_PUBLIC_API_URL so it always
// tracks the configured backend.
export const API_ORIGIN = (() => {
  try {
    return new URL(BASE_URL).origin;
  } catch {
    return "http://localhost:5000";
  }
})();

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions {
  method?: string;
  /** JSON body — omit when sending `form`. */
  body?: unknown;
  /** FormData body for file uploads (skips JSON content-type). */
  form?: FormData;
  /** Set false to skip the automatic refresh-and-retry on 401. */
  retryOnAuth?: boolean;
  signal?: AbortSignal;
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function messageFrom(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.msg === "string") return d.msg;
    if (typeof d.message === "string") return d.message;
    if (Array.isArray(d.errors) && d.errors.length) {
      const first = d.errors[0] as Record<string, unknown>;
      if (first && typeof first.message === "string") return first.message;
    }
  }
  return fallback;
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  // Collapse concurrent 401s into a single refresh call.
  if (!refreshing) {
    refreshing = fetch(`${BASE_URL}/auth/refresh-token`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        // allow subsequent refreshes later
        setTimeout(() => (refreshing = null), 0);
      });
  }
  return refreshing;
}

export async function api<T = unknown>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, form, retryOnAuth = true, signal } = opts;

  const init: RequestInit = {
    method,
    credentials: "include",
    signal,
    headers: {},
  };

  if (form) {
    init.body = form; // browser sets multipart boundary
  } else if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }

  let res = await fetch(`${BASE_URL}${path}`, init);

  if (res.status === 401 && retryOnAuth && path !== "/auth/login") {
    const ok = await tryRefresh();
    if (ok) {
      res = await fetch(`${BASE_URL}${path}`, init);
    }
  }

  const data = await parse(res);
  if (!res.ok) {
    throw new ApiError(messageFrom(data, `Request failed (${res.status})`), res.status, data);
  }
  return data as T;
}

export { BASE_URL };
