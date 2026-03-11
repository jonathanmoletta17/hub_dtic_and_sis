'use client';

// ═══════════════════════════════════════════════════════════════════
// useFormSchema — Fetch schema real do backend + resolve lookups
// Fallback: mock quando backend não disponível (dev offline)
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { useWizardStore } from '@/store/useWizardStore';
import { useAuthStore } from '@/store/useAuthStore';
import {
  fetchFormSchema,
  fetchLookupItems,
  type ApiFormSchema,
  type ApiFormQuestion,
  type ApiFormSection,
  type ApiFormCondition,
  type LookupItem,
} from '@/lib/api/formService';
import type { FormSchema, FormSection, FormQuestion, FormCondition, DropdownOption } from '@/types/form-schema';

const SHOW_CONDITION_MAP: Record<number, '==' | '!='> = { 1: '==', 2: '!=' };
const SHOW_LOGIC_MAP: Record<number, 'AND' | 'OR'> = { 1: 'AND', 2: 'OR' };

/**
 * Hook que busca o schema real do backend quando formId muda.
 * Resolve lookups (locations, itilcategories) em paralelo.
 * Se o backend falhar, usa mock para desenvolvimento.
 */
export function useFormSchema() {
  const { selectedFormId, setSchema, setLoadingSchema } = useWizardStore();
  const { activeContext } = useAuthStore();
  const [fetchError, setFetchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!selectedFormId) return;

    // Cancelar request anterior
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let cancelled = false;

    async function load() {
      setLoadingSchema(true);
      setFetchError(null);
      if (!activeContext) return;
      const context = activeContext;

      try {
        // Fetch schema real do backend
        const apiSchema = await fetchFormSchema(context, selectedFormId!);

        if (cancelled) return;

        // Transformar e resolver lookups
        const schema = await transformApiSchema(apiSchema, context);

        if (cancelled) return;
        setSchema(schema);
        setLoadingSchema(false);
      } catch (err) {
        if (cancelled) return;
        console.warn('[useFormSchema] Falha ao carregar schema:', err);
        setFetchError(String(err));
        setSchema(null);
        setLoadingSchema(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedFormId, activeContext, setSchema, setLoadingSchema]);

  return { fetchError };
}

// ── Transformação: ApiFormSchema → FormSchema do frontend ──

async function transformApiSchema(
  api: ApiFormSchema,
  context: string
): Promise<FormSchema> {
  const formData = api.form;

  // Coletar lookups necessários, agrupando por source + tree_root
  // Cada question pode ter um tree_root diferente (ex: Carregadores root=55, Vidraçaria root=94)
  const lookupKeys = new Map<string, { source: string; treeRoot?: number }>();
  for (const section of api.sections) {
    for (const q of section.questions) {
      if (q.lookup?.source) {
        const root = Number(q.lookup.params?.show_tree_root) || 0;
        const key = `${q.lookup.source}:${root}`;
        if (!lookupKeys.has(key)) {
          lookupKeys.set(key, { source: q.lookup.source, treeRoot: root || undefined });
        }
      }
    }
  }

  // Buscar lookups em paralelo (cada source+root é uma chamada separada)
  const lookupCache: Record<string, LookupItem[]> = {};
  await Promise.all(
    Array.from(lookupKeys.entries()).map(async ([key, { source, treeRoot }]) => {
      try {
        lookupCache[key] = await fetchLookupItems(context, source, treeRoot);
      } catch {
        lookupCache[key] = [];
      }
    })
  );

  // Indexar condições por question target
  const conditionsByTarget = new Map<number, FormCondition[]>();
  for (const c of api.conditions) {
    if (c.target_itemtype === 'PluginFormcreatorQuestion') {
      const existing = conditionsByTarget.get(c.target_items_id) ?? [];
      existing.push({
        questionId: c.controller_question_id,
        operator: SHOW_CONDITION_MAP[c.show_condition] ?? '==',
        value: c.show_value,
        logic: SHOW_LOGIC_MAP[c.show_logic] ?? 'AND',
      });
      conditionsByTarget.set(c.target_items_id, existing);
    }
  }

  // Transformar seções e questions
  const sections: FormSection[] = api.sections.map((s) =>
    transformSection(s, conditionsByTarget, lookupCache)
  );

  return {
    id: Number(formData.id ?? 0),
    name: String(formData.name ?? ''),
    category: String(formData.plugin_formcreator_categories_id ?? ''),
    accessRights: Number(formData.access_rights ?? 0) === 0 ? 'PRIVATE' : 'PUBLIC',
    sections,
  };
}

function transformSection(
  s: ApiFormSection,
  conditionsByTarget: Map<number, FormCondition[]>,
  lookupCache: Record<string, LookupItem[]>
): FormSection {
  return {
    id: s.id,
    name: s.name,
    order: s.order,
    showRule: (s.show_rule ?? 0) > 1 ? 'conditional' : 'always',
    conditions: [], // Section conditions would need section-level handling
    questions: s.questions.map((q) => transformQuestion(q, conditionsByTarget, lookupCache)),
  };
}

function transformQuestion(
  q: ApiFormQuestion,
  conditionsByTarget: Map<number, FormCondition[]>,
  lookupCache: Record<string, LookupItem[]>
): FormQuestion {
  const conditions = conditionsByTarget.get(q.id) ?? [];

  // Resolver opções
  let options: string[] | undefined;
  let resolvedOptions: DropdownOption[] | undefined;

  if (q.options) {
    options = q.options.map((o) => String(o.label));
  }

  if (q.lookup?.source) {
    // Usar chave source:root para buscar do cache filtrado
    const root = Number(q.lookup.params?.show_tree_root) || 0;
    const cacheKey = `${q.lookup.source}:${root}`;
    const items = lookupCache[cacheKey] ?? [];
    resolvedOptions = items.map((item) => ({
      id: item.id,
      name: item.name,
      completename: item.completename,
    }));
  }

  return {
    id: q.id,
    name: q.name,
    fieldtype: q.fieldtype as FormQuestion['fieldtype'],
    required: q.required,
    row: q.layout?.row ?? 0,
    col: q.layout?.col ?? 0,
    width: q.layout?.width ?? 4,
    options,
    defaultValue: q.default_value != null ? String(q.default_value) : undefined,
    resolvedOptions,
    showRule: conditions.length > 0 ? 'conditional' : 'always',
    conditions,
  };
}
