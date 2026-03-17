'use client';

import { useEffect, useState } from 'react';

import { fetchServiceCatalog, type CatalogGroup } from '@/lib/api/formService';
import { useAuthStore } from '@/store/useAuthStore';

export type { CatalogGroup, CatalogItem } from '@/lib/api/formService';

export function useServiceCatalog() {
  const { activeContext } = useAuthStore();
  const [catalog, setCatalog] = useState<CatalogGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeContext) {
      return;
    }

    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      const context = activeContext;
      if (!context) {
        return;
      }

      try {
        const nextCatalog = await fetchServiceCatalog(context);
        if (!cancelled) {
          setCatalog(nextCatalog);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[useServiceCatalog] API indisponivel, usando fallback:', err);
          setError(String(err));
          setCatalog([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeContext]);

  return { catalog, isLoading, error };
}
