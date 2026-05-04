import { beforeEach, describe, expect, it, vi } from "vitest";

const formServiceMocks = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  fetchLookupItemsMock: vi.fn(),
  publishLiveDataEventMock: vi.fn(),
  getSessionTokenMock: vi.fn(),
  getActiveHubRoleForContextMock: vi.fn(),
}));

vi.mock("./client", () => ({
  apiGet: formServiceMocks.apiGetMock,
  apiPost: formServiceMocks.apiPostMock,
  buildApiPath: (context: string, resource: string) => `/api/v1/${context}/${resource}`,
  withQuery: (path: string, params?: Record<string, unknown>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    }
    const serialized = query.toString();
    return serialized ? `${path}?${serialized}` : path;
  },
}));

vi.mock("./lookupService", () => ({
  fetchLookupItems: formServiceMocks.fetchLookupItemsMock,
}));

vi.mock("@/lib/realtime/liveDataBus", () => ({
  publishLiveDataEvent: formServiceMocks.publishLiveDataEventMock,
}));

vi.mock("./httpClient", () => ({
  API_BASE: "",
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  normalizeApiPath: (path: string) => path,
}));

vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: {
    getState: () => ({
      getSessionToken: formServiceMocks.getSessionTokenMock,
      getActiveHubRoleForContext: formServiceMocks.getActiveHubRoleForContextMock,
    }),
  },
}));

import { fetchResolvedFormSchema, fetchServiceCatalog, submitFormAnswers } from "./formService";

describe("formService", () => {
  beforeEach(() => {
    formServiceMocks.apiGetMock.mockReset();
    formServiceMocks.apiPostMock.mockReset();
    formServiceMocks.fetchLookupItemsMock.mockReset();
    formServiceMocks.publishLiveDataEventMock.mockReset();
    formServiceMocks.getSessionTokenMock.mockReset();
    formServiceMocks.getActiveHubRoleForContextMock.mockReset();
    vi.restoreAllMocks();
  });

  it("returns a normalized service catalog", async () => {
    formServiceMocks.apiGetMock
      .mockResolvedValueOnce([
        { id: 1, name: "Manutenção", parent_id: 0, level: 1, completename: "Manutenção > Manutenção" },
      ])
      .mockResolvedValueOnce([
        { id: 10, name: "Elétrica", description: "Troca de tomada", category_id: 1 },
      ]);

    await expect(fetchServiceCatalog("sis")).resolves.toEqual([
      {
        id: 1,
        group: "Manutenção",
        icon: "🔧",
        items: [
          {
            formId: 10,
            name: "Elétrica",
            description: "Troca de tomada",
            icon: "⚡",
            categoryId: 1,
            techOnly: false,
          },
        ],
      },
    ]);
  });

  it("returns a normalized resolved form schema and delegates lookup resolution to the lookup domain", async () => {
    formServiceMocks.apiGetMock.mockResolvedValueOnce({
      form: { id: 7, name: "Abertura", plugin_formcreator_categories_id: 9, access_rights: 1 },
      sections: [
        {
          id: 1,
          name: "Dados",
          order: 1,
          show_rule: 0,
          questions: [
            {
              id: 100,
              name: "Local",
              fieldtype: "dropdown",
              required: true,
              layout: { row: 1, col: 0, width: 4 },
              lookup: { source: "locations", params: { show_tree_root: 12 } },
            },
          ],
        },
      ],
      conditions: [],
      regexes: [],
      ranges: [],
    });
    formServiceMocks.fetchLookupItemsMock.mockResolvedValueOnce([
      { id: 1, name: "Patio", completename: "Campus > Patio", label: "Campus > Patio" },
    ]);

    await expect(fetchResolvedFormSchema("sis", 7)).resolves.toEqual({
      id: 7,
      name: "Abertura",
      category: "9",
      accessRights: "PUBLIC",
      sections: [
        {
          id: 1,
          name: "Dados",
          order: 1,
          showRule: "always",
          conditions: [],
          questions: [
            {
              id: 100,
              name: "Local",
              fieldtype: "dropdown",
              required: true,
              row: 1,
              col: 0,
              width: 4,
              options: undefined,
              defaultValue: undefined,
              resolvedOptions: [{ id: 1, name: "Patio", completename: "Campus > Patio" }],
              showRule: "always",
              conditions: [],
            },
          ],
        },
      ],
    });

    expect(formServiceMocks.fetchLookupItemsMock).toHaveBeenCalledWith("sis", "locations", 12);
  });

  it("submits answers through the write endpoint", async () => {
    formServiceMocks.apiPostMock.mockResolvedValueOnce({
      form_answer_id: 88,
      message: "ok",
      ticket_ids: [55],
    });

    await expect(submitFormAnswers("sis", 7, { q_1: "ok" })).resolves.toEqual({
      form_answer_id: 88,
      message: "ok",
      ticket_ids: [55],
    });

    expect(formServiceMocks.publishLiveDataEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "sis",
        source: "mutation",
      }),
    );
  });

  it("submits file answers through the multipart endpoint", async () => {
    formServiceMocks.getSessionTokenMock.mockReturnValue("session-token");
    formServiceMocks.getActiveHubRoleForContextMock.mockReturnValue({ role: "solicitante" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        form_answer_id: 89,
        message: "ok",
        ticket_ids: [56],
      }),
    } as Response);
    const file = new File(["conteudo"], "foto.png", { type: "image/png" });

    await expect(
      submitFormAnswers("sis", 7, { 1: "ok" }, [{ questionId: 99, file }]),
    ).resolves.toEqual({
      form_answer_id: 89,
      message: "ok",
      ticket_ids: [56],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/sis/domain/formcreator/forms/7/submit-multipart",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Session-Token": "session-token",
          "X-Active-Hub-Role": "solicitante",
        },
      }),
    );
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(requestInit.body).toBeInstanceOf(FormData);
    expect(formServiceMocks.publishLiveDataEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "sis",
        source: "mutation",
      }),
    );
  });
});
