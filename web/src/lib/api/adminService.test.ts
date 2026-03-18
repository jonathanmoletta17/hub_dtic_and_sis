import { beforeEach, describe, expect, it, vi } from "vitest";

const adminServiceMocks = vi.hoisted(() => ({
  apiDeleteMock: vi.fn(),
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  publishLiveDataEventMock: vi.fn(),
}));

vi.mock("./client", () => ({
  apiDelete: adminServiceMocks.apiDeleteMock,
  apiGet: adminServiceMocks.apiGetMock,
  apiPost: adminServiceMocks.apiPostMock,
  buildApiPath: (context: string, resource: string) => `/api/v1/${context}/${resource}`,
  withQuery: (path: string) => path,
}));

vi.mock("@/lib/realtime/liveDataBus", () => ({
  publishLiveDataEvent: adminServiceMocks.publishLiveDataEventMock,
}));

import { assignModuleToUser, revokeModuleFromUser } from "./adminService";

describe("adminService", () => {
  beforeEach(() => {
    adminServiceMocks.apiDeleteMock.mockReset();
    adminServiceMocks.apiGetMock.mockReset();
    adminServiceMocks.apiPostMock.mockReset();
    adminServiceMocks.publishLiveDataEventMock.mockReset();
  });

  it("notifies permission consumers after assign/revoke", async () => {
    adminServiceMocks.apiPostMock.mockResolvedValueOnce({ success: true });
    adminServiceMocks.apiDeleteMock.mockResolvedValueOnce({ success: true });

    await assignModuleToUser("dtic", 10, 22, "sis");
    await revokeModuleFromUser("dtic", 10, 22, "sis");

    expect(adminServiceMocks.publishLiveDataEventMock).toHaveBeenCalledTimes(2);
    expect(adminServiceMocks.publishLiveDataEventMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        context: "sis",
        domains: ["permissions"],
      }),
    );
  });
});
