import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/store/useAuthStore";

const hookMocks = vi.hoisted(() => ({
  fetchServiceCatalogMock: vi.fn(),
}));

vi.mock("@/lib/api/formService", () => ({
  fetchServiceCatalog: hookMocks.fetchServiceCatalogMock,
}));

import { useServiceCatalog } from "./useServiceCatalog";

describe("useServiceCatalog", () => {
  beforeEach(() => {
    hookMocks.fetchServiceCatalogMock.mockReset();
    act(() => {
      useAuthStore.setState({
        activeContext: "sis",
      });
    });
  });

  it("loads a normalized catalog and exposes orchestration state only", async () => {
    hookMocks.fetchServiceCatalogMock.mockResolvedValueOnce([
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

    const { result } = renderHook(() => useServiceCatalog());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.catalog).toEqual([
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
    expect(result.current.error).toBeNull();
  });
});
