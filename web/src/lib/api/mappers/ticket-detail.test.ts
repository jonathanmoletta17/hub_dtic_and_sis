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
          source_itemtype: "ITILFollowup",
          document_refs: [77],
          attachments: [
            {
              id: 77,
              relation_id: 99,
              parent_type: "ITILFollowup",
              parent_id: 1,
              filename: "manual.txt",
              mime_type: "text/plain",
              size: 123,
              date_upload: iso,
              url: "/api/v1/sis/tickets/55/attachments/77/download",
            },
          ],
        },
      ],
      attachments: [
        {
          id: 77,
          relation_id: 99,
          parent_type: "ITILFollowup",
          parent_id: 1,
          filename: "manual.txt",
          mime_type: "text/plain",
          size: 123,
          date_upload: iso,
          url: "/api/v1/sis/tickets/55/attachments/77/download",
        },
      ],
      actors: [
        {
          role: "requester",
          role_id: 1,
          user_id: 10,
          name: "Alice",
        },
      ],
      groups: [
        {
          role: "assigned",
          role_id: 2,
          group_id: 90,
          name: "Equipe A",
        },
      ],
      audit_logs: [
        {
          id: 9001,
          date: iso,
          user_name: "Bob",
          linked_itemtype: "ITILFollowup",
          linked_action: "add",
          old_value: "",
          new_value: "1",
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
          sourceItemtype: "ITILFollowup",
          documentRefs: [77],
          attachments: [
            expect.objectContaining({
              id: 77,
              parentType: "ITILFollowup",
              parentId: 1,
            }),
          ],
        }),
      ],
      attachments: [
        expect.objectContaining({
          id: 77,
          relationId: 99,
          parentType: "ITILFollowup",
          parentId: 1,
          filename: "manual.txt",
          mimeType: "text/plain",
        }),
      ],
      actors: [
        expect.objectContaining({
          role: "requester",
          userId: 10,
          name: "Alice",
        }),
      ],
      groups: [
        expect.objectContaining({
          role: "assigned",
          groupId: 90,
          name: "Equipe A",
        }),
      ],
      auditLogs: [
        expect.objectContaining({
          id: 9001,
          linkedItemtype: "ITILFollowup",
          linkedAction: "add",
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
