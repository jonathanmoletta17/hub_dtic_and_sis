import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/store/useAuthStore";
import { useWizardStore } from "@/store/useWizardStore";

const schemaHookMocks = vi.hoisted(() => ({
  fetchResolvedFormSchemaMock: vi.fn(),
}));

vi.mock("@/lib/api/formService", () => ({
  fetchResolvedFormSchema: schemaHookMocks.fetchResolvedFormSchemaMock,
}));

import { useFormSchema } from "./useFormSchema";

describe("useFormSchema", () => {
  beforeEach(() => {
    schemaHookMocks.fetchResolvedFormSchemaMock.mockReset();
    act(() => {
      useAuthStore.setState({ activeContext: "sis" });
      useWizardStore.setState({
        selectedFormId: 7,
        schema: null,
        isLoadingSchema: false,
      });
    });
  });

  it("loads the normalized form schema and stores it without doing local mapping work", async () => {
    schemaHookMocks.fetchResolvedFormSchemaMock.mockResolvedValueOnce({
      id: 7,
      name: "Abertura",
      category: "9",
      accessRights: "PUBLIC",
      sections: [],
    });

    const { result } = renderHook(() => useFormSchema());

    await waitFor(() => expect(useWizardStore.getState().schema).not.toBeNull());

    expect(useWizardStore.getState().schema).toEqual({
      id: 7,
      name: "Abertura",
      category: "9",
      accessRights: "PUBLIC",
      sections: [],
    });
    expect(result.current.fetchError).toBeNull();
  });
});
