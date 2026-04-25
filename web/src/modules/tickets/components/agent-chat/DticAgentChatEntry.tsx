"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { DticAgentChatSurface } from "@/modules/tickets/components/agent-chat/DticAgentChatSurface";
import {
  AgentChatApiError,
  type AgentChatSession,
  confirmDticAgentDraft,
  createDticAgentChatSession,
  discardDticAgentDraft,
  sendDticAgentChatMessage,
} from "@/lib/api/agent-chat-service";
import { useAuthStore } from "@/store/useAuthStore";

export function DticAgentChatEntry() {
  const { currentUserRole } = useAuthStore();
  const [session, setSession] = useState<AgentChatSession | null>(null);
  const [composer, setComposer] = useState("");
  const [sessionSeed, setSessionSeed] = useState(0);
  const [booting, setBooting] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const requesterId = currentUserRole?.user_id;
  const requesterName = currentUserRole?.name || "Usuario autenticado";
  const deferredMessages = useDeferredValue(session?.messages ?? []);
  const userMessageCount = session?.messages.filter((message) => message.role === "user").length ?? 0;
  const assistantIntro =
    deferredMessages.find((message) => message.role === "assistant")?.content ??
    "Escreva o problema, erro ou pedido. Se faltar detalhe, eu peco.";
  const isFreshSession = Boolean(session) && userMessageCount === 0 && !session?.draft && !session?.submission;
  const showSummaryPanel = Boolean(session?.draft || session?.submission);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      setBooting(true);
      setError(null);

      try {
        const nextSession = await createDticAgentChatSession({
          userContext: {
            name: requesterName,
            requesterId,
          },
        });

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setSession(nextSession);
          setActionError(null);
        });
      } catch (cause) {
        if (!cancelled) {
          const message =
            cause instanceof AgentChatApiError
              ? cause.message
              : "Nao foi possivel iniciar o atendimento assistido.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setBooting(false);
        }
      }
    }

    void bootstrapSession();
    return () => {
      cancelled = true;
    };
  }, [requesterId, requesterName, sessionSeed]);

  async function applySessionUpdate(
    operation: Promise<AgentChatSession>,
    finish: () => void,
  ) {
    try {
      const nextSession = await operation;
      startTransition(() => {
        setSession(nextSession);
        setActionError(null);
      });
    } catch (cause) {
      const message =
        cause instanceof AgentChatApiError
          ? cause.message
          : "Falha ao atualizar a conversa.";
      setActionError(message);
    } finally {
      finish();
    }
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessageText(composer);
  }

  async function sendMessageText(rawMessage: string) {
    if (!session || !rawMessage.trim() || sending) {
      return;
    }

    const nextMessage = rawMessage.trim();
    setComposer("");
    setSending(true);
    await applySessionUpdate(
      sendDticAgentChatMessage(session.sessionId, nextMessage),
      () => setSending(false),
    );
  }

  async function handleConfirmDraft() {
    if (!session || !session.draft || confirming) {
      return;
    }

    setConfirming(true);
    await applySessionUpdate(confirmDticAgentDraft(session.sessionId), () => setConfirming(false));
  }

  async function handleDiscardDraft() {
    if (!session || discarding) {
      return;
    }

    setDiscarding(true);
    await applySessionUpdate(discardDticAgentDraft(session.sessionId), () => setDiscarding(false));
  }

  function handleRestartConversation() {
    setComposer("");
    setError(null);
    setActionError(null);
    setSession(null);
    startTransition(() => {
      setSessionSeed((current) => current + 1);
    });
  }

  return (
    <DticAgentChatSurface
      requesterName={requesterName}
      session={session}
      composer={composer}
      deferredMessages={deferredMessages}
      assistantIntro={assistantIntro}
      isFreshSession={isFreshSession}
      showSummaryPanel={showSummaryPanel}
      booting={booting}
      sending={sending}
      confirming={confirming}
      discarding={discarding}
      error={error}
      actionError={actionError}
      onComposerChange={setComposer}
      onSubmitMessage={handleSendMessage}
      onPromptSelect={(prompt) => void sendMessageText(prompt)}
      onRestartConversation={handleRestartConversation}
      onConfirmDraft={() => void handleConfirmDraft()}
      onDiscardDraft={() => void handleDiscardDraft()}
    />
  );
}
