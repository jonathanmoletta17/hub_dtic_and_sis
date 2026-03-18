import { beforeEach, describe, expect, it, vi } from "vitest";

import { asIsoDateTimeString } from "@/lib/datetime/iso";

const knowledgeServiceMocks = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPutMock: vi.fn(),
  apiDeleteMock: vi.fn(),
  sessionHeadersMock: vi.fn(),
  publishLiveDataEventMock: vi.fn(),
}));

const fetchMock = vi.fn();

vi.mock("./client", () => ({
  apiDelete: knowledgeServiceMocks.apiDeleteMock,
  apiGet: knowledgeServiceMocks.apiGetMock,
  apiPost: knowledgeServiceMocks.apiPostMock,
  apiPut: knowledgeServiceMocks.apiPutMock,
  buildApiPath: (context: string, resource: string) => `/api/v1/${context}/${resource}`,
  sessionHeaders: knowledgeServiceMocks.sessionHeadersMock,
}));

vi.mock("@/lib/realtime/liveDataBus", () => ({
  publishLiveDataEvent: knowledgeServiceMocks.publishLiveDataEventMock,
}));

import {
  createKBArticle,
  deleteKBArticleAttachment,
  deleteKBArticle,
  fetchKBEmbeddedDocumentBlob,
  fetchKBArticle,
  fetchKBArticles,
  fetchKBCategories,
  updateKBArticle,
  uploadKBArticleAttachments,
  viewKBEmbeddedDocument,
} from "./knowledgeService";

describe("knowledgeService", () => {
  beforeEach(() => {
    knowledgeServiceMocks.apiGetMock.mockReset();
    knowledgeServiceMocks.apiPostMock.mockReset();
    knowledgeServiceMocks.apiPutMock.mockReset();
    knowledgeServiceMocks.apiDeleteMock.mockReset();
    knowledgeServiceMocks.sessionHeadersMock.mockReset();
    knowledgeServiceMocks.publishLiveDataEventMock.mockReset();
    knowledgeServiceMocks.sessionHeadersMock.mockReturnValue({ "Session-Token": "token" });

    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(URL, "createObjectURL", {
      value: vi.fn(() => "blob:kb-document"),
      writable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: vi.fn(),
      writable: true,
    });
    window.open = vi.fn();
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
          attachments: [
            {
              id: 99,
              filename: "manual.pdf",
              mime_type: "application/pdf",
              size: 4096,
              date_upload: dateModified,
              url: "/api/v1/dtic/knowledge/articles/7/attachments/99/download",
            },
          ],
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
      attachments: [
        {
          id: 99,
          filename: "manual.pdf",
          mime_type: "application/pdf",
          size: 4096,
          date_upload: dateModified,
          url: "/api/v1/dtic/knowledge/articles/7/attachments/99/download",
        },
      ],
    });
  });

  it("emits live invalidation after write operations", async () => {
    knowledgeServiceMocks.apiPostMock.mockResolvedValueOnce({ success: true, data: { id: 7 }, message: "ok" });
    knowledgeServiceMocks.apiPutMock.mockResolvedValueOnce({ success: true, data: {}, message: "ok" });
    knowledgeServiceMocks.apiDeleteMock.mockResolvedValueOnce({ success: true, data: {}, message: "ok" });

    await createKBArticle("token", { name: "Novo", answer: "Conteudo", is_faq: 0 });
    await updateKBArticle("token", 7, { name: "Atualizado" });
    await deleteKBArticle("token", 7);

    expect(knowledgeServiceMocks.apiPostMock).toHaveBeenCalledTimes(1);
    expect(knowledgeServiceMocks.apiPutMock).toHaveBeenCalledTimes(1);
    expect(knowledgeServiceMocks.apiDeleteMock).toHaveBeenCalledTimes(1);
    expect(knowledgeServiceMocks.publishLiveDataEventMock).toHaveBeenCalledTimes(3);
    expect(knowledgeServiceMocks.publishLiveDataEventMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        context: "dtic",
        source: "mutation",
      }),
    );
  });

  it("uploads KB attachments using multipart form data", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          message: "ok",
          attachments: [
            {
              id: 99,
              filename: "manual.pdf",
              mime_type: "application/pdf",
              size: 4096,
              date_upload: null,
              url: "/api/v1/dtic/knowledge/articles/7/attachments/99/download",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const file = new File(["conteudo"], "manual.pdf", { type: "application/pdf" });
    const result = await uploadKBArticleAttachments("token", 7, [file]);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/dtic/knowledge/articles/7/attachments",
      expect.objectContaining({
        method: "POST",
        headers: { "Session-Token": "token" },
      }),
    );
    expect(result).toEqual([
      {
        id: 99,
        filename: "manual.pdf",
        mime_type: "application/pdf",
        size: 4096,
        date_upload: null,
        url: "/api/v1/dtic/knowledge/articles/7/attachments/99/download",
      },
    ]);

    expect(knowledgeServiceMocks.publishLiveDataEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "knowledge-attachments-upload",
      }),
    );
  });

  it("deletes KB attachments and returns updated list", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          message: "ok",
          attachments: [
            {
              id: 100,
              filename: "restante.pdf",
              mime_type: "application/pdf",
              size: 2048,
              date_upload: null,
              url: "/api/v1/dtic/knowledge/articles/7/attachments/100/download",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const result = await deleteKBArticleAttachment("token", 7, 99);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/dtic/knowledge/articles/7/attachments/99",
      expect.objectContaining({
        method: "DELETE",
        headers: { "Session-Token": "token" },
      }),
    );

    expect(result).toEqual([
      {
        id: 100,
        filename: "restante.pdf",
        mime_type: "application/pdf",
        size: 2048,
        date_upload: null,
        url: "/api/v1/dtic/knowledge/articles/7/attachments/100/download",
      },
    ]);

    expect(knowledgeServiceMocks.publishLiveDataEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "knowledge-attachment-delete",
      }),
    );
  });

  it("fetches and opens embedded KB documents through the authenticated proxy", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response("image-bytes", {
          status: 200,
          headers: { "Content-Type": "image/png" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("image-bytes", {
          status: 200,
          headers: { "Content-Type": "image/png" },
        }),
      );

    await expect(fetchKBEmbeddedDocumentBlob("token", 951)).resolves.toBeInstanceOf(Blob);
    await viewKBEmbeddedDocument("token", 951);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/dtic/knowledge/documents/951/content?disposition=inline",
      expect.objectContaining({
        method: "GET",
        headers: { "Session-Token": "token" },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/dtic/knowledge/documents/951/content?disposition=inline",
      expect.objectContaining({
        method: "GET",
        headers: { "Session-Token": "token" },
      }),
    );
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(window.open).toHaveBeenCalledWith("blob:kb-document", "_blank", "noopener,noreferrer");
  });
});
