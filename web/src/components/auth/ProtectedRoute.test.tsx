import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore, type AuthMeResponse } from "@/store/useAuthStore";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  pathname: "/dtic/dashboard",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
  usePathname: () => navigation.pathname,
}));

import { ProtectedRoute } from "./ProtectedRoute";

function makeIdentity(
  context: string,
  overrides: Partial<AuthMeResponse> = {},
): AuthMeResponse {
  return {
    context,
    user_id: 1,
    name: "jonathan-moletta",
    roles: {
      active_profile: { id: 10, name: "Técnico" },
      available_profiles: [{ id: 10, name: "Técnico" }],
      groups: [],
    },
    hub_roles: [
      {
        role: "tecnico",
        label: "Técnico",
        profile_id: 10,
        group_id: null,
        route: "dashboard",
        context_override: null,
      },
    ],
    app_access: ["busca", "carregadores"],
    ...overrides,
  };
}

function resetAuthStore(): void {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  window.localStorage.clear();
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    resetAuthStore();
    navigation.push.mockReset();
    navigation.pathname = "/dtic/dashboard";
  });

  it("redirects unauthenticated users to the gateway root", async () => {
    act(() => {
      useAuthStore.setState({
        _hasHydrated: true,
        isAuthenticated: false,
      });
    });

    render(
      <ProtectedRoute allowedHubRoles={["tecnico"]}>
        <div>dashboard</div>
      </ProtectedRoute>,
    );

    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/"));
  });

  it("redirects authenticated users without active context to the selector", async () => {
    act(() => {
      useAuthStore.setState({
        _hasHydrated: true,
        isAuthenticated: true,
        username: "jonathan-moletta",
        activeContext: null,
        currentUserRole: null,
      });
    });

    render(
      <ProtectedRoute allowedHubRoles={["tecnico"]}>
        <div>dashboard</div>
      </ProtectedRoute>,
    );

    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/selector"));
  });

  it("authorizes sub-roles through the URL context override", () => {
    navigation.pathname = "/sis-manutencao/dashboard";

    act(() => {
      useAuthStore.setState({
        _hasHydrated: true,
        isAuthenticated: true,
        username: "jonathan-moletta",
        activeContext: "sis-manutencao",
        currentUserRole: makeIdentity("sis", {
          roles: {
            active_profile: { id: 21, name: "Técnico Manutenção" },
            available_profiles: [{ id: 21, name: "Técnico Manutenção" }],
            groups: [],
          },
          hub_roles: [
            {
              role: "tecnico-manutencao",
              label: "Técnico Manutenção",
              profile_id: 21,
              group_id: 22,
              route: "dashboard",
              context_override: "sis-manutencao",
            },
          ],
        }),
      });
    });

    render(
      <ProtectedRoute allowedHubRoles={["tecnico"]}>
        <div>dashboard allowed</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText("dashboard allowed")).toBeInTheDocument();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("blocks users whose active role does not satisfy the route contract", () => {
    act(() => {
      useAuthStore.setState({
        _hasHydrated: true,
        isAuthenticated: true,
        username: "jonathan-moletta",
        activeContext: "dtic",
        currentUserRole: makeIdentity("dtic", {
          roles: {
            active_profile: { id: 30, name: "Self-Service" },
            available_profiles: [{ id: 30, name: "Self-Service" }],
            groups: [],
          },
          hub_roles: [
            {
              role: "solicitante",
              label: "Solicitante",
              profile_id: 30,
              group_id: null,
              route: "user",
              context_override: null,
            },
          ],
        }),
      });
    });

    render(
      <ProtectedRoute allowedHubRoles={["tecnico", "gestor"]}>
        <div>dashboard blocked</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText("Acesso Negado")).toBeInTheDocument();
    expect(screen.queryByText("dashboard blocked")).not.toBeInTheDocument();
  });
});
