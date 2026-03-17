import { beforeEach, describe, expect, it, vi } from "vitest";

import { asIsoDateTimeString } from "@/lib/datetime/iso";

const ticketWorkflowMocks = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
}));

vi.mock("./client", () => ({
  apiGet: ticketWorkflowMocks.apiGetMock,
  apiPost: ticketWorkflowMocks.apiPostMock,
  buildApiPath: (context: string, resource: string) => `/api/v1/${context}/${resource}`,
}));

import {
  addTicketFollowup,
  approveTicketSolution,
  assumeTicket,
  fetchTicketWorkflowDetail,
  rejectTicketSolution,
  reopenTicket,
  returnTicketToQueue,
  setTicketPending,
  transferTicket,
} from "./ticketWorkflowService";

describe("ticketWorkflowService", () => {
  beforeEach(() => {
    ticketWorkflowMocks.apiGetMock.mockReset();
    ticketWorkflowMocks.apiPostMock.mockReset();
  });

  it("returns normalized workflow detail data", async () => {
    const iso = asIsoDateTimeString("2026-03-15T10:00:00-03:00");
    ticketWorkflowMocks.apiGetMock.mockResolvedValueOnce({
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

    await expect(fetchTicketWorkflowDetail("dtic", 55)).resolves.toEqual(
      expect.objectContaining({
        ticket: expect.objectContaining({
          id: 55,
          statusId: 2,
        }),
        requesterName: "Alice",
        technicianUserId: 20,
      }),
    );

    expect(ticketWorkflowMocks.apiGetMock).toHaveBeenCalledWith("/api/v1/dtic/tickets/55/detail");
  });

  it("posts explicit workflow actions", async () => {
    ticketWorkflowMocks.apiPostMock.mockResolvedValue({
      success: true,
      message: "ok",
      ticket_id: 55,
    });

    await addTicketFollowup("dtic", 55, { content: "Oi", user_id: 10, is_private: false });
    await assumeTicket("dtic", 55, { technician_user_id: 20 });
    await setTicketPending("dtic", 55);
    await returnTicketToQueue("dtic", 55);
    await reopenTicket("dtic", 55);
    await transferTicket("dtic", 55, { technician_user_id: 30 });
    await approveTicketSolution("dtic", 55, { comment: "Aprovado" });
    await rejectTicketSolution("dtic", 55);

    expect(ticketWorkflowMocks.apiPostMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/dtic/tickets/55/followups",
      { content: "Oi", user_id: 10, is_private: false },
    );
    expect(ticketWorkflowMocks.apiPostMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/dtic/tickets/55/assume",
      { technician_user_id: 20 },
    );
    expect(ticketWorkflowMocks.apiPostMock).toHaveBeenNthCalledWith(
      3,
      "/api/v1/dtic/tickets/55/pending",
      {},
    );
    expect(ticketWorkflowMocks.apiPostMock).toHaveBeenNthCalledWith(
      4,
      "/api/v1/dtic/tickets/55/return-to-queue",
      {},
    );
    expect(ticketWorkflowMocks.apiPostMock).toHaveBeenNthCalledWith(
      5,
      "/api/v1/dtic/tickets/55/reopen",
      {},
    );
    expect(ticketWorkflowMocks.apiPostMock).toHaveBeenNthCalledWith(
      6,
      "/api/v1/dtic/tickets/55/transfer",
      { technician_user_id: 30 },
    );
    expect(ticketWorkflowMocks.apiPostMock).toHaveBeenNthCalledWith(
      7,
      "/api/v1/dtic/tickets/55/solution-approval/approve",
      { comment: "Aprovado" },
    );
    expect(ticketWorkflowMocks.apiPostMock).toHaveBeenNthCalledWith(
      8,
      "/api/v1/dtic/tickets/55/solution-approval/reject",
      {},
    );
  });
});
