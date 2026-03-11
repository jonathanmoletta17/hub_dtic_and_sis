/**
 * glpiService — Wrapper HTTP para a API Universal Backend.
 * Consome o httpClient centralizado para base URL, headers e tratamento de erros.
 */
import { request, ApiError } from './httpClient';

// Re-exporta ApiError com alias legado para retrocompatibilidade
export { ApiError as GlpiApiError };

// ─── Auth ───
export function apiLogin(context: string, payload: Record<string, string>) {
  return request<unknown>(`/api/v1/${context}/auth/login`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logoutApi(context: string) {
  return request<unknown>(`/api/v1/${context}/auth/logout`, {
    method: "POST",
  });
}

// ─── Search Engine ───
export function searchItems(context: string, itemtype: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return request<unknown>(`/api/v1/${context}/search/${itemtype}?${qs}`);
}

// ─── CRUD Genérico ───
export function getItem(context: string, itemtype: string, id: number, expandDropdowns = false) {
  const qs = expandDropdowns ? "?expand_dropdowns=true" : "";
  return request<unknown>(`/api/v1/${context}/${itemtype}/${id}${qs}`);
}

export function getSubItems(context: string, itemtype: string, id: number, subItemtype: string) {
  return request<unknown[]>(`/api/v1/${context}/${itemtype}/${id}/${subItemtype}`);
}

export function listItems(context: string, itemtype: string, rangeStart = 0, rangeEnd = 49, expandDropdowns = false) {
  const qs = new URLSearchParams({
    range_start: String(rangeStart),
    range_end: String(rangeEnd),
    ...(expandDropdowns ? { expand_dropdowns: "true" } : {}),
  }).toString();
  return request<unknown[]>(`/api/v1/${context}/${itemtype}?${qs}`);
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
export function createItem(context: string, itemtype: string, input: Record<string, unknown>) {
  return request<unknown>(`/api/v1/${context}/${itemtype}`, {
    method: "POST",
    body: JSON.stringify({ input }),
  });
}

export function updateItem(context: string, itemtype: string, id: number, input: Record<string, unknown>) {
  return request<unknown>(`/api/v1/${context}/${itemtype}/${id}`, {
    method: "PUT",
    body: JSON.stringify({ input }),
  });
}

export function deleteItem(context: string, itemtype: string, id: number) {
  return request<unknown>(`/api/v1/${context}/${itemtype}/${id}`, {
    method: "DELETE",
  });
}
