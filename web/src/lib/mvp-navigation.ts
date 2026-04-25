import type { FeatureManifest } from "./context-registry";
import { getContextManifest, resolveMenuItems } from "./context-registry";
import { getTicketEntryMode } from "./ticket-entry";

const MVP_FEATURES_BY_CONTEXT: Record<string, string[]> = {
  dtic: ["new-ticket", "user-tickets", "dashboard"],
  sis: ["new-ticket", "user-tickets", "dashboard"],
  "sis-manutencao": ["new-ticket", "user-tickets", "dashboard"],
  "sis-memoria": ["new-ticket", "user-tickets", "dashboard"],
};

function normalizeContext(contextId: string): string {
  if (MVP_FEATURES_BY_CONTEXT[contextId]) {
    return contextId;
  }

  const base = contextId.split("-")[0];
  if (MVP_FEATURES_BY_CONTEXT[base]) {
    return base;
  }

  return "dtic";
}

function getAllowedFeatureIds(contextId: string): string[] {
  return MVP_FEATURES_BY_CONTEXT[normalizeContext(contextId)] ?? MVP_FEATURES_BY_CONTEXT.dtic;
}

export function getMvpMenuItems(
  contextId: string,
  userRoles: string[],
  appAccess: string[] = [],
): FeatureManifest[] {
  const allowed = new Set(getAllowedFeatureIds(contextId));
  const entryMode = getTicketEntryMode(contextId);

  return resolveMenuItems(contextId, userRoles, appAccess)
    .filter((item) => allowed.has(item.id))
    .map((item) => {
      if (item.id === "new-ticket" && entryMode === "agents") {
        return {
          ...item,
          label: "Agentes",
        };
      }

      return item;
    });
}

export function getMvpDefaultRoute(
  contextId: string,
  userRoles: string[],
  appAccess: string[] = [],
): string {
  const items = getMvpMenuItems(contextId, userRoles, appAccess);
  const byPriority = ["dashboard", "user-tickets", "new-ticket"];

  for (const featureId of byPriority) {
    const match = items.find((item) => item.id === featureId);
    if (match) return match.route;
  }

  return items[0]?.route ?? `/${contextId}/user`;
}

export function isMvpRouteAllowed(pathname: string, contextId: string): boolean {
  const cleanPath = pathname.split("?")[0];
  const parts = cleanPath.split("/").filter(Boolean);
  if (parts.length < 2) return false;

  const routeContext = parts[0];
  const topLevel = parts[1];
  if (routeContext !== contextId) return false;

  if (topLevel === "ticket") {
    return parts.length >= 3;
  }

  const allowed = new Set(getAllowedFeatureIds(contextId));
  const menuItems = getMvpMenuItems(contextId, ["solicitante", "tecnico", "gestor"], [
    "dtic-metrics",
    "sis-dashboard",
    "busca",
    "inventario",
    "carregadores",
    "permissoes",
  ]);
  const match = menuItems.find((item) => {
    const featurePath = item.route.split("?")[0];
    return cleanPath === featurePath || cleanPath.startsWith(`${featurePath}/`);
  });

  return match ? allowed.has(match.id) : false;
}

export function getMvpPageTitle(pathname: string, contextId: string): string {
  const cleanPath = pathname.split("?")[0];
  const entryMode = getTicketEntryMode(contextId);

  if (cleanPath.includes("/ticket/")) return "Ticket";
  if (cleanPath.endsWith("/new-ticket")) {
    return entryMode === "agents" ? "Agentes DTIC" : "Novo Chamado";
  }
  if (cleanPath.includes("/user")) return "Meus Chamados";
  if (cleanPath.endsWith("/dashboard")) return "Fila Operacional";

  return getContextManifest(contextId)?.label ?? "Hub Operacional";
}

export function getMvpUnavailableMessage(contextId: string): {
  title: string;
  description: string;
} {
  const contextLabel = getContextManifest(contextId)?.label ?? contextId.toUpperCase();
  return {
    title: "Modulo fora do MVP inicial",
    description: `${contextLabel} nesta primeira entrega cobre apenas abertura, acompanhamento e operacao minima de tickets.`,
  };
}
