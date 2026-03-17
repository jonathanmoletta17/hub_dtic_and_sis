import { beforeEach, describe, expect, it, vi } from "vitest";

import { asIsoDateTimeString } from "@/lib/datetime/iso";

const chargerReadMocks = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock("./client", () => ({
  apiDelete: vi.fn(),
  apiGet: chargerReadMocks.apiGetMock,
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  buildApiPath: (context: string, resource: string) => `/api/v1/${context}/${resource}`,
}));

import {
  fetchChargerOfflineStatus,
  fetchChargerSchedule,
  fetchChargers,
  fetchGlobalSchedule,
  fetchKanbanData,
  getTicketDetail,
} from "./chargerService";

describe("chargerService read flows", () => {
  beforeEach(() => {
    chargerReadMocks.apiGetMock.mockReset();
  });

  it("returns normalized kanban, ranking, schedule, offline and ticket detail data", async () => {
    const iso = asIsoDateTimeString("2026-03-15T10:00:00-03:00");

    chargerReadMocks.apiGetMock
      .mockResolvedValueOnce({
        context: "sis",
        demands: [
          {
            id: 1,
            name: "Troca",
            status: 1,
            priority: 3,
            date_creation: iso,
            requester_name: "Alice",
          },
        ],
        availableResources: [],
        allocatedResources: [],
        timestamp: iso,
      })
      .mockResolvedValueOnce({
        context: "sis",
        ranking: [
          {
            id: 2,
            name: "Carlos",
            completed_tickets: 4,
            average_wait_time: "1h",
            total_service_minutes: 120,
            last_activity: iso,
          },
        ],
        timestamp: iso,
      })
      .mockResolvedValueOnce({
        id: 1,
        business_start: "07:00",
        business_end: "17:00",
        work_on_weekends: false,
        updated_at: iso,
      })
      .mockResolvedValueOnce({
        business_start: "08:00",
        business_end: "18:00",
        work_on_weekends: true,
      })
      .mockResolvedValueOnce({
        is_offline: true,
        reason: "Manutencao",
        expected_return: "18:00",
      })
      .mockResolvedValueOnce({
        id: 7,
        name: "Atendimento",
        content: "Detalhe",
        date: iso,
        status: 2,
        priority: 3,
        location: "Patio",
        category: "Bateria",
        requester_name: "Alice",
        chargers: [],
        available_chargers: [],
      });

    await expect(fetchKanbanData("sis")).resolves.toEqual({
      demands: [
        expect.objectContaining({
          id: 1,
          title: "Troca",
          date: iso,
          requester: "Alice",
        }),
      ],
      availableResources: [],
      allocatedResources: [],
    });

    await expect(fetchChargers("sis")).resolves.toEqual([
      {
        id: 2,
        name: "Carlos",
        is_deleted: false,
        totalTicketsInPeriod: 4,
        totalServiceMinutes: 120,
        lastTicket: {
          id: 0,
          title: "",
          solvedate: iso,
        },
      },
    ]);

    await expect(fetchGlobalSchedule("sis")).resolves.toEqual({
      businessStart: "07:00",
      businessEnd: "17:00",
      workOnWeekends: false,
    });

    await expect(fetchChargerSchedule("sis", 1)).resolves.toEqual({
      businessStart: "08:00",
      businessEnd: "18:00",
      workOnWeekends: true,
    });

    await expect(fetchChargerOfflineStatus("sis", 9)).resolves.toEqual({
      charger_id: 9,
      is_offline: true,
      reason: "Manutencao",
      offline_since: undefined,
      expected_return: "18:00",
    });

    await expect(getTicketDetail("sis", 7)).resolves.toEqual({
      id: 7,
      name: "Atendimento",
      content: "Detalhe",
      date: iso,
      status: 2,
      priority: 3,
      location: "Patio",
      category: "Bateria",
      requester_name: "Alice",
      chargers: [],
      available_chargers: [],
    });
  });
});
