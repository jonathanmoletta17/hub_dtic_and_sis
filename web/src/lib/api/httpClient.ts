/**
 * httpClient — Módulo HTTP centralizado para comunicação com o Backend.
 *
 * Responsabilidades:
 *  1. API_BASE resolution (env var ou fallback via window.location)
 *  2. Normalização de sub-contextos (sis-manutencao → sis) antes do fetch
 *  3. Injeção automática de Session-Token baseado no contexto da URL
 *  4. Tratamento padronizado de erros
 */
import { useAuthStore } from '@/store/useAuthStore';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8080`
    : "http://glpi-backend:8080");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/**
 * Normaliza sub-contextos na URL (ex: /api/v1/sis-manutencao/... → /api/v1/sis/...).
 * O backend FastAPI aceita apenas os contextos-raiz 'sis' e 'dtic'.
 */
export function normalizeApiPath(path: string): string {
  let normalized = path.replace(/^\/api\/v1\/(sis-[^/]+)\//, '/api/v1/sis/');
  normalized = normalized.replace(/^\/api\/v1\/(dtic-[^/]+)\//, '/api/v1/dtic/');
  return normalized;
}

/**
 * Request HTTP centralizado com:
 * - Normalização automática de sub-contexto
 * - Injeção de Session-Token via Zustand store
 * - Tratamento de erro padronizado (ApiError)
 */
export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { headers: optionHeaders, ...restOptions } = options || {};

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(optionHeaders as Record<string, string>)
  };

  // Extrai o contexto original da URL para injetar o token correto da store
  const contextMatch = path.match(/^\/api\/v1\/([^/]+)\//);
  if (contextMatch) {
    const originalContext = contextMatch[1];
    const token = useAuthStore.getState().getSessionToken(originalContext);
    if (token) {
      headers["Session-Token"] = token;
    }
  }

  // Normaliza a URL para o backend
  const normalizedPath = normalizeApiPath(path);
  const url = `${API_BASE}${normalizedPath}`;

  const res = await fetch(url, {
    headers,
    ...restOptions,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(body.detail || res.statusText, res.status);
  }

  return res.json() as Promise<T>;
}

