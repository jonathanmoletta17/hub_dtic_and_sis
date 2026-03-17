import { describe, expect, it, vi } from "vitest";

import { GlpiApiError } from "@/lib/api/glpiService";
import { bootstrapContextSessions } from "./contextSessionBootstrap";

const makeIdentity = (context: string, token: string) => ({
  context,
  user_id: 1,
  name: "jonathan-moletta",
  roles: {
    active_profile: { id: 1, name: "Super-Admin" },
    available_profiles: [{ id: 1, name: "Super-Admin" }],
    groups: [],
  },
  hub_roles: [],
  session_token: token,
});

describe("bootstrapContextSessions", () => {
  it("pré-carrega o contexto secundário quando as credenciais também são válidas nele", async () => {
    const loginFn = vi.fn(async (context: string) => makeIdentity(context, `token-${context}`));

    const sessions = await bootstrapContextSessions(
      "jonathan-moletta",
      "secret",
      "dtic",
      makeIdentity("dtic", "token-dtic"),
      loginFn
    );

    expect(sessions).toEqual({
      dtic: makeIdentity("dtic", "token-dtic"),
      sis: makeIdentity("sis", "token-sis"),
    });
    expect(loginFn).toHaveBeenCalledTimes(1);
    expect(loginFn).toHaveBeenCalledWith("sis", {
      username: "jonathan-moletta",
      password: "secret",
    });
  });

  it("mantém apenas o contexto primário quando o secundário retorna 401", async () => {
    const loginFn = vi.fn(async () => {
      throw new GlpiApiError("Sem acesso", 401);
    });

    const sessions = await bootstrapContextSessions(
      "jonathan-moletta",
      "secret",
      "dtic",
      makeIdentity("dtic", "token-dtic"),
      loginFn
    );

    expect(sessions).toEqual({
      dtic: makeIdentity("dtic", "token-dtic"),
    });
  });
});
