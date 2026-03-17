import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useAuthStore, type AuthMeResponse } from "./useAuthStore";

function makeIdentity(
  context: string,
  overrides: Partial<AuthMeResponse> = {},
): AuthMeResponse {
  return {
    context,
    user_id: 1,
    name: "jonathan-moletta",
    roles: {
      active_profile: { id: 4, name: "Super-Admin" },
      available_profiles: [{ id: 4, name: "Super-Admin" }],
      groups: [],
    },
    hub_roles: [
      {
        role: "gestor",
        label: "Super-Admin",
        profile_id: 4,
        group_id: null,
        route: "dashboard",
        context_override: null,
      },
    ],
    app_access: ["busca", "carregadores", "permissoes"],
    ...overrides,
  };
}

function resetAuthStore(): void {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  window.localStorage.clear();
}

describe("useAuthStore", () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it("persists login state in memory and keeps credentials available for session bootstrap", () => {
    act(() => {
      useAuthStore.getState().login("jonathan-moletta", "secret");
    });

    const state = useAuthStore.getState();

    expect(state.isAuthenticated).toBe(true);
    expect(state.username).toBe("jonathan-moletta");
    expect(state.getCredentials()).toEqual({
      username: "jonathan-moletta",
      password: "secret",
    });
    expect(state.activeContext).toBeNull();
    expect(state.currentUserRole).toBeNull();
  });

  it("stores session token when a context becomes active and keeps cached sessions retrievable", () => {
    const sisIdentity = makeIdentity("sis", { session_token: "token-sis" });

    act(() => {
      useAuthStore.getState().cacheContextSession("sis", sisIdentity);
      useAuthStore.getState().setActiveContext("sis", sisIdentity);
    });

    const state = useAuthStore.getState();

    expect(state.activeContext).toBe("sis");
    expect(state.currentUserRole).toEqual(sisIdentity);
    expect(state.getCachedSession("sis")).toEqual(sisIdentity);
    expect(state.getSessionToken("sis")).toBe("token-sis");
  });

  it("logout clears identity, active context and persisted session tokens", () => {
    const dticIdentity = makeIdentity("dtic", { session_token: "token-dtic" });

    act(() => {
      useAuthStore.getState().login("jonathan-moletta", "secret");
      useAuthStore.getState().setActiveContext("dtic", dticIdentity);
      useAuthStore.getState().cacheContextSession("dtic", dticIdentity);
      useAuthStore.getState().setActiveView("tech");
      useAuthStore.getState().logout();
    });

    const state = useAuthStore.getState();

    expect(state.isAuthenticated).toBe(false);
    expect(state.username).toBeNull();
    expect(state.getCredentials()).toBeNull();
    expect(state.activeContext).toBeNull();
    expect(state.currentUserRole).toBeNull();
    expect(state.activeView).toBeNull();
    expect(state.contextSessions).toEqual({});
    expect(state.sessionTokens).toEqual({});
  });

  it("resolves active hub role by context override, active profile and explicit active hub role", () => {
    const identity = makeIdentity("sis", {
      roles: {
        active_profile: { id: 9, name: "Solicitante" },
        available_profiles: [
          { id: 9, name: "Solicitante" },
          { id: 4, name: "Gestor" },
        ],
        groups: [],
      },
      hub_roles: [
        {
          role: "solicitante",
          label: "Solicitante",
          profile_id: 9,
          group_id: null,
          route: "user",
          context_override: null,
        },
        {
          role: "tecnico-manutencao",
          label: "Manutencao",
          profile_id: null,
          group_id: 22,
          route: "dashboard",
          context_override: "sis-manutencao",
        },
      ],
    });

    act(() => {
      useAuthStore.getState().setActiveContext("sis", identity);
    });

    expect(useAuthStore.getState().getActiveHubRoleForContext("sis-manutencao")?.role).toBe(
      "tecnico-manutencao",
    );
    expect(useAuthStore.getState().getActiveHubRoleForContext("sis")?.role).toBe("solicitante");

    act(() => {
      useAuthStore.getState().setActiveContext("sis", {
        ...identity,
        active_hub_role: {
          role: "gestor",
          label: "Gestor",
          profile_id: 4,
          group_id: null,
          route: "dashboard",
          context_override: "sis",
        },
      });
    });

    expect(useAuthStore.getState().getActiveHubRoleForContext("sis")?.role).toBe("gestor");
  });

  it("derives operational view from active hub role semantics", () => {
    act(() => {
      useAuthStore.getState().setActiveContext(
        "dtic",
        makeIdentity("dtic", {
          active_hub_role: {
            role: "solicitante",
            label: "Solicitante",
            profile_id: 9,
            group_id: null,
            route: "user",
            context_override: null,
          },
        }),
      );
    });

    expect(useAuthStore.getState().getOperationalViewForContext("dtic")).toBe("user");

    act(() => {
      useAuthStore.getState().setActiveContext(
        "dtic",
        makeIdentity("dtic", {
          active_hub_role: {
            role: "tecnico",
            label: "Tecnico",
            profile_id: 6,
            group_id: null,
            route: "dashboard",
            context_override: null,
          },
        }),
      );
    });

    expect(useAuthStore.getState().getOperationalViewForContext("dtic")).toBe("tech");
  });
});
