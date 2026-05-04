export const VISIBLE_CONTEXT_IDS = ["dtic", "sis-conservacao", "sis-manutencao"] as const;

export type VisibleContextId = (typeof VISIBLE_CONTEXT_IDS)[number];

type ContextIdentity = {
  id: VisibleContextId;
  label: string;
  shortLabel: string;
  sidebarSubtitle: string;
  selectorLabel: string;
  selectorSubtitle: string;
  selectorDescription: string;
};

const VISUAL_CONTEXT_ALIASES: Record<string, VisibleContextId> = {
  sis: "sis-conservacao",
  "sis-memoria": "sis-conservacao",
};

export const CONTEXT_IDENTITIES: Record<VisibleContextId, ContextIdentity> = {
  dtic: {
    id: "dtic",
    label: "DTIC",
    shortLabel: "DTIC",
    sidebarSubtitle: "Departamento de Tecnologia da Informacao",
    selectorLabel: "DTIC",
    selectorSubtitle: "Tecnologia, acessos e sistemas",
    selectorDescription: "Atendimento de tecnologia, sistemas, redes, e-mail, acessos e equipamentos.",
  },
  "sis-conservacao": {
    id: "sis-conservacao",
    label: "SIS Conservacao",
    shortLabel: "Conservacao",
    sidebarSubtitle: "SIS - Conservacao e Servicos",
    selectorLabel: "SIS Conservacao",
    selectorSubtitle: "Servicos, apoio e conservacao",
    selectorDescription: "Demandas de conservacao, servicos internos, apoio operacional e acompanhamento recorrente.",
  },
  "sis-manutencao": {
    id: "sis-manutencao",
    label: "SIS Manutencao",
    shortLabel: "Manutencao",
    sidebarSubtitle: "SIS - Manutencao Predial",
    selectorLabel: "SIS Manutencao",
    selectorSubtitle: "Predial, campo e materiais",
    selectorDescription: "Ordens prediais, agenda de campo, materiais, equipes e execucao de manutencao.",
  },
};

export function resolveVisualContext(contextId: string | null | undefined): VisibleContextId {
  if (!contextId) return "dtic";
  if (isVisibleContextId(contextId)) return contextId;
  return VISUAL_CONTEXT_ALIASES[contextId] ?? "dtic";
}

export function resolveApiRootContext(contextId: string): string {
  if (contextId.startsWith("sis")) return "sis";
  if (contextId.startsWith("dtic")) return "dtic";
  return contextId;
}

export function isVisibleContextId(contextId: string): contextId is VisibleContextId {
  return VISIBLE_CONTEXT_IDS.includes(contextId as VisibleContextId);
}

export function getContextIdentity(contextId: string | null | undefined): ContextIdentity {
  return CONTEXT_IDENTITIES[resolveVisualContext(contextId)];
}
