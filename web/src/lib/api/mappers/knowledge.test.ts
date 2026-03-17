import { describe, expect, it } from "vitest";

import { asIsoDateTimeString } from "@/lib/datetime/iso";

import {
  mapKBArticleResponseDto,
  mapKBListResponseDto,
} from "./knowledge";

describe("knowledge mappers", () => {
  it("maps KB list responses into normalized categories and summaries", () => {
    const dateCreation = asIsoDateTimeString("2026-03-15T10:00:00-03:00");
    const dateModified = asIsoDateTimeString("2026-03-15T11:00:00-03:00");

    const result = mapKBListResponseDto({
      total: 1,
      categories: [
        {
          id: 1,
          name: "Acesso",
          completename: "Base > Acesso",
          level: 2,
          article_count: 4,
        },
      ],
      articles: [
        {
          id: 10,
          name: "Como acessar",
          category: "Acesso",
          category_id: 1,
          author: "Jonathan",
          date_creation: dateCreation,
          date_mod: dateModified,
          is_faq: true,
          view_count: 12,
        },
      ],
    });

    expect(result).toEqual({
      total: 1,
      categories: [
        {
          id: 1,
          name: "Acesso",
          completename: "Base > Acesso",
          level: 2,
          article_count: 4,
        },
      ],
      articles: [
        {
          id: 10,
          name: "Como acessar",
          category: "Acesso",
          category_id: 1,
          author: "Jonathan",
          date_creation: dateCreation,
          date_mod: dateModified,
          is_faq: true,
          view_count: 12,
        },
      ],
    });
  });

  it("maps article detail responses without leaking the raw DTO wrapper", () => {
    const result = mapKBArticleResponseDto({
      article: {
        id: 5,
        name: "VPN",
        category: null,
        category_id: null,
        author: null,
        date_creation: null,
        date_mod: null,
        is_faq: false,
        view_count: 0,
        answer: "<p>Procedimento</p>",
      },
    });

    expect(result).toEqual({
      id: 5,
      name: "VPN",
      category: null,
      category_id: null,
      author: null,
      date_creation: null,
      date_mod: null,
      is_faq: false,
      view_count: 0,
      answer: "<p>Procedimento</p>",
    });
  });
});
