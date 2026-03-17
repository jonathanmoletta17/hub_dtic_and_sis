import { beforeEach, describe, expect, it, vi } from "vitest";

import { asIsoDateTimeString } from "@/lib/datetime/iso";

const ticketServiceMocks = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock("./client", () => ({
  apiGet: ticketServiceMocks.apiGetMock,
  buildApiPath: (context: string, resource: string) => `/api/v1/${context}/${resource}`,
}));

import {
  fetchMyTickets,
  fetchStats,
  fetchTickets,
  searchTicketsDirect,
} from "./ticketService";

describe("ticketService", () => {
  beforeEach(() => {
    ticketServiceMocks.apiGetMock.mockReset();
  });

  it("returns normalized stats and ticket summaries from read endpoints", async () => {
    const dateCreated = asIsoDateTimeString("2026-03-15T10:00:00-03:00");
    const dateModified = asIsoDateTimeString("2026-03-15T11:00:00-03:00");

    ticketServiceMocks.apiGetMock
      .mockResolvedValueOnce({
        novos: 1,
        em_atendimento: 2,
        pendentes: 3,
        solucionados: 4,
        solucionados_recentes: 5,
        total_abertos: 6,
        total: 7,
      })
      .mockResolvedValueOnce({
        total: 1,
        limit: 100,
        offset: 0,
        context: "dtic",
        data: [
          {
            id: 123,
            title: "<b>Chamado</b>",
            content: "<p>Conteudo</p>",
            statusId: 2,
            status: "Em Atendimento",
            urgencyId: 3,
            urgency: "Media",
            priority: 3,
            dateCreated,
            dateModified,
            solveDate: null,
            closeDate: null,
            requester: "Alice",
            technician: "Bob",
            category: "Rede",
          },
        ],
      });

    await expect(fetchStats("dtic")).resolves.toEqual({
      new: 1,
      inProgress: 2,
      pending: 3,
      solved: 4,
      solvedRecent: 5,
      totalOpen: 6,
      total: 7,
    });

    await expect(fetchTickets("dtic")).resolves.toEqual({
      total: 1,
      tickets: [
        expect.objectContaining({
          id: 123,
          title: "Chamado",
          content: "Conteudo",
          dateCreated,
          dateModified,
        }),
      ],
    });

    expect(ticketServiceMocks.apiGetMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/dtic/db/stats",
      {
        department: undefined,
        group_ids: undefined,
      },
    );
    expect(ticketServiceMocks.apiGetMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/dtic/db/tickets",
      {
        date_from: undefined,
        date_to: undefined,
        department: undefined,
        group_ids: undefined,
        limit: undefined,
        offset: undefined,
        requester_id: undefined,
        status: undefined,
      },
    );
  });

  it("returns normalized search results", async () => {
    const dateCreated = asIsoDateTimeString("2026-03-15T10:00:00-03:00");
    const dateModified = asIsoDateTimeString("2026-03-15T11:00:00-03:00");

    ticketServiceMocks.apiGetMock.mockResolvedValueOnce({
      total: 1,
      query: "123",
      context: "dtic",
      department: null,
      data: [
        {
          id: 123,
          title: "Busca ticket",
          content: "Conteudo",
          statusId: 2,
          status: "Em Atendimento",
          urgencyId: 3,
          urgency: "Media",
          priority: 3,
          dateCreated,
          dateModified,
          solveDate: null,
          closeDate: null,
          requester: "Alice",
          technician: "Bob",
          category: "Rede",
          entity: "Central",
          group: "Equipe A",
          relevance: 1,
        },
      ],
    });

    await expect(searchTicketsDirect("dtic", "123")).resolves.toEqual({
      total: 1,
      tickets: [
        expect.objectContaining({
          id: 123,
          entityName: "Central",
          entity_name: "Central",
          groupName: "Equipe A",
        }),
      ],
    });
  });

  it("loads all user tickets through paginated read calls", async () => {
    const dateCreated = asIsoDateTimeString("2026-03-15T10:00:00-03:00");
    const dateModified = asIsoDateTimeString("2026-03-15T11:00:00-03:00");
    const makeTicket = (id: number) => ({
      id,
      title: `Ticket ${id}`,
      content: "Conteudo",
      statusId: 2,
      status: "Em Atendimento",
      urgencyId: 3,
      urgency: "Media",
      priority: 3,
      dateCreated,
      dateModified,
      solveDate: null,
      closeDate: null,
      requester: "Alice",
      technician: "Bob",
      category: "Rede",
    });

    ticketServiceMocks.apiGetMock
      .mockResolvedValueOnce({
        total: 220,
        limit: 200,
        offset: 0,
        context: "dtic",
        data: Array.from({ length: 200 }, (_, idx) => makeTicket(idx + 1)),
      })
      .mockResolvedValueOnce({
        total: 220,
        limit: 200,
        offset: 200,
        context: "dtic",
        data: Array.from({ length: 20 }, (_, idx) => makeTicket(idx + 201)),
      });

    await expect(fetchMyTickets("dtic", 10, { pageSize: 200, maxPages: 5 })).resolves.toEqual(
      expect.objectContaining({
        total: 220,
        tickets: expect.arrayContaining([
          expect.objectContaining({ id: 1 }),
          expect.objectContaining({ id: 220 }),
        ]),
      }),
    );

    expect(ticketServiceMocks.apiGetMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/dtic/db/tickets",
      {
        date_from: undefined,
        date_to: undefined,
        department: undefined,
        group_ids: undefined,
        limit: 200,
        offset: 0,
        requester_id: 10,
        status: undefined,
      },
    );
    expect(ticketServiceMocks.apiGetMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/dtic/db/tickets",
      {
        date_from: undefined,
        date_to: undefined,
        department: undefined,
        group_ids: undefined,
        limit: 200,
        offset: 200,
        requester_id: 10,
        status: undefined,
      },
    );
  });
});
