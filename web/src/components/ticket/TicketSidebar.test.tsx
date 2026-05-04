import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { asIsoDateTimeString } from "@/lib/datetime/iso";
import type { TicketDetail } from "@/lib/api/types";
import { TicketSidebar } from "./TicketSidebar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
  }),
}));

describe("TicketSidebar", () => {
  it("shows lifecycle context without exposing unused priority or urgency fields", () => {
    const iso = asIsoDateTimeString("2026-04-30T17:17:33-03:00");
    const ticket: TicketDetail = {
      id: 14134,
      title: "Dar acesso Caixa Compartilhada",
      content: "Descricao",
      category: "Acesso a sistemas > Office 365",
      status: "Novo",
      statusId: 1,
      urgency: "Urgencia 3",
      urgencyId: 3,
      priority: 3,
      type: 2,
      dateCreated: iso,
      dateModified: iso,
    };

    render(
      <TicketSidebar
        ticket={ticket}
        requesterName="Natyele Silva"
        technicianName="Silvio Valim"
        groupName="DTIC > N3"
        actors={[
          { role: "requester", roleId: 1, userId: 10, name: "Natyele Silva" },
          { role: "technician", roleId: 2, userId: 20, name: "Silvio Valim" },
        ]}
        groups={[{ role: "assigned", roleId: 2, groupId: 90, name: "DTIC > N3" }]}
        auditLogs={[
          {
            id: 9001,
            date: iso,
            userName: "Silvio Valim",
            linkedItemtype: "ITILFollowup",
            linkedAction: "add",
            newValue: "18495",
          },
        ]}
        isTechOrManager={false}
        canActOnTicket={false}
        actionLoading={null}
        onAssumeTicket={vi.fn()}
        onShowSolutionModal={vi.fn()}
        onSetPending={vi.fn()}
        onReturnToQueue={vi.fn()}
        onResume={vi.fn()}
        onReopenTicket={vi.fn()}
        onApproveSolution={vi.fn()}
        onRejectSolution={vi.fn()}
        onShowTransferModal={vi.fn()}
      />,
    );

    expect(screen.queryByText("Prioridade")).not.toBeInTheDocument();
    expect(screen.queryByText("Urgencia")).not.toBeInTheDocument();
    expect(screen.queryByText("Urgencia 3")).not.toBeInTheDocument();
    expect(screen.getByText("Ciclo de vida")).toBeVisible();
    expect(screen.getByText("Acompanhamento adicionado")).toBeVisible();
    expect(screen.getByText("Solicitante")).toBeVisible();
    expect(screen.getByText("Grupo atribuido")).toBeVisible();
  });
});
