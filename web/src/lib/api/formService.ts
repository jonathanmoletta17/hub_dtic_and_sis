/**
 * formService — Camada de dados para Formcreator (formulários dinâmicos).
 *
 * CQRS:
 *   LEITURA → /domain/formcreator/... (SQL direto no backend)
 *   ESCRITA → /domain/formcreator/forms/{id}/submit (API GLPI PluginFormcreatorFormAnswer)
 */

import { useAuthStore } from '@/store/useAuthStore';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8080`
    : 'http://glpi-backend:8080');

// ── Types mirroring backend Pydantic schemas ──

export interface ServiceCategory {
  id: number;
  name: string;
  parent_id: number;
  level: number;
  completename?: string;
}

export interface ServiceForm {
  id: number;
  name: string;
  description?: string;
  category_id: number;
  icon?: string;
  icon_color?: string;
  background_color?: string;
}

export interface FormOption {
  label: string;
  value: string | number;
}

export interface FormLookupRef {
  source: string;
  params: Record<string, unknown>;
}

export interface ApiFormQuestion {
  id: number;
  name: string;
  fieldtype: string;
  required: boolean;
  description?: string;
  default_value?: unknown;
  options?: FormOption[];
  lookup?: FormLookupRef;
  layout: { row: number; col: number; width: number };
  show_rule?: number;
}

export interface ApiFormSection {
  id: number;
  name: string;
  order: number;
  questions: ApiFormQuestion[];
  show_rule?: number;
}

export interface ApiFormCondition {
  id: number;
  controller_question_id: number;
  target_itemtype: string;
  target_items_id: number;
  show_condition: number;
  show_logic: number;
  show_value: string;
  order: number;
}

export interface ApiFormSchema {
  form: Record<string, unknown>;
  sections: ApiFormSection[];
  conditions: ApiFormCondition[];
  regexes: Record<string, unknown>[];
  ranges: Record<string, unknown>[];
}

export interface SubmitFormResponse {
  form_answer_id: number;
  message: string;
  ticket_ids: number[];
}

export interface LookupItem {
  id: number;
  name: string;
  completename?: string;
}

// ── HTTP helpers ──

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const { headers: optionHeaders, ...restOptions } = options || {};

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(optionHeaders as Record<string, string>),
  };

  const contextMatch = path.match(/^\/api\/v1\/([^/]+)\//);
  if (contextMatch) {
    const context = contextMatch[1];
    const token = useAuthStore.getState().getSessionToken(context);
    if (token) {
      headers['Session-Token'] = token;
    }
  }

  const res = await fetch(url, { headers, ...restOptions });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── API Endpoints ──

/** Lista categorias de formulário (com cache no backend, TTL 5 min) */
export function fetchFormCategories(context: string): Promise<ServiceCategory[]> {
  return request<ServiceCategory[]>(`/api/v1/${context}/domain/formcreator/categories`);
}

/** Lista formulários ativos e visíveis */
export function fetchFormList(context: string, categoryId?: number): Promise<ServiceForm[]> {
  const qs = categoryId != null ? `?category_id=${categoryId}` : '';
  return request<ServiceForm[]>(`/api/v1/${context}/domain/formcreator/forms${qs}`);
}

/** Busca o schema completo de um formulário (CQRS SQL direto) */
export function fetchFormSchema(context: string, formId: number): Promise<ApiFormSchema> {
  return request<ApiFormSchema>(`/api/v1/${context}/domain/formcreator/forms/${formId}/schema`);
}

/** Submete as respostas de um formulário (cria FormAnswer → Ticket) */
export function submitFormAnswers(
  context: string,
  formId: number,
  answers: Record<string, unknown>
): Promise<SubmitFormResponse> {
  return request<SubmitFormResponse>(
    `/api/v1/${context}/domain/formcreator/forms/${formId}/submit`,
    {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }
  );
}

/** Busca itens de lookup (locations, itilcategories, users) com filtro opcional por sub-árvore */
export function fetchLookupItems(
  context: string,
  source: string,
  treeRoot?: number
): Promise<LookupItem[]> {
  const sourceMap: Record<string, string> = {
    locations: 'lookups/locations',
    itilcategories: 'lookups/itilcategories',
    users: 'lookups/users/technicians',
  };

  const endpoint = sourceMap[source];
  if (!endpoint) {
    // Fallback: try GLPI REST generic list
    return request<LookupItem[]>(`/api/v1/${context}/${source}?range_start=0&range_end=999`);
  }

  // Adiciona tree_root como query param quando disponível
  const qs = treeRoot && treeRoot > 0 ? `?tree_root=${treeRoot}` : '';

  return request<Record<string, unknown>>(`/api/v1/${context}/${endpoint}${qs}`).then(
    (data) => {
      // Backend retorna { context: "sis-manutencao", locations: [...] }
      for (const val of Object.values(data)) {
        if (Array.isArray(val)) return val as LookupItem[];
      }
      return [];
    }
  );
}
