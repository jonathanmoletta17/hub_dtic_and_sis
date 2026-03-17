import { beforeEach, describe, expect, it, vi } from "vitest";

import { asIsoDateTimeString } from "@/lib/datetime/iso";

const analyticsServiceMocks = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock("./client", () => ({
  apiGet: analyticsServiceMocks.apiGetMock,
  buildApiPath: (context: string, resource: string) => `/api/v1/${context}/${resource}`,
}));

import {
  fetchAnalyticsDistributionCategory,
  fetchAnalyticsDistributionEntity,
  fetchAnalyticsRanking,
  fetchAnalyticsRecentActivity,
  fetchAnalyticsSummary,
  fetchAnalyticsTrends,
} from "./analyticsService";

describe("analyticsService", () => {
  beforeEach(() => {
    analyticsServiceMocks.apiGetMock.mockReset();
  });

  it("returns normalized payloads from all analytics endpoints", async () => {
    const occurredAt = asIsoDateTimeString("2026-03-16T10:30:00-03:00");

    analyticsServiceMocks.apiGetMock
      .mockResolvedValueOnce({
        context: "dtic",
        filters: {
          date_from: "2026-02-16",
          date_to: "2026-03-16",
          department: null,
          group_ids: [],
        },
        data: {
          novos: 10,
          em_atendimento: 20,
          pendentes: 5,
          resolvidos_periodo: 30,
          backlog_aberto: 40,
          total_periodo: 65,
        },
      })
      .mockResolvedValueOnce({
        context: "dtic",
        filters: {
          date_from: "2026-02-16",
          date_to: "2026-03-16",
          department: null,
          group_ids: [],
        },
        series: [
          {
            date: "2026-03-16",
            novos: 1,
            em_atendimento: 2,
            pendentes: 3,
            resolvidos: 4,
            total_criados: 6,
          },
        ],
      })
      .mockResolvedValueOnce({
        context: "dtic",
        filters: {
          date_from: "2026-02-16",
          date_to: "2026-03-16",
          department: null,
          group_ids: [],
        },
        limit: 10,
        data: [
          {
            technician_id: 7,
            technician_name: "Tecnico 1",
            resolved_count: 14,
          },
        ],
      })
      .mockResolvedValueOnce({
        context: "dtic",
        filters: {
          date_from: "2026-02-16",
          date_to: "2026-03-16",
          department: null,
          group_ids: [],
        },
        limit: 10,
        data: [
          {
            ticket_id: 42,
            title: "Atualizacao",
            status_id: 2,
            status: "Em Atendimento",
            category: "Rede",
            requester: "Alice",
            technician: "Bob",
            action: "ticket_em_atendimento",
            occurred_at: occurredAt,
          },
        ],
      })
      .mockResolvedValueOnce({
        context: "dtic",
        filters: {
          date_from: "2026-02-16",
          date_to: "2026-03-16",
          department: null,
          group_ids: [],
        },
        limit: 10,
        data: [
          {
            name: "Entidade A",
            value: 8,
          },
        ],
      })
      .mockResolvedValueOnce({
        context: "dtic",
        filters: {
          date_from: "2026-02-16",
          date_to: "2026-03-16",
          department: null,
          group_ids: [],
        },
        limit: 10,
        data: [
          {
            name: "Categoria A",
            value: 12,
          },
        ],
      });

    await expect(fetchAnalyticsSummary("dtic")).resolves.toEqual({
      context: "dtic",
      filters: {
        dateFrom: "2026-02-16",
        dateTo: "2026-03-16",
        department: null,
        groupIds: [],
      },
      data: {
        novos: 10,
        emAtendimento: 20,
        pendentes: 5,
        resolvidosPeriodo: 30,
        backlogAberto: 40,
        totalPeriodo: 65,
      },
    });

    await expect(fetchAnalyticsTrends("dtic")).resolves.toEqual({
      context: "dtic",
      filters: {
        dateFrom: "2026-02-16",
        dateTo: "2026-03-16",
        department: null,
        groupIds: [],
      },
      series: [
        {
          date: "2026-03-16",
          novos: 1,
          emAtendimento: 2,
          pendentes: 3,
          resolvidos: 4,
          totalCriados: 6,
        },
      ],
    });

    await expect(fetchAnalyticsRanking("dtic")).resolves.toEqual({
      context: "dtic",
      filters: {
        dateFrom: "2026-02-16",
        dateTo: "2026-03-16",
        department: null,
        groupIds: [],
      },
      limit: 10,
      data: [
        {
          technicianId: 7,
          technicianName: "Tecnico 1",
          resolvedCount: 14,
        },
      ],
    });

    await expect(fetchAnalyticsRecentActivity("dtic")).resolves.toEqual({
      context: "dtic",
      filters: {
        dateFrom: "2026-02-16",
        dateTo: "2026-03-16",
        department: null,
        groupIds: [],
      },
      limit: 10,
      data: [
        {
          ticketId: 42,
          title: "Atualizacao",
          statusId: 2,
          status: "Em Atendimento",
          category: "Rede",
          requester: "Alice",
          technician: "Bob",
          action: "ticket_em_atendimento",
          occurredAt,
        },
      ],
    });

    await expect(fetchAnalyticsDistributionEntity("dtic")).resolves.toEqual({
      context: "dtic",
      filters: {
        dateFrom: "2026-02-16",
        dateTo: "2026-03-16",
        department: null,
        groupIds: [],
      },
      limit: 10,
      data: [{ name: "Entidade A", value: 8 }],
    });

    await expect(fetchAnalyticsDistributionCategory("dtic")).resolves.toEqual({
      context: "dtic",
      filters: {
        dateFrom: "2026-02-16",
        dateTo: "2026-03-16",
        department: null,
        groupIds: [],
      },
      limit: 10,
      data: [{ name: "Categoria A", value: 12 }],
    });

    expect(analyticsServiceMocks.apiGetMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/dtic/analytics/summary",
      {
        date_from: undefined,
        date_to: undefined,
        department: undefined,
        group_ids: undefined,
      },
    );
    expect(analyticsServiceMocks.apiGetMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/dtic/analytics/trends",
      {
        date_from: undefined,
        date_to: undefined,
        department: undefined,
        group_ids: undefined,
      },
    );
    expect(analyticsServiceMocks.apiGetMock).toHaveBeenNthCalledWith(
      3,
      "/api/v1/dtic/analytics/ranking",
      {
        date_from: undefined,
        date_to: undefined,
        department: undefined,
        group_ids: undefined,
        limit: undefined,
      },
    );
    expect(analyticsServiceMocks.apiGetMock).toHaveBeenNthCalledWith(
      4,
      "/api/v1/dtic/analytics/recent-activity",
      {
        date_from: undefined,
        date_to: undefined,
        department: undefined,
        group_ids: undefined,
        limit: undefined,
      },
    );
    expect(analyticsServiceMocks.apiGetMock).toHaveBeenNthCalledWith(
      5,
      "/api/v1/dtic/analytics/distribution/entity",
      {
        date_from: undefined,
        date_to: undefined,
        department: undefined,
        group_ids: undefined,
        limit: undefined,
      },
    );
    expect(analyticsServiceMocks.apiGetMock).toHaveBeenNthCalledWith(
      6,
      "/api/v1/dtic/analytics/distribution/category",
      {
        date_from: undefined,
        date_to: undefined,
        department: undefined,
        group_ids: undefined,
        limit: undefined,
      },
    );
  });
});
