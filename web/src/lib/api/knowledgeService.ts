/**
 * knowledgeService — Client HTTP para a Base de Conhecimento GLPI.
 * Consome os endpoints /api/v1/dtic/knowledge/*
 * 
 * Leitura: busca artigos/categorias (sem autenticação)
 * Escrita: CRUD de artigos (requer Session-Token do técnico)
 */

import { request } from './httpClient';

// ─── Types ───

export interface KBCategory {
  id: number;
  name: string;
  completename: string;
  level: number;
  article_count: number;
}

export interface KBArticleSummary {
  id: number;
  name: string;
  category: string | null;
  category_id: number | null;
  author: string | null;
  date_creation: string | null;
  date_mod: string | null;
  is_faq: boolean;
  view_count: number;
}

export interface KBArticleDetail extends KBArticleSummary {
  answer: string;
}

export interface KBArticlePayload {
  name: string;
  answer: string;
  knowbaseitemcategories_id?: number | null;
  is_faq?: number;
}

// ─── Helpers ───

function authHeaders(sessionToken: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Session-Token": sessionToken,
  };
}

// ─── Leitura (pública) ───

export async function fetchKBCategories(params?: {
  is_faq?: boolean;
}): Promise<KBCategory[]> {
  const qs = new URLSearchParams();
  if (params?.is_faq !== undefined) qs.set("is_faq", String(params.is_faq));
  const query = qs.toString();
  const data = await request<{ categories: KBCategory[] }>(
    `/api/v1/dtic/knowledge/categories${query ? `?${query}` : ""}`
  );
  return data.categories;
}

export async function fetchKBArticles(params?: {
  q?: string;
  category_id?: number;
  is_faq?: boolean;
  limit?: number;
}): Promise<{ total: number; articles: KBArticleSummary[] }> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.category_id) qs.set("category_id", String(params.category_id));
  if (params?.is_faq !== undefined) qs.set("is_faq", String(params.is_faq));
  if (params?.limit) qs.set("limit", String(params.limit));

  const query = qs.toString();
  return request<{ total: number; articles: KBArticleSummary[] }>(
    `/api/v1/dtic/knowledge/articles${query ? `?${query}` : ""}`
  );
}

export async function fetchKBArticle(id: number): Promise<KBArticleDetail> {
  const data = await request<{ article: KBArticleDetail }>(
    `/api/v1/dtic/knowledge/articles/${id}`
  );
  return data.article;
}

// ─── Escrita (requer Session-Token) ───

export async function createKBArticle(
  sessionToken: string,
  payload: KBArticlePayload
): Promise<{ success: boolean; data: unknown; message: string }> {
  return request("/api/v1/dtic/knowledge/articles", {
    method: "POST",
    headers: authHeaders(sessionToken),
    body: JSON.stringify(payload),
  });
}

export async function updateKBArticle(
  sessionToken: string,
  id: number,
  payload: Partial<KBArticlePayload>
): Promise<{ success: boolean; data: unknown; message: string }> {
  return request(`/api/v1/dtic/knowledge/articles/${id}`, {
    method: "PUT",
    headers: authHeaders(sessionToken),
    body: JSON.stringify(payload),
  });
}

export async function deleteKBArticle(
  sessionToken: string,
  id: number
): Promise<{ success: boolean; data: unknown; message: string }> {
  return request(`/api/v1/dtic/knowledge/articles/${id}`, {
    method: "DELETE",
    headers: authHeaders(sessionToken),
  });
}
