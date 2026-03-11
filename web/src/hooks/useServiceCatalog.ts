'use client';

// ═══════════════════════════════════════════════════════════════════
// useServiceCatalog — Fetch categorias + formulários da API real
// Agrupa formulários por categoria e fornece fallback estático.
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import {
  fetchFormCategories,
  fetchFormList,
  type ServiceCategory,
  type ServiceForm,
} from '@/lib/api/formService';

export interface CatalogGroup {
  id: number;
  group: string;
  icon: string;
  items: CatalogItem[];
}

export interface CatalogItem {
  formId: number;
  name: string;
  description?: string;
  icon?: string;
  categoryId: number;
  techOnly: boolean;
}

// Ícones estáticos por nome de serviço (best-effort mapping)
const SERVICE_ICON_MAP: Record<string, string> = {
  'ar-condicionado': '❄️', 'ar condicionado': '❄️',
  'elétrica': '⚡', 'eletrica': '⚡',
  'elevadores': '🛗', 'elevador': '🛗',
  'hidráulica': '🚿', 'hidraulica': '🚿',
  'marcenaria': '🪵',
  'pedreiro': '🧱',
  'pintura': '🎨',
  'técnico de redes': '🌐', 'tecnico de redes': '🌐',
  'vidraçaria': '🪟', 'vidracaria': '🪟',
  'carregadores': '🔋',
  'copa': '☕',
  'jardinagem': '🌿',
  'limpeza': '🧽',
  'mensageria': '📨',
  'checklist': '✅',
};

const CATEGORY_ICON_MAP: Record<string, string> = {
  'manutenção': '🔧', 'manutencao': '🔧', 'manutenção > manutenção': '🔧',
  'conservação': '🧹', 'conservacao': '🧹', 'conservação > conservação': '🧹',
  'checklists': '📋', 'checklist': '📋',
};

function getServiceIcon(name: string): string {
  const lower = name.toLowerCase().trim();
  return SERVICE_ICON_MAP[lower] ?? '📋';
}

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase().trim();
  return CATEGORY_ICON_MAP[lower] ?? '📁';
}

// ── Hook ──

export function useServiceCatalog() {
  const { activeContext } = useAuthStore();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [forms, setForms] = useState<ServiceForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeContext) return;
    const context = activeContext;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const [cats, fms] = await Promise.all([
          fetchFormCategories(context),
          fetchFormList(context),
        ]);
        if (cancelled) return;
        setCategories(cats);
        setForms(fms);
      } catch (err) {
        if (cancelled) return;
        console.warn('[useServiceCatalog] API indisponível, usando fallback:', err);
        setError(String(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [activeContext]);

  // Monta catálogo agrupado
  const catalog: CatalogGroup[] = useMemo(() => {
    if (forms.length === 0) return [];

    // Indexar categorias por ID
    const catMap = new Map(categories.map((c) => [c.id, c]));

    // Agrupar forms pelo nome limpo da categoria (resolve duplicatas no GLPI)
    const groupedByName = new Map<string, CatalogItem[]>();
    for (const f of forms) {
      const cat = catMap.get(f.category_id);
      const rawName = cat?.completename ?? cat?.name ?? `Categoria ${f.category_id}`;
      // Limpa duplicatas tipo "Manutenção > Manutenção"
      const parts = rawName.split(' > ');
      const cleanName = parts[parts.length - 1].trim();

      const items = groupedByName.get(cleanName) ?? [];
      const isChecklist =
        f.name.toLowerCase().includes('checklist') ||
        f.name.toLowerCase().includes('inspeção');

      items.push({
        formId: f.id,
        name: f.name,
        description: f.description ?? undefined,
        icon: getServiceIcon(f.name),
        categoryId: f.category_id,
        techOnly: isChecklist,
      });
      groupedByName.set(cleanName, items);
    }

    // Compor grupos
    const groups: CatalogGroup[] = [];
    let groupIdCounter = 1;
    for (const [groupName, items] of groupedByName) {
      groups.push({
        id: groupIdCounter++,
        group: groupName,
        icon: getCategoryIcon(groupName),
        items: items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      });
    }

    // Ordenar: categorias pelo nome, Checklists sempre por último
    return groups.sort((a, b) => {
      const aCheck = a.items.every((i) => i.techOnly);
      const bCheck = b.items.every((i) => i.techOnly);
      if (aCheck !== bCheck) return aCheck ? 1 : -1;
      return a.group.localeCompare(b.group, 'pt-BR');
    });
  }, [categories, forms]);

  return { catalog, isLoading, error };
}
