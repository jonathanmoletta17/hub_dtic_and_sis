/**
 * knowledgeService — Client HTTP para a Base de Conhecimento GLPI.
 * Consome os endpoints /api/v1/dtic/knowledge/*
 * 
 * Leitura: busca artigos/categorias (sem autenticação)
 * Escrita: CRUD de artigos (requer Session-Token do técnico)
 */

import { apiDelete, apiGet, apiPost, apiPut, buildApiPath, sessionHeaders } from './client';
import type { KBArticleResponseDto, KBCategoryDto, KBListResponseDto } from './contracts/knowledge';
import {
  mapKBArticleResponseDto,
  mapKBCategoryDto,
  mapKBListResponseDto,
} from './mappers/knowledge';
import type {
  KBArticleDetail,
  KBArticlePayload,
  KBCategory,
  KBListResult,
} from './models/knowledge';

export type { KBArticleDetail, KBArticlePayload, KBArticleSummary, KBCategory, KBListResult } from "./models/knowledge";

// ─── Leitura (pública) ───

export async function fetchKBCategories(params?: {
  is_faq?: boolean;
}): Promise<KBCategory[]> {
  const data = await apiGet<{ categories: KBCategoryDto[] }>(
    buildApiPath("dtic", "knowledge/categories"),
    params?.is_faq !== undefined ? { is_faq: params.is_faq } : undefined,
  );
  return data.categories.map(mapKBCategoryDto);
}

export async function fetchKBArticles(params?: {
  q?: string;
  category_id?: number;
  is_faq?: boolean;
  limit?: number;
}): Promise<KBListResult> {
  const data = await apiGet<KBListResponseDto>(
    buildApiPath("dtic", "knowledge/articles"),
    {
      q: params?.q,
      category_id: params?.category_id,
      is_faq: params?.is_faq,
      limit: params?.limit,
    },
  );
  return mapKBListResponseDto(data);
}

export async function fetchKBArticle(id: number): Promise<KBArticleDetail> {
  const data = await apiGet<KBArticleResponseDto>(buildApiPath("dtic", `knowledge/articles/${id}`));
  return mapKBArticleResponseDto(data);
}

// ─── Escrita (requer Session-Token) ───

export async function createKBArticle(
  sessionToken: string,
  payload: KBArticlePayload
): Promise<{ success: boolean; data: unknown; message: string }> {
  return apiPost(buildApiPath("dtic", "knowledge/articles"), payload, {
    headers: sessionHeaders(sessionToken),
  });
}

export async function updateKBArticle(
  sessionToken: string,
  id: number,
  payload: Partial<KBArticlePayload>
): Promise<{ success: boolean; data: unknown; message: string }> {
  return apiPut(buildApiPath("dtic", `knowledge/articles/${id}`), payload, {
    headers: sessionHeaders(sessionToken),
  });
}

export async function deleteKBArticle(
  sessionToken: string,
  id: number
): Promise<{ success: boolean; data: unknown; message: string }> {
  return apiDelete(buildApiPath("dtic", `knowledge/articles/${id}`), {
    headers: sessionHeaders(sessionToken),
  });
}
