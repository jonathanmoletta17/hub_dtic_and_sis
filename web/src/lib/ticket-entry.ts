export type TicketEntryMode = "form" | "agents";

const ENTRY_MODE_BY_CONTEXT: Record<string, TicketEntryMode> = {
  dtic: "agents",
  sis: "form",
  "sis-conservacao": "form",
  "sis-manutencao": "form",
  "sis-memoria": "form",
};

export function getTicketEntryMode(contextId: string): TicketEntryMode {
  if (ENTRY_MODE_BY_CONTEXT[contextId]) {
    return ENTRY_MODE_BY_CONTEXT[contextId];
  }

  const baseContext = contextId.split("-")[0];
  return ENTRY_MODE_BY_CONTEXT[baseContext] ?? "form";
}
