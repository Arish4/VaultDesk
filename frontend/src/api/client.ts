// One place that talks HTTP: base URL, JWT header, token refresh and error shape.
import type { Tokens } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "vaultdesk.tokens";

export const tokenStore = {
  get(): Tokens | null {
    try {
      return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? "null");
    } catch {
      return null;
    }
  },
  set(tokens: Tokens) {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

/** DRF error bodies: {"detail": "..."} or {"field": ["message", ...]}. */
type ErrorBody = Record<string, unknown> | null;

function firstFieldError(body: ErrorBody): string | null {
  if (!body || typeof body !== "object") return null;
  const [field, messages] = Object.entries(body)[0] ?? [];
  if (!field) return null;
  const message = String(Array.isArray(messages) ? messages[0] : messages);
  return field === "non_field_errors" ? message : `${field}: ${message}`;
}

export class ApiError extends Error {
  status: number;
  code: string | undefined;
  fieldErrors: Record<string, string | string[]>;

  constructor(status: number, body: ErrorBody) {
    super((body?.detail as string | undefined) ?? firstFieldError(body) ?? `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code as string | undefined;
    // DRF validation errors look like { field: ["message"] }.
    this.fieldErrors = body && !body.detail ? (body as Record<string, string | string[]>) : {};
  }
}

// When several requests get 401 at once, they all wait for ONE refresh call instead of each sending their own.
let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= requestNewAccessToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function requestNewAccessToken(): Promise<string | null> {
  const tokens = tokenStore.get();
  if (!tokens?.refresh) return null;

  const response = await fetch(`${BASE_URL}/api/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: tokens.refresh }),
  });
  if (!response.ok) {
    tokenStore.clear();
    return null;
  }
  const { access } = await response.json();
  tokenStore.set({ ...tokens, access });
  return access;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | undefined | null>;
  signal?: AbortSignal;
  retry?: boolean;
}

/** `T` is the JSON shape the caller expects back; the server is trusted to send it. */
export async function apiFetch<T>(path: string, { method = "GET", body, params, signal, retry = true }: RequestOptions = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const access = tokenStore.get()?.access;
  if (access) headers.Authorization = `Bearer ${access}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  // Access tokens expire after 30 minutes: refresh once, then retry the same request.
  if (response.status === 401 && access && retry) {
    const newAccess = await refreshAccessToken();
    if (newAccess) return apiFetch<T>(path, { method, body, params, signal, retry: false });
    // Refresh failed too: log out, and retry once as a guest so public pages still load.
    tokenStore.clear();
    window.dispatchEvent(new Event("vaultdesk:logout"));
    return apiFetch<T>(path, { method, body, params, signal, retry: false });
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data);
  return data as T;
}
