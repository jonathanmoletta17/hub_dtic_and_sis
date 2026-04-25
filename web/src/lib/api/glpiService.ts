/**
 * glpiService — Wrapper HTTP para a API Universal Backend.
 * Superficie publica temporaria apenas para auth legado.
 */
import { ApiError } from './httpClient';
import { apiPost, buildApiPath } from './client';
import type { AuthMeResponse } from '@/store/useAuthStore';

// Re-exporta ApiError com alias legado para retrocompatibilidade
export { ApiError as GlpiApiError };

// ─── Auth ───
export function apiLogin(context: string, payload: Record<string, string>) {
  return apiPost<AuthMeResponse, Record<string, string>>(buildApiPath(context, "auth/login"), payload);
}

export function logoutApi(context: string) {
  return apiPost<unknown>(buildApiPath(context, "auth/logout"));
}
