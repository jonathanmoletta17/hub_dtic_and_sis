import { beforeEach, describe, expect, it, vi } from "vitest";

import { request } from "./httpClient";
import { useAuthStore } from "@/store/useAuthStore";


describe("httpClient", () => {
  beforeEach(() => {
    useAuthStore.setState({
      sessionTokens: {},
      activeContext: null,
      currentUserRole: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      })
    );
  });

  it("reusa o token do contexto base ao chamar um subcontexto", async () => {
    useAuthStore.setState({
      sessionTokens: { sis: "token-sis" },
    });

    await request("/api/v1/sis-manutencao/db/stats");

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/sis/db/stats",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Session-Token": "token-sis",
        }),
      })
    );
  });

  it("preserva um Session-Token explícito quando fornecido", async () => {
    useAuthStore.setState({
      sessionTokens: { sis: "token-store" },
    });

    await request("/api/v1/sis/knowledge/articles", {
      headers: {
        "Session-Token": "token-explicito",
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Session-Token": "token-explicito",
        }),
      })
    );
  });

  it("usa caminhos relativos no browser para manter a mesma origem", async () => {
    await request("/api/v1/dtic/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "user", password: "secret" }),
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/dtic/auth/login",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("injeta o papel ativo no header para autorizacao sensivel no backend", async () => {
    useAuthStore.setState({
      activeContext: "sis",
      currentUserRole: {
        context: "sis",
        user_id: 7,
        name: "jonathan-moletta",
        roles: {
          active_profile: { id: 22, name: "Tecnico" },
          available_profiles: [{ id: 22, name: "Tecnico" }],
          groups: [],
        },
        hub_roles: [
          {
            role: "tecnico-manutencao",
            label: "Tecnico Manutencao",
            profile_id: 22,
            group_id: null,
            route: "dashboard",
            context_override: "sis",
          },
        ],
        app_access: ["carregadores"],
      },
    });

    await request("/api/v1/sis/metrics/chargers");

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/sis/metrics/chargers",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Active-Hub-Role": "tecnico-manutencao",
        }),
      }),
    );
  });
});
