import { request } from "./httpClient";

type QueryPrimitive = string | number | boolean | null | undefined;
type QueryValue = QueryPrimitive | QueryPrimitive[];

export type QueryParams = Record<string, QueryValue>;

export function resolveRootContext(context: string): string {
  if (context.startsWith("sis")) return "sis";
  if (context.startsWith("dtic")) return "dtic";
  return context;
}

export function buildApiPath(context: string, resource: string): string {
  const rootContext = resolveRootContext(context);
  const normalizedResource = resource.replace(/^\/+/, "");
  return `/api/v1/${rootContext}/${normalizedResource}`;
}

export function withQuery(path: string, params?: QueryParams): string {
  if (!params) {
    return path;
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== "") {
          query.append(key, String(item));
        }
      }
      continue;
    }

    query.set(key, String(value));
  }

  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export function sessionHeaders(sessionToken: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Session-Token": sessionToken,
  };
}

export function apiGet<T>(path: string, params?: QueryParams): Promise<T> {
  return request<T>(withQuery(path, params));
}

export function apiPost<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  init?: Omit<RequestInit, "body" | "method">,
): Promise<TResponse> {
  return request<TResponse>(path, {
    ...init,
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPut<TResponse, TBody = unknown>(
  path: string,
  body?: TBody,
  init?: Omit<RequestInit, "body" | "method">,
): Promise<TResponse> {
  return request<TResponse>(path, {
    ...init,
    method: "PUT",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiDelete<TResponse>(
  path: string,
  init?: Omit<RequestInit, "method">,
): Promise<TResponse> {
  return request<TResponse>(path, {
    ...init,
    method: "DELETE",
  });
}
