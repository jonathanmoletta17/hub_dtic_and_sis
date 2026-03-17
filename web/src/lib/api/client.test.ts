import { describe, expect, it } from "vitest";

import { buildApiPath, resolveRootContext, withQuery } from "./client";

describe("apiClient helpers", () => {
  it("builds API paths against root contexts", () => {
    expect(buildApiPath("sis-manutencao", "chargers/kanban")).toBe("/api/v1/sis/chargers/kanban");
    expect(buildApiPath("dtic-especial", "db/stats")).toBe("/api/v1/dtic/db/stats");
    expect(buildApiPath("dtic", "/db/stats")).toBe("/api/v1/dtic/db/stats");
  });

  it("serializes query params without empty values", () => {
    expect(
      withQuery("/api/v1/sis/db/tickets", {
        status: "1,2,3",
        requester_id: 10,
        department: undefined,
        empty: "",
      }),
    ).toBe("/api/v1/sis/db/tickets?status=1%2C2%2C3&requester_id=10");
  });

  it("normalizes subcontexts to their root context", () => {
    expect(resolveRootContext("sis-manutencao")).toBe("sis");
    expect(resolveRootContext("dtic-especial")).toBe("dtic");
    expect(resolveRootContext("dtic")).toBe("dtic");
  });
});
