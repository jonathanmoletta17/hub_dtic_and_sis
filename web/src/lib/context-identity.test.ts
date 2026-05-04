import { describe, expect, it } from "vitest";

import {
  getContextIdentity,
  isVisibleContextId,
  resolveApiRootContext,
  resolveVisualContext,
  VISIBLE_CONTEXT_IDS,
} from "./context-identity";

describe("context-identity", () => {
  it("exposes only the three real visible contexts", () => {
    expect(VISIBLE_CONTEXT_IDS).toEqual(["dtic", "sis-conservacao", "sis-manutencao"]);
    expect(isVisibleContextId("dtic")).toBe(true);
    expect(isVisibleContextId("sis-conservacao")).toBe(true);
    expect(isVisibleContextId("sis-manutencao")).toBe(true);
    expect(isVisibleContextId("sis")).toBe(false);
    expect(isVisibleContextId("sis-memoria")).toBe(false);
  });

  it("maps legacy SIS contexts to the canonical conservation visual context", () => {
    expect(resolveVisualContext("sis")).toBe("sis-conservacao");
    expect(resolveVisualContext("sis-memoria")).toBe("sis-conservacao");
    expect(resolveVisualContext("sis-conservacao")).toBe("sis-conservacao");
    expect(resolveVisualContext("sis-manutencao")).toBe("sis-manutencao");
  });

  it("keeps API root context normalization separate from visual identity", () => {
    expect(resolveApiRootContext("sis-conservacao")).toBe("sis");
    expect(resolveApiRootContext("sis-manutencao")).toBe("sis");
    expect(resolveApiRootContext("sis-memoria")).toBe("sis");
    expect(resolveApiRootContext("dtic")).toBe("dtic");
  });

  it("returns user-facing identity labels for aliases", () => {
    expect(getContextIdentity("sis").selectorLabel).toBe("SIS Conservacao");
    expect(getContextIdentity("sis-memoria").selectorLabel).toBe("SIS Conservacao");
    expect(getContextIdentity("sis-manutencao").selectorLabel).toBe("SIS Manutencao");
  });
});
