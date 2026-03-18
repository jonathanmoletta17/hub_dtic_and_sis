import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useAuthStore, type AuthMeResponse } from "@/store/useAuthStore";

import { ContextGuard } from "./ContextGuard";

function makeIdentity(
  context: string,
  overrides: Partial<AuthMeResponse> = {},
): AuthMeResponse {
  return {
    context,
    user_id: 1,
    name: "jonathan-moletta",
    roles: {
      active_profile: { id: 10, name: "Tecnico" },
      available_profiles: [{ id: 10, name: "Tecnico" }],
      groups: [],
    },
    hub_roles: [
      {
        role: "tecnico",
        label: "Tecnico",
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

describe("ContextGuard", () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it("allows a sub-role when the feature accepts its base role and app access is present", () => {
    act(() => {
      useAuthStore.setState({
        _hasHydrated: true,
        activeContext: "sis",
        currentUserRole: makeIdentity("sis", {
          hub_roles: [
            {
              role: "tecnico-manutencao",
              label: "Tecnico Manutencao",
              profile_id: 21,
              group_id: 22,
              route: "dashboard",
              context_override: "sis-manutencao",
            },
          ],
          app_access: ["carregadores"],
        }),
      });
    });

    render(
      <ContextGuard featureId="chargers">
        <div>chargers module</div>
      </ContextGuard>,
    );

    expect(screen.getByText("chargers module")).toBeInTheDocument();
  });

  it("blocks a feature when app-level access is missing", () => {
    act(() => {
      useAuthStore.setState({
        _hasHydrated: true,
        activeContext: "sis",
        currentUserRole: makeIdentity("sis", {
          app_access: [],
        }),
      });
    });

    render(
      <ContextGuard featureId="chargers">
        <div>chargers module</div>
      </ContextGuard>,
    );

    expect(screen.getByText(/m[oó]dulo restrito/i)).toBeInTheDocument();
    expect(screen.queryByText("chargers module")).not.toBeInTheDocument();
  });

  it("blocks chargers when active role is solicitante even if another hub role is technical", () => {
    const solicitanteRole = {
      role: "solicitante",
      label: "Central do Solicitante",
      profile_id: 11,
      group_id: null,
      route: "user",
      context_override: null,
    };
    const tecnicoRole = {
      role: "tecnico",
      label: "Console do Tecnico",
      profile_id: 10,
      group_id: null,
      route: "dashboard",
      context_override: null,
    };

    act(() => {
      useAuthStore.setState({
        _hasHydrated: true,
        activeContext: "sis",
        currentUserRole: makeIdentity("sis", {
          hub_roles: [solicitanteRole, tecnicoRole],
          active_hub_role: solicitanteRole,
          app_access: ["carregadores"],
        }),
      });
    });

    render(
      <ContextGuard featureId="chargers">
        <div>chargers module</div>
      </ContextGuard>,
    );

    expect(screen.getByText(/acesso negado/i)).toBeInTheDocument();
    expect(screen.queryByText("chargers module")).not.toBeInTheDocument();
  });

  it("reports unavailable features explicitly for unsupported contexts", () => {
    act(() => {
      useAuthStore.setState({
        _hasHydrated: true,
        activeContext: "dtic",
        currentUserRole: makeIdentity("dtic"),
      });
    });

    render(
      <ContextGuard featureId="feature-inexistente">
        <div>never visible</div>
      </ContextGuard>,
    );

    expect(screen.getByText(/funcionalidade indispon[ií]vel/i)).toBeInTheDocument();
    expect(screen.queryByText("never visible")).not.toBeInTheDocument();
  });

  it("allows analytics only when dtic-metrics is present", () => {
    act(() => {
      useAuthStore.setState({
        _hasHydrated: true,
        activeContext: "dtic",
        currentUserRole: makeIdentity("dtic", {
          app_access: ["dtic-metrics"],
        }),
      });
    });

    render(
      <ContextGuard featureId="analytics">
        <div>analytics module</div>
      </ContextGuard>,
    );

    expect(screen.getByText("analytics module")).toBeInTheDocument();
  });

  it("blocks analytics when only dtic-kpi is present", () => {
    act(() => {
      useAuthStore.setState({
        _hasHydrated: true,
        activeContext: "dtic",
        currentUserRole: makeIdentity("dtic", {
          app_access: ["dtic-kpi"],
        }),
      });
    });

    render(
      <ContextGuard featureId="analytics">
        <div>analytics module</div>
      </ContextGuard>,
    );

    expect(screen.getByText(/m[oó]dulo restrito/i)).toBeInTheDocument();
    expect(screen.queryByText("analytics module")).not.toBeInTheDocument();
  });

  it("blocks analytics when none of the required OR app tags is present", () => {
    act(() => {
      useAuthStore.setState({
        _hasHydrated: true,
        activeContext: "dtic",
        currentUserRole: makeIdentity("dtic", {
          app_access: ["dtic-infra"],
        }),
      });
    });

    render(
      <ContextGuard featureId="analytics">
        <div>analytics module</div>
      </ContextGuard>,
    );

    expect(screen.getByText(/m[oó]dulo restrito/i)).toBeInTheDocument();
    expect(screen.queryByText("analytics module")).not.toBeInTheDocument();
  });

  it("allows inventory in DTIC only when inventario tag is present", () => {
    act(() => {
      useAuthStore.setState({
        _hasHydrated: true,
        activeContext: "dtic",
        currentUserRole: makeIdentity("dtic", {
          app_access: ["inventario"],
        }),
      });
    });

    render(
      <ContextGuard featureId="inventory">
        <div>inventory module</div>
      </ContextGuard>,
    );

    expect(screen.getByText("inventory module")).toBeInTheDocument();
  });

  it("blocks inventory when inventario tag is missing", () => {
    act(() => {
      useAuthStore.setState({
        _hasHydrated: true,
        activeContext: "dtic",
        currentUserRole: makeIdentity("dtic", {
          app_access: ["busca"],
        }),
      });
    });

    render(
      <ContextGuard featureId="inventory">
        <div>inventory module</div>
      </ContextGuard>,
    );

    expect(screen.getByText(/m[oó]dulo restrito/i)).toBeInTheDocument();
    expect(screen.queryByText("inventory module")).not.toBeInTheDocument();
  });
});
