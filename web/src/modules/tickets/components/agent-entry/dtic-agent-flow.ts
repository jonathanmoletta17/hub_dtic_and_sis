export type DticAgentId = "incidentes" | "acessos" | "operacional";
export type DticUrgency = "critico" | "alto" | "normal";
export type DticScope = "individual" | "equipe" | "setor";
export type DticSurface = "rede" | "equipamento" | "sistema" | "acesso";

export type DticAgentDraft = {
  agentId: DticAgentId;
  urgency: DticUrgency;
  scope: DticScope;
  surface: DticSurface;
  narrative: string;
};

export type DticAgentDefinition = {
  id: DticAgentId;
  title: string;
  shortTitle: string;
  description: string;
  handoffTitle: string;
  defaultSurface: DticSurface;
  checklist: string[];
};

export type DticStructuredHandoff = {
  version: 1;
  source: "hub-operacional-web";
  context: "dtic";
  agentId: DticAgentId;
  agentTitle: string;
  handoffTitle: string;
  urgency: DticUrgency;
  urgencyLabel: string;
  scope: DticScope;
  scopeLabel: string;
  surface: DticSurface;
  surfaceLabel: string;
  queueLabel: string;
  narrative: string;
  summary: string;
  prompt: string;
};

export type DticAgentOutcome = {
  summaryTitle: string;
  summaryLines: string[];
  handoffBrief: string;
  handoffQuery: string;
  handoffPayload: DticStructuredHandoff;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  queueLabel: string;
  urgencyTone: "critical" | "warning" | "neutral";
};

export const DTIC_AGENT_DEFINITIONS: DticAgentDefinition[] = [
  {
    id: "incidentes",
    title: "Incidentes e indisponibilidade",
    shortTitle: "Incidentes",
    description: "Quedas, falhas, indisponibilidade de rede, equipamento ou sistema que exigem triagem técnica imediata.",
    handoffTitle: "Incidente operacional",
    defaultSurface: "rede",
    checklist: [
      "Identificar se a falha bloqueia uma pessoa, equipe ou setor inteiro.",
      "Confirmar se existe impacto em rede, equipamento ou sistema.",
      "Levar o resumo para a fila técnica quando houver indisponibilidade ativa.",
    ],
  },
  {
    id: "acessos",
    title: "Acessos e credenciais",
    shortTitle: "Acessos",
    description: "Perfis, permissões, grupos, credenciais, SEI e desbloqueios que precisam de contexto claro antes do atendimento.",
    handoffTitle: "Demanda de acesso",
    defaultSurface: "acesso",
    checklist: [
      "Registrar se a demanda é bloqueio total ou ajuste planejado.",
      "Deixar explícito qual sistema, grupo ou permissão está envolvido.",
      "Direcionar para a fila técnica sempre que houver indisponibilidade crítica.",
    ],
  },
  {
    id: "operacional",
    title: "Pedidos operacionais",
    shortTitle: "Pedidos",
    description: "Solicitações técnicas planejadas, software, equipamentos ou apoio operacional sem depender do FormCreator.",
    handoffTitle: "Pedido operacional",
    defaultSurface: "sistema",
    checklist: [
      "Descrever o objetivo do pedido e o impacto esperado.",
      "Diferenciar solicitação planejada de bloqueio operacional.",
      "Encaminhar para o solicitante acompanhar quando não houver urgência crítica.",
    ],
  },
];

const URGENCY_LABELS: Record<DticUrgency, string> = {
  critico: "Critico",
  alto: "Alto",
  normal: "Normal",
};

const SCOPE_LABELS: Record<DticScope, string> = {
  individual: "Impacta uma pessoa",
  equipe: "Impacta uma equipe",
  setor: "Impacta um setor ou unidade",
};

const SURFACE_LABELS: Record<DticSurface, string> = {
  rede: "Rede",
  equipamento: "Equipamento",
  sistema: "Sistema",
  acesso: "Acesso / permissao",
};

export function getDticAgentDefinition(agentId: DticAgentId): DticAgentDefinition {
  return DTIC_AGENT_DEFINITIONS.find((item) => item.id === agentId) ?? DTIC_AGENT_DEFINITIONS[0];
}

export function buildDticAgentOutcome(draft: DticAgentDraft): DticAgentOutcome {
  const definition = getDticAgentDefinition(draft.agentId);
  const severityEscalated =
    draft.urgency === "critico" || draft.scope === "setor" || draft.agentId === "incidentes";
  const needsTechnicalQueue =
    severityEscalated || draft.urgency === "alto" || draft.surface === "rede" || draft.surface === "equipamento";

  const primaryHref = needsTechnicalQueue ? "/dtic/dashboard" : "/dtic/user";
  const primaryLabel = needsTechnicalQueue ? "Ir para a fila tecnica" : "Ir para meus chamados";
  const secondaryHref = needsTechnicalQueue ? "/dtic/user" : "/dtic/dashboard";
  const secondaryLabel = needsTechnicalQueue ? "Acompanhar como solicitante" : "Abrir fila tecnica";
  const queueLabel = needsTechnicalQueue ? "Encaminhamento tecnico" : "Acompanhamento de solicitante";

  const summaryLines = [
    `${definition.handoffTitle} em ${SURFACE_LABELS[draft.surface].toLowerCase()}.`,
    `Urgencia ${URGENCY_LABELS[draft.urgency].toLowerCase()} com escopo ${SCOPE_LABELS[draft.scope].toLowerCase()}.`,
    draft.narrative.trim(),
  ];

  const handoffBrief = [
    `[${definition.shortTitle}] ${SURFACE_LABELS[draft.surface]} - ${URGENCY_LABELS[draft.urgency]}`,
    `Escopo: ${SCOPE_LABELS[draft.scope]}`,
    `Resumo: ${draft.narrative.trim()}`,
  ].join("\n");
  const narrative = draft.narrative.trim();
  const handoffPayload: DticStructuredHandoff = {
    version: 1,
    source: "hub-operacional-web",
    context: "dtic",
    agentId: draft.agentId,
    agentTitle: definition.title,
    handoffTitle: definition.handoffTitle,
    urgency: draft.urgency,
    urgencyLabel: URGENCY_LABELS[draft.urgency],
    scope: draft.scope,
    scopeLabel: SCOPE_LABELS[draft.scope],
    surface: draft.surface,
    surfaceLabel: SURFACE_LABELS[draft.surface],
    queueLabel,
    narrative,
    summary: handoffBrief,
    prompt: [
      narrative,
      `Contexto DTIC.`,
      `Trilha: ${definition.shortTitle}.`,
      `Superficie: ${SURFACE_LABELS[draft.surface]}.`,
      `Escopo: ${SCOPE_LABELS[draft.scope]}.`,
      `Urgencia declarada: ${URGENCY_LABELS[draft.urgency]}.`,
    ].join(" "),
  };

  return {
    summaryTitle: definition.handoffTitle,
    summaryLines,
    handoffBrief,
    handoffQuery: handoffBrief.replace(/\n+/g, " ").trim(),
    handoffPayload,
    primaryHref,
    primaryLabel,
    secondaryHref,
    secondaryLabel,
    queueLabel,
    urgencyTone: draft.urgency === "critico" ? "critical" : draft.urgency === "alto" ? "warning" : "neutral",
  };
}

export const DTIC_AGENT_LABELS = {
  urgency: URGENCY_LABELS,
  scope: SCOPE_LABELS,
  surface: SURFACE_LABELS,
};
