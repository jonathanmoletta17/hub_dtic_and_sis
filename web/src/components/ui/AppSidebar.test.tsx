/* eslint-disable @next/next/no-img-element */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppSidebar } from "./AppSidebar";
import type { AuthMeResponse } from "@/store/useAuthStore";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/sis-conservacao/dashboard",
  useParams: () => ({ context: "sis-conservacao" }),
}));

vi.mock("next/image", () => ({
  default: ({ alt, fill, ...imgProps }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => {
    void fill;
    return <img alt={alt ?? ""} {...imgProps} />;
  },
}));

const identity: AuthMeResponse = {
  context: "sis",
  user_id: 10,
  name: "Tecnico Conservacao",
  roles: {
    active_profile: { id: 9, name: "Portfolio" },
    available_profiles: [{ id: 9, name: "Portfolio" }],
    groups: [21],
  },
  hub_roles: [
    {
      role: "tecnico-conservacao",
      label: "Conservacao",
      profile_id: null,
      group_id: 21,
      route: "dashboard",
      context_override: "sis-conservacao",
    },
  ],
  app_access: [],
};

describe("AppSidebar context identity", () => {
  it("uses the specific SIS conservation identity instead of a generic SIS subtitle", () => {
    render(
      <AppSidebar
        contextOverride="sis-conservacao"
        pathnameOverride="/sis-conservacao/dashboard"
        currentUserRoleOverride={identity}
        showProfileMenu={false}
      />,
    );

    expect(screen.getByText("SIS - Conservacao e Servicos")).toBeVisible();
    expect(screen.queryByText("Sistema de Infraestrutura e Servicos")).not.toBeInTheDocument();
  });

  it("uses the specific SIS maintenance identity", () => {
    render(
      <AppSidebar
        contextOverride="sis-manutencao"
        pathnameOverride="/sis-manutencao/dashboard"
        currentUserRoleOverride={{
          ...identity,
          hub_roles: [
            {
              role: "tecnico-manutencao",
              label: "Manutencao",
              profile_id: null,
              group_id: 22,
              route: "dashboard",
              context_override: "sis-manutencao",
            },
          ],
        }}
        showProfileMenu={false}
      />,
    );

    expect(screen.getByText("SIS - Manutencao Predial")).toBeVisible();
    expect(screen.queryByText("Sistema de Infraestrutura e Servicos")).not.toBeInTheDocument();
  });
});
