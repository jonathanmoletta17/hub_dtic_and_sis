/**
 * Hub Role Keys — Os 3 papéis de uso da aplicação.
 * A regra de tradução GLPI → hubRole fica no backend.
 */
export const HUB_ROLES = {
  SOLICITANTE: "solicitante",
  TECNICO: "tecnico",
  GESTOR: "gestor",
} as const;

/**
 * IDs de referência GLPI (para consulta, não para lógica de frontend).
 * A lógica de autorização usa hub_roles do backend, não esses IDs.
 */
export const DTIC_PROFILES = {
  APP_ADM: 20,
  APP_MONITOR: 21,
  TECNICO: 6,
  SOLICITANTE: 9
};

export const SIS_ROLES = {
  PROFILES: {
    ADMIN: 3,
    SOLICITANTE: 9,
  },
  GROUPS: {
    MANUTENCAO: 22,  // CC-MANUTENCAO (contexts.yaml: 22 → tecnico-manutencao)
    CONSERVACAO: 21,  // CC-CONSERVAÇÃO (contexts.yaml: 21 → tecnico-conservacao)
  }
};
