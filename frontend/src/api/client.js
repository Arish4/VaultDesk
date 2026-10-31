// One place that talks HTTP: base URL, JWT header, token refresh and error shape.

const BASE_URL = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "vaultdesk.tokens";

export const tokenStore = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(TOKEN_KEY));
    } catch {
      return null;
    }
  },
  set(tokens) {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

function firstFieldError(body) {
  if (!body || typeof body !== "object") return null;
  const [field, messages] = Object.entries(body)[0] ?? [];
  if (!field) return null;
  const message = Array.isArray(messages) ? messages[0] : messages;
  return field === "non_field_errors" ? message : `${field}: ${message}`;
}

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.detail ?? firstFieldError(body) ?? `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code;
    // DRF validation errors look like { field: ["message"] }.
    this.fieldErrors = body && !body.detail ? body : {};
  }
}

// When several requests get 401 at once, they all wait for ONE refresh call instead of each sending their own.
let refreshInFlight = null;

function refreshAccessToken() {
  refreshInFlight ??= requestNewAccessToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function requestNewAccessToken() {
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

export async function apiFetch(path, { method = "GET", body, params, signal, retry = true } = {}) {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  }

  const headers = { Accept: "application/json" };
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
    if (newAccess) return apiFetch(path, { method, body, params, signal, retry: false });
    // Refresh failed too: log out, and retry once as a guest so public pages still load.
    tokenStore.clear();
    window.dispatchEvent(new Event("vaultdesk:logout"));
    return apiFetch(path, { method, body, params, signal, retry: false });
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data);
  return data;
}
