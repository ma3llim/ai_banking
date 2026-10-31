const TOKEN_KEY = 'ai_banking_token';

/** Backend base URL, e.g. http://localhost:4000 (set VITE_API_URL in frontend/.env). */
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage unavailable (private mode); the session just won't survive a reload.
  }
}

let onUnauthorized: (() => void) | undefined;
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  form?: FormData;
}

/** Calls the backend API and throws an Error with the server's message on failure. */
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? (body ? 'POST' : 'GET'),
    headers,
    body,
  });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    const fieldErrors = data?.details?.fieldErrors as Record<string, string[]> | undefined;
    const detail = fieldErrors
      ? ': ' + Object.entries(fieldErrors).map(([field, errs]) => `${field} ${errs.join(', ')}`).join('; ')
      : '';
    throw new Error((data?.error ?? `Request failed (${res.status})`) + detail);
  }
  return data as T;
}

const gbpFormatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
export const formatGBP = (value: string | number) => gbpFormatter.format(Number(value));

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
