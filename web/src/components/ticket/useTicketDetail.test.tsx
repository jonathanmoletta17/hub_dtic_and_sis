import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { asIsoDateTimeString } from "@/lib/datetime/iso";
import { useAuthStore } from "@/store/useAuthStore";

const ticketHookMocks = vi.hoisted(() => ({
  addTicketFollowupMock: vi.fn(),
  addTicketSolutionMock: vi.fn(),
  approveTicketSolutionMock: vi.fn(),
  assumeTicketMock: vi.fn(),
  fetchTicketWorkflowDetailMock: vi.fn(),
  rejectTicketSolutionMock: vi.fn(),
  reopenTicketMock: vi.fn(),
  resumeTicketMock: vi.fn(),
  returnTicketToQueueMock: vi.fn(),
  setTicketPendingMock: vi.fn(),
  transferTicketMock: vi.fn(),
}));

vi.mock("@/lib/api/ticketWorkflowService", () => ({
  addTicketFollowup: ticketHookMocks.addTicketFollowupMock,
  addTicketSolution: ticketHookMocks.addTicketSolutionMock,
  approveTicketSolution: ticketHookMocks.approveTicketSolutionMock,
  assumeTicket: ticketHookMocks.assumeTicketMock,
  fetchTicketWorkflowDetail: ticketHookMocks.fetchTicketWorkflowDetailMock,
  rejectTicketSolution: ticketHookMocks.rejectTicketSolutionMock,
  reopenTicket: ticketHookMocks.reopenTicketMock,
  resumeTicket: ticketHookMocks.resumeTicketMock,
  returnTicketToQueue: ticketHookMocks.returnTicketToQueueMock,
  setTicketPending: ticketHookMocks.setTicketPendingMock,
  transferTicket: ticketHookMocks.transferTicketMock,
}));

import { useTicketDetail } from "./useTicketDetail";

describe("useTicketDetail", () => {
  beforeEach(() => {
    Object.values(ticketHookMocks).forEach((mockFn) => mockFn.mockReset());
    const iso = asIsoDateTimeString("2026-03-15T10:00:00-03:00");
    ticketHookMocks.fetchTicketWorkflowDetailMock
      .mockResolvedValue({
        ticket: {
          id: 55,
          title: "Erro de acesso",
          content: "Descricao",
          category: "Acesso",
          status: "Em Atendimento",
          statusId: 2,
          urgency: "Alta",
          urgencyId: 4,
          dateCreated: iso,
          dateModified: iso,
          priority: 4,
          type: 1,
          location: "Patio",
        },
        requesterName: "Alice",
        requesterUserId: 10,
        technicianName: "Bob",
        technicianUserId: 20,
        groupName: "Equipe A",
        timeline: [],
        flags: {
          isNew: false,
          isInProgress: true,
          isPending: false,
          isResolved: false,
          isClosed: false,
          hasAssignedTechnician: true,
        },
      });

    act(() => {
      useAuthStore.setState({
        activeView: "tech",
        currentUserRole: {
          context: "dtic",
          user_id: 20,
          name: "Bob",
          realname: "Bob",
          firstname: "Bob",
          roles: {
            active_profile: { id: 3, name: "Tecnico" },
            available_profiles: [{ id: 3, name: "Tecnico" }],
            groups: [],
          },
          hub_roles: [
            {
              role: "tecnico",
              label: "Tecnico",
              profile_id: 3,
              group_id: null,
              route: "dashboard",
              context_override: null,
            },
          ],
        },
      });
    });
  });

  it("loads workflow detail from the domain service and preserves action semantics", async () => {
    ticketHookMocks.addTicketFollowupMock.mockResolvedValue({ success: true, message: "ok", ticket_id: 55 });
    ticketHookMocks.approveTicketSolutionMock.mockResolvedValue({ success: true, message: "ok", ticket_id: 55 });
    ticketHookMocks.rejectTicketSolutionMock.mockResolvedValue({ success: true, message: "ok", ticket_id: 55 });

    const { result } = renderHook(() => useTicketDetail(55, "dtic"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.requesterName).toBe("Alice");
    expect(result.current.technicianUserId).toBe(20);
    expect(result.current.canActOnTicket).toBe(true);

    await act(async () => {
      await result.current.handleAddFollowup("Novo retorno");
    });

    expect(ticketHookMocks.addTicketFollowupMock).toHaveBeenCalledWith("dtic", 55, {
      content: "Novo retorno",
      user_id: 20,
      is_private: false,
    });
    await act(async () => {
      await result.current.handleApproveSolution("Aprovado");
    });
    expect(ticketHookMocks.approveTicketSolutionMock).toHaveBeenCalledWith("dtic", 55, {
      comment: "Aprovado",
    });

    await act(async () => {
      await result.current.handleRejectSolution();
    });
    expect(ticketHookMocks.rejectTicketSolutionMock).toHaveBeenCalledWith("dtic", 55, {
      comment: undefined,
    });

    expect(ticketHookMocks.fetchTicketWorkflowDetailMock).toHaveBeenCalledTimes(4);
  });
});
