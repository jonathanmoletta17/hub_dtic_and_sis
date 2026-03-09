/**
 * glpiService — Wrapper HTTP para a API Universal Backend.
 * Centraliza base URL, headers e tratamento de erros.
 */
import { useAuthStore } from '@/store/useAuthStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:8080` : "http://glpi-backend:8080");

export class GlpiApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "GlpiApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const { headers: optionHeaders, ...restOptions } = options || {};

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(optionHeaders as Record<string, string>)
  };

  // Extrai o contexto da URL para injetar o token correto (ex: /api/v1/sis/...)
  const contextMatch = path.match(/^\/api\/v1\/([^/]+)\//);
  if (contextMatch) {
    const context = contextMatch[1];
    const token = useAuthStore.getState().getSessionToken(context);
    if (token) {
      headers["Session-Token"] = token;
    }
  }

  const res = await fetch(url, {
    headers,
    ...restOptions,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new GlpiApiError(body.detail || res.statusText, res.status);
  }

  return res.json() as Promise<T>;
}

// ─── Auth ───
export function apiLogin(context: string, payload: Record<string, string>) {
  return request<any>(`/api/v1/${context}/auth/login`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logoutApi(context: string) {
  return request<any>(`/api/v1/${context}/auth/logout`, {
    method: "POST",
  });
}

// ─── Search Engine ───
export function searchItems(context: string, itemtype: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return request<any>(`/api/v1/${context}/search/${itemtype}?${qs}`);
}

// ─── CRUD Genérico ───
export function getItem(context: string, itemtype: string, id: number, expandDropdowns = false) {
  const qs = expandDropdowns ? "?expand_dropdowns=true" : "";
  return request<any>(`/api/v1/${context}/${itemtype}/${id}${qs}`);
}

export function getSubItems(context: string, itemtype: string, id: number, subItemtype: string) {
  return request<any[]>(`/api/v1/${context}/${itemtype}/${id}/${subItemtype}`);
}

export function listItems(context: string, itemtype: string, rangeStart = 0, rangeEnd = 49, expandDropdowns = false) {
  const qs = new URLSearchParams({
    range_start: String(rangeStart),
    range_end: String(rangeEnd),
    ...(expandDropdowns ? { expand_dropdowns: "true" } : {}),
  }).toString();
  return request<any[]>(`/api/v1/${context}/${itemtype}?${qs}`);
}

// ─── Lookups (CQRS) ───
export function getLocations(context: string) {
  return request<{ locations: { id: number; name: string; completename: string }[] }>(
    `/api/v1/${context}/lookups/locations`
  );
}

export function getCategories(context: string) {
  return request<{ categories: { id: number; name: string; completename: string }[] }>(
    `/api/v1/${context}/lookups/itilcategories`
  );
}

export function getTechnicians(context: string) {
  return request<{ technicians: { id: number; name: string; login: string }[] }>(
    `/api/v1/${context}/lookups/users/technicians`
  );
}

// ─── Mutações (Write) ───
export function createItem(context: string, itemtype: string, input: Record<string, any>) {
  return request<any>(`/api/v1/${context}/${itemtype}`, {
    method: "POST",
    body: JSON.stringify({ input }),
  });
}

export function updateItem(context: string, itemtype: string, id: number, input: Record<string, any>) {
  return request<any>(`/api/v1/${context}/${itemtype}/${id}`, {
    method: "PUT",
    body: JSON.stringify({ input }),
  });
}

export function deleteItem(context: string, itemtype: string, id: number) {
  return request<any>(`/api/v1/${context}/${itemtype}/${id}`, {
    method: "DELETE",
  });
}
