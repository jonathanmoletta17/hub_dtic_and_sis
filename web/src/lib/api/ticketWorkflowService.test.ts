import { beforeEach, describe, expect, it, vi } from "vitest";

const ticketWorkflowMocks = vi.hoisted(() => ({
  getSessionTokenMock: vi.fn(),
  getCachedSessionMock: vi.fn(),
  getActiveHubRoleForContextMock: vi.fn(),
}));

vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: {
    getState: () => ({
      getSessionToken: ticketWorkflowMocks.getSessionTokenMock,
      getCachedSession: ticketWorkflowMocks.getCachedSessionMock,
      getActiveHubRoleForContext: ticketWorkflowMocks.getActiveHubRoleForContextMock,
    }),
  },
}));

vi.mock("@/lib/realtime/liveDataBus", () => ({
  publishLiveDataEvent: vi.fn(),
}));

import { previewTicketAttachment } from "./ticketWorkflowService";

describe("ticketWorkflowService attachment preview", () => {
  beforeEach(() => {
    ticketWorkflowMocks.getSessionTokenMock.mockReset();
    ticketWorkflowMocks.getCachedSessionMock.mockReset();
    ticketWorkflowMocks.getActiveHubRoleForContextMock.mockReset();
    vi.restoreAllMocks();
  });

  it("uses the cached context session when sessionTokens has not been populated", async () => {
    ticketWorkflowMocks.getSessionTokenMock.mockReturnValue(null);
    ticketWorkflowMocks.getCachedSessionMock.mockReturnValue({
      session_token: "cached-token",
    });
    ticketWorkflowMocks.getActiveHubRoleForContextMock.mockReturnValue({ role: "solicitante" });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(["png"], { type: "image/png" }),
    } as Response);

    await expect(
      previewTicketAttachment("dtic", 14134, {
        id: 4115,
        parentType: "ITILFollowup",
        parentId: 99,
        filename: "age_paste6581061.png",
        mimeType: "image/png",
        size: 3,
        url: "/download",
      }),
    ).resolves.toEqual({
      objectUrl: "blob:preview",
      contentType: "image/png",
      filename: "age_paste6581061.png",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/dtic/tickets/14134/attachments/4115/download?disposition=inline",
      expect.objectContaining({
        headers: {
          "Session-Token": "cached-token",
          "X-Active-Hub-Role": "solicitante",
        },
      }),
    );
  });
});
