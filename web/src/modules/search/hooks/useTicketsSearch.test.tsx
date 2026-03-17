import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { asIsoDateTimeString } from "@/lib/datetime/iso";
import type { TicketSummary } from "@/lib/api/types";

const serviceMocks = vi.hoisted(() => ({
  fetchStatsMock: vi.fn(),
  fetchTicketsMock: vi.fn(),
  searchTicketsDirectMock: vi.fn(),
}));

vi.mock("@/lib/api/ticketService", () => ({
  fetchStats: serviceMocks.fetchStatsMock,
  fetchTickets: serviceMocks.fetchTicketsMock,
  searchTicketsDirect: serviceMocks.searchTicketsDirectMock,
}));

import { useTicketsSearch } from "./useTicketsSearch";

function makeTicket(id: number, statusId: number): TicketSummary {
  return {
    id,
    title: `Ticket ${id}`,
    content: "Conteudo",
    category: "Categoria",
    status: "Status",
    statusId,
    urgency: "Media",
    urgencyId: 3,
    dateCreated: asIsoDateTimeString(`2026-03-${String(id).padStart(2, "0")}T10:00:00-03:00`),
    dateModified: asIsoDateTimeString(`2026-03-${String(id).padStart(2, "0")}T11:00:00-03:00`),
    requester: "Solicitante",
    technician: "Tecnico",
  };
}

describe("useTicketsSearch", () => {
  beforeEach(() => {
    serviceMocks.fetchStatsMock.mockReset();
    serviceMocks.fetchTicketsMock.mockReset();
    serviceMocks.searchTicketsDirectMock.mockReset();

    serviceMocks.fetchStatsMock.mockResolvedValue({
      new: 0,
      inProgress: 30,
      pending: 9,
      solved: 0,
      solvedRecent: 0,
      totalOpen: 39,
      total: 39,
    });

    serviceMocks.fetchTicketsMock.mockResolvedValue({
      total: 39,
      tickets: [makeTicket(1, 2), makeTicket(2, 3), makeTicket(3, 4)],
    });

    serviceMocks.searchTicketsDirectMock.mockResolvedValue({
      total: 30,
      tickets: [makeTicket(10, 2), makeTicket(11, 3)],
    });
  });

  it("uses the same default status scope as the cards and maps 'Em Atendimento' to statuses 2+3", async () => {
    const { result } = renderHook(() => useTicketsSearch({ context: "sis", debounceMs: 0 }));

    await waitFor(() => expect(serviceMocks.fetchTicketsMock).toHaveBeenCalledTimes(1));
    expect(serviceMocks.fetchTicketsMock.mock.calls[0]?.[1]).toMatchObject({
      status: [1, 2, 3, 4, 5],
      limit: 500,
    });

    act(() => {
      result.current.filters.setSelectedStatusId(2);
    });

    await waitFor(() => expect(serviceMocks.fetchTicketsMock).toHaveBeenCalledTimes(2));
    expect(serviceMocks.fetchTicketsMock.mock.calls[1]?.[1]).toMatchObject({
      status: [2, 3],
      limit: 500,
    });
  });

  it("keeps status filter consistent for remote search requests", async () => {
    const { result } = renderHook(() => useTicketsSearch({ context: "sis", debounceMs: 0 }));

    await waitFor(() => expect(serviceMocks.fetchTicketsMock).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.filters.setSelectedStatusId(2);
    });
    await waitFor(() => expect(serviceMocks.fetchTicketsMock).toHaveBeenCalledTimes(2));

    act(() => {
      result.current.setSearchInput("carregador");
    });

    await waitFor(() => expect(serviceMocks.searchTicketsDirectMock).toHaveBeenCalledTimes(1));
    expect(serviceMocks.searchTicketsDirectMock.mock.calls[0]?.[2]).toMatchObject({
      status: [2, 3],
      limit: 200,
    });
  });
});
