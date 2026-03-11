/**
 * context-registry.ts — Single Source of Truth para contextos e menus do Hub.
 *
 * Consome dados de 3 arquivos de configuração:
 *   - features.json   → quais features existem em cada contexto
 *   - themes.json     → cores, gradients, ícones por contexto
 *   - labels.pt-BR.json → textos de UI (preparação i18n)
 *
 * API pública exportada (retrocompatível):
 *   - CONTEXT_MANIFESTS: ContextManifest[]
 *   - getContextManifest(id): ContextManifest | null
 *   - resolveMenuItems(contextId, userRoles, appAccess): FeatureManifest[]
 *   - getContextTheme(contextId): string
 */

import featuresConfig from './config/features.json';
import themesConfig from './config/themes.json';
import labelsConfig from './config/labels.pt-BR.json';

// ─── Tipos públicos (inalterados) ───

export interface FeatureManifest {
  id: string;              // "dashboard", "chargers"
  label: string;           // "Dashboard", "Carregadores"
  icon: string;            // "LayoutDashboard", "Cpu"
  route: string;           // "/sis/dashboard"
  requiredRoles: string[]; // ["tecnico", "gestor"] - se vazio aceita qualquer role
  requireApp?: string;     // future feature flags/tags
}

export interface ContextManifest {
  id: string;               // "dtic", "sis"
  label: string;            // "Ecossistema Digital"
  subtitle: string;         // "DTIC • Inteligência & Sistemas"
  description: string;
  icon: string;             // Lucide icon key
  color: string;            // CSS var 
  accentClass: string;      // Tailwind class "bg-accent-blue"
  gradient: string;
  glowColor: string;
  borderColor: string;
  dashboardTitle: string;
  dashboardSubtitle: string;
  features: FeatureManifest[];
}

// ─── Tipagem interna dos JSONs ───

type FeatureEntry = {
  id: string;
  icon: string;
  route: string;
  requiredRoles: string[];
  requireApp?: string;
};

type ThemeEntry = {
  icon: string;
  color: string;
  accentClass: string;
  gradient: string;
  glowColor: string;
  borderColor: string;
};

type ContextLabels = {
  label: string;
  subtitle: string;
  description: string;
  dashboardTitle: string;
  dashboardSubtitle: string;
};

// ─── Builder: monta CONTEXT_MANIFESTS a partir dos JSONs ───

function buildManifests(): ContextManifest[] {
  const contextIds = Object.keys(featuresConfig) as Array<keyof typeof featuresConfig>;
  const featureLabels = labelsConfig.features as Record<string, string>;
  const contextLabels = labelsConfig.contexts as Record<string, ContextLabels>;
  const themes = themesConfig as Record<string, ThemeEntry>;

  return contextIds.map(ctxId => {
    const rawFeatures = (featuresConfig[ctxId] as FeatureEntry[]) || [];
    const theme = themes[ctxId];
    const labels = contextLabels[ctxId];

    if (!theme || !labels) {
      console.warn(`[context-registry] Contexto "${ctxId}" sem tema ou labels configurados.`);
    }

    const features: FeatureManifest[] = rawFeatures.map(f => ({
      ...f,
      label: featureLabels[f.id] || f.id,
    }));

    return {
      id: ctxId,
      label: labels?.label ?? ctxId,
      subtitle: labels?.subtitle ?? '',
      description: labels?.description ?? '',
      icon: theme?.icon ?? 'Network',
      color: theme?.color ?? '#888',
      accentClass: theme?.accentClass ?? '',
      gradient: theme?.gradient ?? '',
      glowColor: theme?.glowColor ?? '',
      borderColor: theme?.borderColor ?? '',
      dashboardTitle: labels?.dashboardTitle ?? '',
      dashboardSubtitle: labels?.dashboardSubtitle ?? '',
      features,
    };
  });
}

// ─── Exportações públicas (API idêntica ao original) ───

export const CONTEXT_MANIFESTS: ContextManifest[] = buildManifests();

export function getContextManifest(contextId: string | null): ContextManifest | null {
  if (!contextId) return null;
  return CONTEXT_MANIFESTS.find(m => m.id === contextId) || null;
}

export function resolveMenuItems(contextId: string, userRoles: string[], appAccess: string[] = []): FeatureManifest[] {
  const manifest = getContextManifest(contextId);
  if (!manifest) return [];

  return manifest.features.filter(feature => {
    // 1. Verificação de App-Level Access (Abordagem C)
    if (feature.requireApp && !appAccess.includes(feature.requireApp)) {
      return false; // Bloqueia imediatamente
    }

    // 2. Se não exige role ou a lista de permitidos for vazia, mostra para todos
    if (!feature.requiredRoles || feature.requiredRoles.length === 0) return true;
    
    // Mostra se o user possui ao menos uma das roles exigidas
    return userRoles.some(role => {
      if (feature.requiredRoles.includes(role)) return true;
      // Trata sub-roles: ex: 'tecnico-manutencao' tem permissão a funcionalidades de 'tecnico'
      if (feature.requiredRoles.some(req => role.startsWith(req + '-'))) return true;
      return false;
    });
  }).map(f => ({
      ...f,
      // injeta o contexto na rota dinamicamente se for uma rota base como /dashboard
      route: f.route.startsWith('/') ? `/${contextId}${f.route}` : `/${contextId}/${f.route}`
  }));
}

export function getContextTheme(contextId: string): string {
  // Theme map to match CSS classes setup (theme-dtic, theme-sis, etc)
  return `theme-${contextId}`;
}
