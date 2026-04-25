import type { CatalogGroup, CatalogItem } from "@/lib/api/formService";

export type ServiceFamilyId =
  | "all"
  | "infra"
  | "support"
  | "network"
  | "projects"
  | "checklists"
  | "general";

export type ServiceIconKey =
  | "snowflake"
  | "battery"
  | "coffee"
  | "zap"
  | "droplets"
  | "trees"
  | "sparkles"
  | "hammer"
  | "send"
  | "network"
  | "clipboard"
  | "folder"
  | "layers"
  | "building"
  | "wrench";

export interface PresentedService {
  formId: number;
  rawName: string;
  displayName: string;
  summary: string;
  familyId: Exclude<ServiceFamilyId, "all">;
  familyLabel: string;
  familyTagLabel: string;
  iconKey: ServiceIconKey;
  techOnly: boolean;
  hasDraft: boolean;
  badge?: string;
  helperText?: string;
  keywords: string[];
  sortOrder: number;
}

export interface PresentedFamily {
  id: ServiceFamilyId;
  label: string;
  description: string;
  count: number;
}

interface ServicePresentationMeta {
  displayName?: string;
  summary: string;
  familyId: Exclude<ServiceFamilyId, "all">;
  iconKey: ServiceIconKey;
  keywords?: string[];
  badge?: string;
  helperText?: string;
  sortOrder?: number;
}

const FAMILY_META: Record<
  Exclude<ServiceFamilyId, "all">,
  Omit<PresentedFamily, "count"> & { tagLabel: string }
> = {
  infra: {
    id: "infra",
    label: "Infraestrutura Predial",
    tagLabel: "Infraestrutura",
    description: "Instalacoes, climatizacao, estruturas e reparos prediais.",
  },
  support: {
    id: "support",
    label: "Apoio Operacional",
    tagLabel: "Apoio",
    description: "Limpeza, copa, jardinagem, mensageria e apoio de rotina.",
  },
  network: {
    id: "network",
    label: "Redes e Equipamentos",
    tagLabel: "Redes",
    description: "Conectividade, equipamentos e ocorrencias de operacao.",
  },
  projects: {
    id: "projects",
    label: "Projetos e Demandas Especiais",
    tagLabel: "Projetos",
    description: "Projetos, estudos, consolidacao de pedidos e demandas combinadas.",
  },
  checklists: {
    id: "checklists",
    label: "Checklists Tecnicos",
    tagLabel: "Checklists",
    description: "Inspecoes e checklists usados por equipes tecnicas.",
  },
  general: {
    id: "general",
    label: "Triagem e apoio",
    tagLabel: "Triagem",
    description: "Entradas amplas quando a frente correta ainda precisa ser definida.",
  },
};

const SERVICE_META_BY_KEY: Record<string, ServicePresentationMeta> = {
  "ar-condicionado": {
    summary: "Climatizacao, refrigeracao e ocorrencias com ar-condicionado.",
    familyId: "infra",
    iconKey: "snowflake",
    keywords: ["ar", "climatizacao", "refrigeracao", "temperatura"],
    sortOrder: 10,
  },
  carregadores: {
    summary: "Solicitacoes e ocorrencias ligadas a operacao de carregadores.",
    familyId: "network",
    iconKey: "battery",
    keywords: ["carregador", "recarga", "equipamento", "estacao"],
    sortOrder: 14,
  },
  copa: {
    summary: "Demandas de apoio de copa e suprimentos imediatos.",
    familyId: "support",
    iconKey: "coffee",
    keywords: ["copa", "cafe", "suprimento", "apoio"],
    sortOrder: 40,
  },
  diversos: {
    summary: "Use quando a demanda nao se encaixa claramente nos servicos listados.",
    familyId: "general",
    iconKey: "layers",
    keywords: ["diversos", "outro", "geral"],
    badge: "Apoio de triagem",
    sortOrder: 92,
  },
  elevadores: {
    summary: "Falhas, manutencao e acompanhamento de elevadores.",
    familyId: "infra",
    iconKey: "building",
    keywords: ["elevador", "andar", "porta", "parado"],
    sortOrder: 22,
  },
  eletrica: {
    displayName: "Eletrica",
    summary: "Tomadas, lampadas, disjuntores e reparos eletricos.",
    familyId: "infra",
    iconKey: "zap",
    keywords: ["eletrica", "tomada", "lampada", "disjuntor", "energia"],
    sortOrder: 12,
  },
  hidraulica: {
    displayName: "Hidraulica",
    summary: "Vazamentos, torneiras, descargas e manutencao hidraulica.",
    familyId: "infra",
    iconKey: "droplets",
    keywords: ["hidraulica", "vazamento", "torneira", "agua", "descarga"],
    sortOrder: 16,
  },
  jardinagem: {
    summary: "Poda, paisagismo, irrigacao e conservacao de areas verdes.",
    familyId: "support",
    iconKey: "trees",
    keywords: ["jardim", "grama", "poda", "area verde"],
    sortOrder: 48,
  },
  limpeza: {
    summary: "Limpeza operacional, higienizacao e apoio de conservacao.",
    familyId: "support",
    iconKey: "sparkles",
    keywords: ["limpeza", "higienizacao", "sujeira", "residuo"],
    sortOrder: 42,
  },
  manutencao: {
    displayName: "Manutencao geral",
    summary: "Entrada ampla para manutencao quando a frente exata ainda nao estiver clara.",
    familyId: "general",
    iconKey: "wrench",
    keywords: ["manutencao geral", "reparo geral", "manutencao"],
    badge: "Triagem",
    sortOrder: 90,
  },
  marcenaria: {
    summary: "Ajustes, reparos e montagens em itens de marcenaria.",
    familyId: "infra",
    iconKey: "hammer",
    keywords: ["marcenaria", "movel", "madeira", "gaveta", "porta"],
    sortOrder: 30,
  },
  mensageria: {
    summary: "Solicitacoes de mensageria, transporte interno e apoio logistico.",
    familyId: "support",
    iconKey: "send",
    keywords: ["mensageria", "entrega", "transporte", "malote"],
    sortOrder: 52,
  },
  "multiplas demandas": {
    summary: "Use quando houver mais de uma frente ou quando a melhor classificacao ainda nao estiver clara.",
    familyId: "general",
    iconKey: "layers",
    keywords: ["multiplas", "varias", "nao sei", "mais de um problema"],
    badge: "Assistido",
    helperText: "Boa opcao para pedidos mistos ou quando voce ainda nao sabe o servico exato.",
    sortOrder: 4,
  },
  pedreiro: {
    summary: "Demandas de alvenaria, pequenos reparos estruturais e acabamentos.",
    familyId: "infra",
    iconKey: "hammer",
    keywords: ["pedreiro", "alvenaria", "parede", "piso", "reboco"],
    sortOrder: 32,
  },
  pintura: {
    summary: "Repintura, retoques e manutencao de acabamentos de pintura.",
    familyId: "infra",
    iconKey: "sparkles",
    keywords: ["pintura", "tinta", "parede", "retoque"],
    sortOrder: 34,
  },
  projeto: {
    summary: "Solicitacoes de projeto, estudo tecnico e acompanhamento de execucao.",
    familyId: "projects",
    iconKey: "folder",
    keywords: ["projeto", "estudo", "planejamento", "layout", "execucao"],
    sortOrder: 8,
  },
  "tecnico de redes": {
    displayName: "Tecnico de redes",
    summary: "Infraestrutura de rede, conectividade, cabeamento e pontos de acesso.",
    familyId: "network",
    iconKey: "network",
    keywords: ["rede", "wifi", "internet", "cabo", "switch", "ponto"],
    sortOrder: 18,
  },
  vidracaria: {
    summary: "Demandas de vidros, esquadrias e ajustes de elementos envidracados.",
    familyId: "infra",
    iconKey: "building",
    keywords: ["vidro", "janela", "vidracaria", "esquadria"],
    sortOrder: 36,
  },
  conservacao: {
    displayName: "Conservacao geral",
    summary: "Entrada ampla para pedidos gerais de conservacao e apoio predial.",
    familyId: "general",
    iconKey: "sparkles",
    keywords: ["conservacao", "apoio predial", "conservacao geral"],
    badge: "Triagem",
    sortOrder: 88,
  },
  "checklist calhas e pluviais": {
    displayName: "Checklist calhas e pluviais",
    summary: "Checklist tecnico para inspecao de calhas e drenagem pluvial.",
    familyId: "checklists",
    iconKey: "clipboard",
    keywords: ["checklist", "calha", "pluvial", "drenagem"],
    badge: "Tecnico",
    sortOrder: 60,
  },
  "checklist hidraulico": {
    displayName: "Checklist hidraulico",
    summary: "Checklist tecnico para inspecoes da frente hidraulica.",
    familyId: "checklists",
    iconKey: "clipboard",
    keywords: ["checklist", "hidraulico", "hidraulica"],
    badge: "Tecnico",
    sortOrder: 62,
  },
  "checklist iluminacao": {
    displayName: "Checklist iluminacao",
    summary: "Checklist tecnico para circuitos, luminarias e pontos de iluminacao.",
    familyId: "checklists",
    iconKey: "clipboard",
    keywords: ["checklist", "iluminacao", "lampada", "luminaria"],
    badge: "Tecnico",
    sortOrder: 64,
  },
  "checklist pedras portuguesas": {
    displayName: "Checklist pedras portuguesas",
    summary: "Checklist tecnico para inspecoes de pedras portuguesas e pisos.",
    familyId: "checklists",
    iconKey: "clipboard",
    keywords: ["checklist", "pedras portuguesas", "piso"],
    badge: "Tecnico",
    sortOrder: 66,
  },
  "checklist refrigeracao": {
    displayName: "Checklist refrigeracao",
    summary: "Checklist tecnico para refrigeracao e sistemas correlatos.",
    familyId: "checklists",
    iconKey: "clipboard",
    keywords: ["checklist", "refrigeracao", "ar", "climatizacao"],
    badge: "Tecnico",
    sortOrder: 68,
  },
};

const FORM_OVERRIDES: Record<number, Partial<ServicePresentationMeta>> = {
  15: {
    displayName: "Projeto",
    helperText: "Fluxo principal de projeto.",
  },
  36: {
    displayName: "Projeto complementar",
    helperText: "Fluxo alternativo de projeto.",
    sortOrder: 58,
  },
};

function normalizeValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(id\s*\d+\)/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function fallbackMeta(item: CatalogItem): ServicePresentationMeta {
  return {
    summary: "Servico disponivel para abertura de chamado neste contexto.",
    familyId: item.techOnly ? "checklists" : "general",
    iconKey: item.techOnly ? "clipboard" : "layers",
    keywords: [],
    sortOrder: item.techOnly ? 74 : 96,
  };
}

function mergeMeta(item: CatalogItem): ServicePresentationMeta {
  const normalized = normalizeValue(item.name);
  return {
    ...fallbackMeta(item),
    ...(SERVICE_META_BY_KEY[normalized] ?? {}),
    ...(FORM_OVERRIDES[item.formId] ?? {}),
  };
}

function buildSearchTerms(
  item: CatalogItem,
  meta: ServicePresentationMeta,
  rawGroup: string,
): string[] {
  return [
    item.name,
    meta.displayName,
    meta.summary,
    rawGroup,
    ...(meta.keywords ?? []),
  ]
    .filter(Boolean)
    .map((entry) => normalizeValue(String(entry)));
}

export function buildPresentedServices(
  catalog: CatalogGroup[],
  hasDraft: (formId: number) => boolean,
): PresentedService[] {
  return catalog.flatMap((group) =>
    group.items.map((item) => {
      const meta = mergeMeta(item);
      return {
        formId: item.formId,
        rawName: item.name,
        displayName: meta.displayName ?? item.name,
        summary: meta.summary,
        familyId: meta.familyId,
        familyLabel: FAMILY_META[meta.familyId].label,
        familyTagLabel: FAMILY_META[meta.familyId].tagLabel,
        iconKey: meta.iconKey,
        techOnly: item.techOnly,
        hasDraft: hasDraft(item.formId),
        badge: meta.badge,
        helperText: meta.helperText,
        keywords: buildSearchTerms(item, meta, group.group),
        sortOrder: meta.sortOrder ?? 100,
      };
    }),
  );
}

export function buildFamilies(services: PresentedService[]): PresentedFamily[] {
  const counts = services.reduce<Record<ServiceFamilyId, number>>(
    (acc, service) => {
      acc.all += 1;
      acc[service.familyId] += 1;
      return acc;
    },
    {
      all: 0,
      infra: 0,
      support: 0,
      network: 0,
      projects: 0,
      checklists: 0,
      general: 0,
    },
  );

  const families: PresentedFamily[] = [
    {
      id: "all",
      label: "Todos os servicos",
      description: "Visao completa do catalogo disponivel neste contexto.",
      count: counts.all,
    },
    ...Object.values(FAMILY_META).map((family) => ({
      ...family,
      count: counts[family.id],
    })),
  ];

  return families.filter((family) => family.count > 0);
}

function scoreServiceMatch(service: PresentedService, query: string): number {
  if (!query) {
    return service.hasDraft ? service.sortOrder - 6 : service.sortOrder;
  }

  const terms = service.keywords;
  let score = service.sortOrder + 40;
  for (const term of terms) {
    if (term === query) {
      score -= 30;
    } else if (term.startsWith(query)) {
      score -= 18;
    } else if (term.includes(query)) {
      score -= 8;
    }
  }

  if (service.hasDraft) {
    score -= 6;
  }

  return score;
}

export function filterPresentedServices(
  services: PresentedService[],
  familyId: ServiceFamilyId,
  query: string,
): PresentedService[] {
  const normalizedQuery = normalizeValue(query);

  return services
    .filter((service) => (familyId === "all" ? true : service.familyId === familyId))
    .filter((service) => {
      if (!normalizedQuery) {
        return true;
      }
      return service.keywords.some((term) => term.includes(normalizedQuery));
    })
    .sort((left, right) => {
      const scoreDelta =
        scoreServiceMatch(left, normalizedQuery) - scoreServiceMatch(right, normalizedQuery);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return left.displayName.localeCompare(right.displayName, "pt-BR");
    });
}

export function buildQuickActions(services: PresentedService[]) {
  const drafts = services.filter((service) => service.hasDraft).slice(0, 2);
  const multipleDemands = services.find((service) => normalizeValue(service.displayName) === "multiplas demandas");
  const project = services.find((service) => normalizeValue(service.displayName) === "projeto");

  return [
    ...drafts.map((service) => ({
      id: `draft-${service.formId}`,
      label: `Continuar ${service.displayName}`,
      description: "Retoma um rascunho salvo neste servico.",
      service,
    })),
    ...(multipleDemands
      ? [
          {
            id: `assist-${multipleDemands.formId}`,
            label: "Nao sei qual servico escolher",
            description: "Abre uma entrada ampla para mais de uma frente ou duvida de classificacao.",
            service: multipleDemands,
          },
        ]
      : []),
    ...(project
      ? [
          {
            id: `project-${project.formId}`,
            label: "Abrir demanda de projeto",
            description: "Atalho para fluxos de projeto e acompanhamento.",
            service: project,
          },
        ]
      : []),
  ].slice(0, 4);
}
