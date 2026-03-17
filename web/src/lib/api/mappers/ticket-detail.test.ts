import { describe, expect, it } from "vitest";

import { asIsoDateTimeString } from "@/lib/datetime/iso";

import { mapTicketWorkflowDetailResponseDto } from "./ticket-detail";

describe("ticket workflow mapper", () => {
  it("maps the dedicated workflow detail DTO into the existing UI model", () => {
    const iso = asIsoDateTimeString("2026-03-15T10:00:00-03:00");
    const mapped = mapTicketWorkflowDetailResponseDto({
      ticket: {
        id: 55,
        title: "Erro de acesso",
        content: "Descricao",
        category: "Acesso",
        status_id: 2,
        status: "Em Atendimento",
        urgency_id: 4,
        urgency: "Alta",
        priority: 4,
        type: 1,
        date_created: iso,
        date_modified: iso,
        solve_date: null,
        close_date: null,
        location: "Patio",
        entity_name: "Central",
      },
      requester_name: "Alice",
      requester_user_id: 10,
      technician_name: "Bob",
      technician_user_id: 20,
      group_name: "Equipe A",
      timeline: [
        {
          id: 1,
          type: "followup",
          content: "Atualizacao",
          date: iso,
          user_id: 20,
          user_name: "Bob",
          is_private: false,
          action_time: null,
          solution_status: null,
        },
      ],
      flags: {
        is_new: false,
        is_in_progress: true,
        is_pending: false,
        is_resolved: false,
        is_closed: false,
        has_assigned_technician: true,
      },
    });

    expect(mapped).toEqual({
      ticket: expect.objectContaining({
        id: 55,
        title: "Erro de acesso",
        statusId: 2,
        urgencyId: 4,
        entityName: "Central",
        entity_name: "Central",
      }),
      requesterName: "Alice",
      requesterUserId: 10,
      technicianName: "Bob",
      technicianUserId: 20,
      groupName: "Equipe A",
      timeline: [
        expect.objectContaining({
          id: 1,
          type: "followup",
          userId: 20,
          userName: "Bob",
        }),
      ],
      flags: {
        isNew: false,
        isInProgress: true,
        isPending: false,
        isResolved: false,
        isClosed: false,
        hasAssignedTechnician: true,
      },
    });
  });
});
