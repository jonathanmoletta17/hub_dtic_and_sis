import { apiLogin, GlpiApiError } from "@/lib/api/glpiService";
import type { AuthMeResponse } from "@/store/useAuthStore";

type RootContext = "dtic" | "sis";
type LoginFn = (context: string, payload: Record<string, string>) => Promise<AuthMeResponse>;

const ROOT_CONTEXTS: RootContext[] = ["dtic", "sis"];

export async function bootstrapContextSessions(
  username: string,
  password: string,
  primaryContext: RootContext,
  primaryIdentity: AuthMeResponse,
  loginFn: LoginFn = apiLogin
): Promise<Record<string, AuthMeResponse>> {
  const sessions: Record<string, AuthMeResponse> = {
    [primaryContext]: primaryIdentity,
  };

  const secondaryContexts = ROOT_CONTEXTS.filter((context) => context !== primaryContext);
  const results = await Promise.allSettled(
    secondaryContexts.map(async (context) => ({
      context,
      identity: await loginFn(context, { username, password }),
    }))
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      sessions[result.value.context] = result.value.identity;
      continue;
    }

    const error = result.reason;
    if (error instanceof GlpiApiError && (error.status === 401 || error.status === 403)) {
      continue;
    }

    console.warn("Falha ao pré-aquecer sessão de contexto adicional:", error);
  }

  return sessions;
}
