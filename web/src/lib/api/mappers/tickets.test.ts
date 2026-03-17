import { describe, expect, it } from "vitest";

import { asIsoDateTimeString } from "@/lib/datetime/iso";

import {
  mapGlpiTicketDetail,
  mapTicketListResponseDto,
  mapTicketSearchResponseDto,
  mapTicketStatsDto,
} from "./tickets";

describe("ticket mappers", () => {
  it("maps ticket stats from snake_case DTOs into the normalized model", () => {
    expect(
      mapTicketStatsDto({
        novos: 2,
        em_atendimento: 3,
        pendentes: 4,
        solucionados: 5,
        solucionados_recentes: 6,
        total_abertos: 7,
        total: 8,
      }),
    ).toEqual({
      new: 2,
      inProgress: 3,
      pending: 4,
      solved: 5,
      solvedRecent: 6,
      totalOpen: 7,
      total: 8,
    });
  });

  it("maps list and search DTOs while preserving the frontend ticket shape", () => {
    const dateCreated = asIsoDateTimeString("2026-03-15T10:00:00-03:00");
    const dateModified = asIsoDateTimeString("2026-03-15T11:00:00-03:00");
    const solveDate = asIsoDateTimeString("2026-03-15T12:00:00-03:00");

    const listResult = mapTicketListResponseDto({
      total: 1,
      limit: 100,
      offset: 0,
      context: "dtic",
      data: [
        {
          id: 10,
          title: "<b>Ticket</b> de teste",
          content: "<p>Descricao</p>",
          statusId: 2,
          status: "Em Atendimento",
          urgencyId: 3,
          urgency: "Media",
          priority: 3,
          dateCreated,
          dateModified,
          solveDate,
          closeDate: null,
          requester: "Alice",
          technician: "Bob",
          category: "Rede",
        },
      ],
    });

    expect(listResult).toEqual({
      total: 1,
      tickets: [
        {
          id: 10,
          title: "Ticket de teste",
          content: "Descricao",
          status: "Em Atendimento",
          statusId: 2,
          urgency: "Media",
          urgencyId: 3,
          dateCreated,
          dateModified,
          solveDate,
          closeDate: undefined,
          requester: "Alice",
          technician: "Bob",
          category: "Rede",
          groupName: undefined,
          entityName: undefined,
          entity_name: undefined,
        },
      ],
    });

    const searchResult = mapTicketSearchResponseDto({
      total: 1,
      query: "10",
      context: "dtic",
      department: null,
      data: [
        {
          id: 10,
          title: "Ticket de busca",
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

    expect(searchResult.tickets[0]).toMatchObject({
      entityName: "Central",
      entity_name: "Central",
      groupName: "Equipe A",
    });
  });

  it("maps GLPI detail and followups into normalized ticket models", () => {
    const result = mapGlpiTicketDetail(
      {
        id: 99,
        name: "Falha no acesso",
        content: "<p>Usuario sem acesso</p>",
        itilcategories_id_completename: "TI > Rede",
        status: 2,
        status_completename: "Em Atendimento",
        urgency: 4,
        urgency_name: "Alta",
        date: "2026-03-15T09:00:00-03:00",
        date_mod: "2026-03-15T10:00:00-03:00",
        locations_id_completename: "Predio A",
        entities_id_completename: "Central",
        priority: 4,
        type: 1,
        solvedate: "2026-03-15T11:00:00-03:00",
      },
      [
        {
          id: 1,
          content: "<div>Atendimento iniciado</div>",
          date: "2026-03-15T09:30:00-03:00",
          users_id_completename: "Tecnico",
          is_private: 0,
        },
      ],
    );

    expect(result.ticket).toMatchObject({
      id: 99,
      title: "Falha no acesso",
      content: "Usuario sem acesso",
      category: "TI > Rede",
      status: "Em Atendimento",
      urgency: "Alta",
      location: "Predio A",
      entityName: "Central",
      entity_name: "Central",
      priority: 4,
      type: 1,
    });
    expect(result.followups).toEqual([
      {
        id: 1,
        content: "Atendimento iniciado",
        dateCreated: asIsoDateTimeString("2026-03-15T09:30:00-03:00"),
        userName: "Tecnico",
        isPrivate: false,
        isTech: false,
      },
    ]);
  });
});
