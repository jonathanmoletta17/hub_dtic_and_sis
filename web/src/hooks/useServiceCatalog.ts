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

// ── Fallback estático (usado se API falhar) ──

const FALLBACK_CATALOG: CatalogGroup[] = [
  {
    id: -1, group: 'Manutenção', icon: '🔧', items: [
      { formId: 1, name: 'Ar-Condicionado', icon: '❄️', categoryId: 0, techOnly: false },
      { formId: 5, name: 'Elétrica', icon: '⚡', categoryId: 0, techOnly: false },
      { formId: 2, name: 'Elevadores', icon: '🛗', categoryId: 0, techOnly: false },
      { formId: 6, name: 'Hidráulica', icon: '🚿', categoryId: 0, techOnly: false },
      { formId: 9, name: 'Marcenaria', icon: '🪵', categoryId: 0, techOnly: false },
      { formId: 11, name: 'Pedreiro', icon: '🧱', categoryId: 0, techOnly: false },
      { formId: 12, name: 'Pintura', icon: '🎨', categoryId: 0, techOnly: false },
      { formId: 13, name: 'Técnico de Redes', icon: '🌐', categoryId: 0, techOnly: false },
      { formId: 14, name: 'Vidraçaria', icon: '🪟', categoryId: 0, techOnly: false },
    ],
  },
  {
    id: -2, group: 'Conservação', icon: '🧹', items: [
      { formId: 3, name: 'Carregadores', icon: '🔋', categoryId: 0, techOnly: false },
      { formId: 4, name: 'Copa', icon: '☕', categoryId: 0, techOnly: false },
      { formId: 7, name: 'Jardinagem', icon: '🌿', categoryId: 0, techOnly: false },
      { formId: 8, name: 'Limpeza', icon: '🧽', categoryId: 0, techOnly: false },
      { formId: 10, name: 'Mensageria', icon: '📨', categoryId: 0, techOnly: false },
    ],
  },
  {
    id: -3, group: 'Checklists', icon: '📋', items: [
      { formId: 41, name: 'CHECKLIST', icon: '✅', description: 'Inspeção de campo', categoryId: 0, techOnly: true },
      { formId: 43, name: 'CHECKLIST [Duplicar]', icon: '📄', description: 'Cópia de inspeção', categoryId: 0, techOnly: true },
    ],
  },
];

// ── Hook ──

export function useServiceCatalog() {
  const { activeContext } = useAuthStore();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [forms, setForms] = useState<ServiceForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const context = activeContext || 'sis-manutencao';
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
    if (forms.length === 0) return FALLBACK_CATALOG;

    // Indexar categorias por ID
    const catMap = new Map(categories.map((c) => [c.id, c]));

    // Agrupar forms por category_id
    const grouped = new Map<number, CatalogItem[]>();
    for (const f of forms) {
      const items = grouped.get(f.category_id) ?? [];
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
      grouped.set(f.category_id, items);
    }

    // Compor grupos
    const groups: CatalogGroup[] = [];
    for (const [catId, items] of grouped) {
      const cat = catMap.get(catId);
      const groupName = cat?.completename ?? cat?.name ?? `Categoria ${catId}`;
      groups.push({
        id: catId,
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
