import { describe, expect, it } from "vitest";

import { asIsoDateTimeString } from "@/lib/datetime/iso";

import {
  mapKanbanResponseDto,
  mapRankingResponseToChargers,
  mapTicketDetailResponseDto,
} from "./chargers";

describe("charger mappers", () => {
  it("maps kanban DTOs into the legacy-compatible frontend shape", () => {
    const dateCreation = asIsoDateTimeString("2026-03-15T10:00:00-03:00");
    const solveDate = asIsoDateTimeString("2026-03-15T11:00:00-03:00");

    const result = mapKanbanResponseDto({
      context: "sis",
      demands: [
        {
          id: 1,
          name: "Troca de carregador",
          status: 1,
          priority: 3,
          date_creation: dateCreation,
          location: "Patio",
          category: "Carregadores",
          requester_name: "Alice",
          time_elapsed: "0h 30m",
        },
      ],
      availableResources: [
        {
          id: 2,
          name: "Carlos",
          is_offline: false,
          business_start: "07:00",
          business_end: "17:00",
          lastTicket: {
            id: 9,
            title: "Ultimo atendimento",
            solvedate: solveDate,
            location: "Deposito",
          },
        },
      ],
      allocatedResources: [
        {
          ticket_id: 3,
          title: "Chamado em andamento",
          date: dateCreation,
          status: 2,
          category: "Bateria",
          location: "Patio",
          time_elapsed: "1h 10m",
          requester_name: "Bob",
          chargers: [
            {
              id: 2,
              name: "Carlos",
              assigned_date: dateCreation,
              service_time_minutes: 90,
              schedule: {
                business_start: "07:00",
                business_end: "17:00",
                work_on_weekends: false,
              },
            },
          ],
        },
      ],
      timestamp: dateCreation,
    });

    expect(result.demands[0]).toEqual({
      id: 1,
      title: "Troca de carregador",
      name: "Troca de carregador",
      status: 1,
      priority: 3,
      date: dateCreation,
      date_creation: dateCreation,
      location: "Patio",
      category: "Carregadores",
      requester: "Alice",
      requester_name: "Alice",
      time_elapsed: "0h 30m",
    });
    expect(result.availableResources[0]).toMatchObject({
      id: 2,
      name: "Carlos",
      schedule: {
        businessStart: "07:00",
        businessEnd: "17:00",
        workOnWeekends: false,
      },
      lastTicket: {
        id: 9,
        solvedate: solveDate,
      },
    });
    expect(result.allocatedResources[0]).toMatchObject({
      ticket_id: 3,
      date: dateCreation,
      requester_name: "Bob",
      chargers: [
        expect.objectContaining({
          id: 2,
          assigned_date: dateCreation,
        }),
      ],
    });
  });

  it("maps ranking and ticket detail reads into normalized charger models", () => {
    const lastActivity = asIsoDateTimeString("2026-03-15T12:00:00-03:00");

    expect(
      mapRankingResponseToChargers({
        context: "sis",
        ranking: [
          {
            id: 7,
            name: "Equipe A",
            completed_tickets: 8,
            average_wait_time: "1h 20m",
            total_service_minutes: 420,
            last_activity: lastActivity,
          },
        ],
        timestamp: lastActivity,
      }),
    ).toEqual([
      {
        id: 7,
        name: "Equipe A",
        is_deleted: false,
        totalTicketsInPeriod: 8,
        totalServiceMinutes: 420,
        lastTicket: {
          id: 0,
          title: "",
          solvedate: lastActivity,
        },
      },
    ]);

    expect(
      mapTicketDetailResponseDto({
        id: 11,
        name: "Atendimento externo",
        content: "Detalhe",
        date: lastActivity,
        status: 2,
        priority: 3,
        location: "Patio",
        category: "Bateria",
        requester_name: "Alice",
        chargers: [],
        available_chargers: [
          {
            id: 4,
            name: "Maria",
            is_offline: false,
            lastTicket: {
              id: 1,
              title: "Chamado anterior",
              solvedate: lastActivity,
              location: "Deposito",
            },
          },
        ],
      }),
    ).toMatchObject({
      id: 11,
      name: "Atendimento externo",
      date: lastActivity,
      requester_name: "Alice",
      available_chargers: [
        {
          id: 4,
          lastTicket: {
            solvedate: lastActivity,
          },
        },
      ],
    });
  });
});
