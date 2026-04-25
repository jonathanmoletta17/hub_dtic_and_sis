import { frontendRuntimeConfig } from "@/lib/config/runtime";

export type AgentChatRole = "assistant" | "user";
export type AgentChatStatus = "ready" | "clarifying" | "draft_ready" | "submitted";

export type AgentChatMessage = {
  role: AgentChatRole;
  content: string;
};

export type AgentChatUserContext = {
  name: string;
  email?: string;
  department?: string;
  requesterId?: number;
  entityId?: number;
};

export type AgentChatDraft = {
  name: string;
  content: string;
  urgency: number;
  urgencyLabel: string;
  type: "incident" | "request";
  typeLabel: string;
  itilcategoriesId: number | null;
  requesterId: number | null;
  entityId: number | null;
  needsClarification: boolean;
  clarificationPrompt: string;
  metadata: Record<string, unknown>;
};

export type AgentChatSubmission = {
  ticketId: number;
  rawResponse: Record<string, unknown>;
};

export type AgentChatSession = {
  sessionId: string;
  source: string;
  context: string;
  status: AgentChatStatus;
  userContext: AgentChatUserContext;
  messages: AgentChatMessage[];
  draft: AgentChatDraft | null;
  submission: AgentChatSubmission | null;
};

export class AgentChatApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "AgentChatApiError";
    this.status = status;
  }
}

type CreateSessionPayload = {
  source?: string;
  context?: string;
  userContext?: AgentChatUserContext;
  initialMessage?: string;
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

async function requestAgentChat<TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  const response = await fetch(`${normalizeBaseUrl(frontendRuntimeConfig.dticAgentApiUrl)}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    let detail = "Falha ao comunicar com o atendimento assistido.";
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload?.detail) {
        detail = payload.detail;
      }
    } catch {
      // Keep generic detail.
    }
    throw new AgentChatApiError(detail, response.status);
  }

  return (await response.json()) as TResponse;
}

export function buildLegacyDticAgentUrl(): string {
  // Legacy handoff helper: DTIC/new-ticket uses the inline hub chat, not this URL path.
  const url = new URL(frontendRuntimeConfig.dticAgentUrl);
  url.searchParams.set("source", "hub-operacional-web");
  url.searchParams.set("context", "dtic");
  return url.toString();
}

export function createDticAgentChatSession(
  payload: CreateSessionPayload = {},
): Promise<AgentChatSession> {
  return requestAgentChat<AgentChatSession>("/api/chat/session", {
    method: "POST",
    body: JSON.stringify({
      source: payload.source || "hub-operacional-web",
      context: payload.context || "dtic",
      userContext: payload.userContext,
      initialMessage: payload.initialMessage || "",
    }),
  });
}

export function sendDticAgentChatMessage(
  sessionId: string,
  message: string,
): Promise<AgentChatSession> {
  return requestAgentChat<AgentChatSession>(`/api/chat/session/${sessionId}/message`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function confirmDticAgentDraft(sessionId: string): Promise<AgentChatSession> {
  return requestAgentChat<AgentChatSession>(`/api/chat/session/${sessionId}/confirm`, {
    method: "POST",
    body: "{}",
  });
}

export function discardDticAgentDraft(sessionId: string): Promise<AgentChatSession> {
  return requestAgentChat<AgentChatSession>(`/api/chat/session/${sessionId}/discard`, {
    method: "POST",
    body: "{}",
  });
}
