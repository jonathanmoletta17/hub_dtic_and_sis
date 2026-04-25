import { describe, expect, test } from "vitest";

import { buildDticAgentOutcome, getDticAgentDefinition } from "./dtic-agent-flow";

describe("dtic-agent-flow", () => {
  test("routes incidentes para a fila tecnica", () => {
    const outcome = buildDticAgentOutcome({
      agentId: "incidentes",
      urgency: "normal",
      scope: "individual",
      surface: "rede",
      narrative: "Link indisponivel na unidade.",
    });

    expect(outcome.primaryHref).toBe("/dtic/dashboard");
    expect(outcome.queueLabel).toBe("Encaminhamento tecnico");
  });

  test("mantem pedidos normais no acompanhamento do solicitante", () => {
    const outcome = buildDticAgentOutcome({
      agentId: "operacional",
      urgency: "normal",
      scope: "individual",
      surface: "sistema",
      narrative: "Necessidade planejada de software.",
    });

    expect(outcome.primaryHref).toBe("/dtic/user");
    expect(outcome.secondaryHref).toBe("/dtic/dashboard");
  });

  test("produz resumo de handoff com os dados da triagem", () => {
    const outcome = buildDticAgentOutcome({
      agentId: "acessos",
      urgency: "alto",
      scope: "equipe",
      surface: "acesso",
      narrative: "Equipe inteira sem acesso ao sistema.",
    });

    expect(outcome.handoffBrief).toContain("[Acessos]");
    expect(outcome.handoffBrief).toContain("Equipe inteira sem acesso ao sistema.");
    expect(outcome.handoffQuery).toContain("[Acessos] Acesso / permissao - Alto");
    expect(outcome.handoffPayload.context).toBe("dtic");
    expect(outcome.handoffPayload.agentId).toBe("acessos");
    expect(outcome.handoffPayload.prompt).toContain("Equipe inteira sem acesso ao sistema.");
    expect(outcome.handoffPayload.prompt).toContain("Superficie: Acesso / permissao.");
    expect(outcome.handoffPayload.prompt).toContain("Escopo: Impacta uma equipe.");
    expect(outcome.summaryLines).toHaveLength(3);
    expect(getDticAgentDefinition("acessos").defaultSurface).toBe("acesso");
  });
});
