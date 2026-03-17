'use client';

import { useEffect, useRef, useState } from 'react';

import { fetchResolvedFormSchema } from '@/lib/api/formService';
import { useAuthStore } from '@/store/useAuthStore';
import { useWizardStore } from '@/store/useWizardStore';

export function useFormSchema() {
  const { selectedFormId, setSchema, setLoadingSchema } = useWizardStore();
  const { activeContext } = useAuthStore();
  const [fetchError, setFetchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const formId = selectedFormId;

  useEffect(() => {
    if (!formId) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let cancelled = false;
    async function load() {
      setLoadingSchema(true);
      setFetchError(null);
      const resolvedFormId = formId;
      if (!activeContext || !resolvedFormId) {
        return;
      }

      try {
        const schema = await fetchResolvedFormSchema(activeContext, resolvedFormId);
        if (!cancelled) {
          setSchema(schema);
          setLoadingSchema(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[useFormSchema] Falha ao carregar schema:', err);
          setFetchError(String(err));
          setSchema(null);
          setLoadingSchema(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [formId, activeContext, setSchema, setLoadingSchema]);

  return { fetchError };
}
