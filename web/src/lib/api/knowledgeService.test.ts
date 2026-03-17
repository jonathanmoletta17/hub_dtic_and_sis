import { beforeEach, describe, expect, it, vi } from "vitest";

import { asIsoDateTimeString } from "@/lib/datetime/iso";

const knowledgeServiceMocks = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock("./client", () => ({
  apiDelete: vi.fn(),
  apiGet: knowledgeServiceMocks.apiGetMock,
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  buildApiPath: (context: string, resource: string) => `/api/v1/${context}/${resource}`,
  sessionHeaders: vi.fn(),
}));

import {
  fetchKBArticle,
  fetchKBArticles,
  fetchKBCategories,
} from "./knowledgeService";

describe("knowledgeService", () => {
  beforeEach(() => {
    knowledgeServiceMocks.apiGetMock.mockReset();
  });

  it("returns normalized KB categories, lists and article detail", async () => {
    const dateCreation = asIsoDateTimeString("2026-03-15T10:00:00-03:00");
    const dateModified = asIsoDateTimeString("2026-03-15T11:00:00-03:00");

    knowledgeServiceMocks.apiGetMock
      .mockResolvedValueOnce({
        categories: [
          {
            id: 1,
            name: "Acesso",
            completename: "Base > Acesso",
            level: 2,
            article_count: 5,
          },
        ],
      })
      .mockResolvedValueOnce({
        total: 1,
        categories: [
          {
            id: 1,
            name: "Acesso",
            completename: "Base > Acesso",
            level: 2,
            article_count: 5,
          },
        ],
        articles: [
          {
            id: 7,
            name: "VPN",
            category: "Acesso",
            category_id: 1,
            author: "Jonathan",
            date_creation: dateCreation,
            date_mod: dateModified,
            is_faq: true,
            view_count: 22,
          },
        ],
      })
      .mockResolvedValueOnce({
        article: {
          id: 7,
          name: "VPN",
          category: "Acesso",
          category_id: 1,
          author: "Jonathan",
          date_creation: dateCreation,
          date_mod: dateModified,
          is_faq: true,
          view_count: 22,
          answer: "<p>Passo a passo</p>",
        },
      });

    await expect(fetchKBCategories()).resolves.toEqual([
      {
        id: 1,
        name: "Acesso",
        completename: "Base > Acesso",
        level: 2,
        article_count: 5,
      },
    ]);

    await expect(fetchKBArticles({ q: "vpn" })).resolves.toEqual({
      total: 1,
      categories: [
        {
          id: 1,
          name: "Acesso",
          completename: "Base > Acesso",
          level: 2,
          article_count: 5,
        },
      ],
      articles: [
        {
          id: 7,
          name: "VPN",
          category: "Acesso",
          category_id: 1,
          author: "Jonathan",
          date_creation: dateCreation,
          date_mod: dateModified,
          is_faq: true,
          view_count: 22,
        },
      ],
    });

    await expect(fetchKBArticle(7)).resolves.toEqual({
      id: 7,
      name: "VPN",
      category: "Acesso",
      category_id: 1,
      author: "Jonathan",
      date_creation: dateCreation,
      date_mod: dateModified,
      is_faq: true,
      view_count: 22,
      answer: "<p>Passo a passo</p>",
    });
  });
});
