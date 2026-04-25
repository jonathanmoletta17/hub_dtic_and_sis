// ╔══════════════════════════════════════════════════════════════════╗
// ║  ZONA PROTEGIDA — httpClient.ts                                 ║
// ║  Qualquer alteração aqui exige plano pré-aprovado.              ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  PROIBIDO:                                                       ║
// ║    · Alterar regex/replace de normalização de paths de contexto  ║
// ║    · Mudar lógica de injeção de Session-Token                    ║
// ║    · Alterar interceptores sem mapear TODOS os paths afetados    ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  PERMITIDO (sem aprovação):                                      ║
// ║    · Adicionar headers específicos para novos endpoints          ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  DEPENDENTES: todos os módulos frontend (100% dos requests)      ║
// ║  RISCO: regex malformada → 404 em toda a aplicação               ║
// ║  REFERÊNCIA: ARCHITECTURE_RULES.md → Zonas de Proteção          ║
// ╚══════════════════════════════════════════════════════════════════╝
/**
 * httpClient — Módulo HTTP centralizado para comunicação com o Backend.
 *
 * Responsabilidades:
 *  1. API_BASE resolution (same-origin no browser, INTERNAL_API_URL no server)
 *  2. Normalização de sub-contextos (sis-manutencao → sis) antes do fetch
 *  3. Injeção automática de Session-Token baseado no contexto da URL
 *  4. Tratamento padronizado de erros
 */
import { useAuthStore } from '@/store/useAuthStore';
import { resolveApiBase } from '@/lib/config/runtime';

export const API_BASE = resolveApiBase();

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
  const normalizedPath = normalizeApiPath(path);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(optionHeaders as Record<string, string>)
  };

  // Extrai o contexto original da URL para injetar o token correto da store
  const originalContext = path.match(/^\/api\/v1\/([^/]+)\//)?.[1];
  const normalizedContext = normalizedPath.match(/^\/api\/v1\/([^/]+)\//)?.[1];
  if (!headers["Session-Token"] && (originalContext || normalizedContext)) {
    const token = (originalContext && useAuthStore.getState().getSessionToken(originalContext))
      || (normalizedContext && useAuthStore.getState().getSessionToken(normalizedContext));
    if (token) {
      headers["Session-Token"] = token;
    }
  }

  // Header auxiliar para autorizacao por papel ativo no backend.
  if (!headers["X-Active-Hub-Role"] && (originalContext || normalizedContext)) {
    const activeRole =
      (originalContext && useAuthStore.getState().getActiveHubRoleForContext(originalContext))
      || (normalizedContext && useAuthStore.getState().getActiveHubRoleForContext(normalizedContext))
      || null;

    if (activeRole?.role) {
      headers["X-Active-Hub-Role"] = activeRole.role;
    }
  }

  // Normaliza a URL para o backend
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

