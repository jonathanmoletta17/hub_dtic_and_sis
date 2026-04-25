"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleDashed,
  LoaderCircle,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";

import { DticAgentWelcomePanel } from "@/modules/tickets/components/agent-chat/DticAgentWelcomePanel";
import type { AgentChatMessage, AgentChatSession } from "@/lib/api/agent-chat-service";

export const STARTER_PROMPTS = [
  "Sem acesso a sistema",
  "Erro no email",
  "Notebook com problema",
  "Solicitar equipamento",
] as const;

const STATUS_META = {
  ready: {
    label: "Em atendimento",
    tone: "text-[var(--status-solved)]",
    icon: CircleDashed,
  },
  clarifying: {
    label: "Pedindo detalhe",
    tone: "text-[var(--status-active)]",
    icon: MessageSquareMore,
  },
  draft_ready: {
    label: "Pronto para revisar",
    tone: "text-[var(--status-new)]",
    icon: ShieldCheck,
  },
  submitted: {
    label: "Chamado aberto",
    tone: "text-[var(--status-solved)]",
    icon: CheckCircle2,
  },
} satisfies Record<
  AgentChatSession["status"],
  { label: string; tone: string; icon: typeof CircleDashed }
>;

export function normalizeAssistantMessage(content: string) {
  const normalizedContent = content
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
  if (/^Descreva o problema ou pedido\./i.test(normalizedContent)) {
    return "Escreva o problema, erro ou pedido. Se faltar detalhe, eu peço.";
  }

  if (/^Analise pronta\./i.test(normalizedContent)) {
    return "Montei o chamado. Revise os dados e confirme se estiver tudo certo.";
  }

  if (/^Draft descartado\./i.test(normalizedContent)) {
    return "Tudo certo. Me diga de novo o que aconteceu ou o que voce precisa.";
  }

  const ticketMatch = normalizedContent.match(/(?:Ticket|Chamado aberto:?)\s*#(\d+)/i);
  if (ticketMatch) {
    return `Chamado aberto: #${ticketMatch[1]}.`;
  }

  return normalizedContent;
}

function MessageBubble({
  message,
  index,
}: {
  message: AgentChatMessage;
  index: number;
}) {
  const isAssistant = message.role === "assistant";
  const content = isAssistant ? normalizeAssistantMessage(message.content) : message.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.12) }}
      className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`max-w-[44rem] rounded-[30px] px-5 py-4 shadow-[var(--floating-shadow)] ${
          isAssistant
            ? "theme-card text-text-1"
            : "text-text-1"
        }`}
        style={
          isAssistant
            ? undefined
            : {
                background: "var(--accent-primary-subtle)",
                border: "1px solid color-mix(in srgb, var(--accent-primary) 24%, transparent)",
              }
        }
      >
        <div className="theme-copy-soft mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
          {isAssistant ? <Bot size={13} /> : <Sparkles size={13} />}
          {isAssistant ? "Atendimento" : "Voce"}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-7 text-current/95">{content}</p>
      </div>
    </motion.div>
  );
}

function DraftField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b py-3 last:border-b-0" style={{ borderColor: "var(--border-subtle)" }}>
      <p className="theme-copy-soft text-[11px] font-semibold uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-1 text-sm leading-6 text-text-1">{value}</p>
    </div>
  );
}

export type DticAgentChatSurfaceProps = {
  requesterName: string;
  session: AgentChatSession | null;
  composer: string;
  deferredMessages: AgentChatMessage[];
  assistantIntro: string;
  isFreshSession: boolean;
  showSummaryPanel: boolean;
  booting: boolean;
  sending: boolean;
  confirming: boolean;
  discarding: boolean;
  error: string | null;
  actionError: string | null;
  onComposerChange: (value: string) => void;
  onSubmitMessage: (event: FormEvent<HTMLFormElement>) => void;
  onPromptSelect: (prompt: string) => void;
  onRestartConversation: () => void;
  onConfirmDraft: () => void;
  onDiscardDraft: () => void;
};

export function DticAgentChatSurface({
  requesterName,
  session,
  composer,
  deferredMessages,
  assistantIntro,
  isFreshSession,
  showSummaryPanel,
  booting,
  sending,
  confirming,
  discarding,
  error,
  actionError,
  onComposerChange,
  onSubmitMessage,
  onPromptSelect,
  onRestartConversation,
  onConfirmDraft,
  onDiscardDraft,
}: DticAgentChatSurfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const statusMeta = session ? STATUS_META[session.status] : STATUS_META.ready;
  const StatusIcon = statusMeta.icon;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: deferredMessages.length > 1 ? "smooth" : "auto",
      block: "end",
    });
  }, [deferredMessages.length]);

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  function renderComposerPanel(options?: { compact?: boolean }) {
    const compact = options?.compact ?? false;

    return (
      <>
        {actionError ? (
          <div className="mb-3 rounded-2xl border border-red-400/15 bg-red-500/8 px-4 py-3 text-sm text-red-100">
            {actionError}
          </div>
        ) : null}

        <form ref={formRef} className="flex flex-col gap-3" onSubmit={onSubmitMessage}>
          <div className={`theme-floating-panel rounded-[30px] ${compact ? "p-3.5" : "p-3"}`}>
            <textarea
              ref={textareaRef}
              value={composer}
              onChange={(event) => onComposerChange(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={compact ? 3 : 2}
              placeholder="Escreva o problema, erro ou pedido."
              className={`w-full resize-none bg-transparent px-3 py-2 text-sm leading-7 text-text-1 outline-none placeholder:text-text-3 ${
                compact ? "min-h-[6rem]" : "min-h-[5.25rem]"
              }`}
            />

            <div
              className="mt-2 flex flex-col gap-3 border-t px-2 pt-3 sm:flex-row sm:items-center sm:justify-between"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <p className="theme-copy-soft text-xs leading-6">Enter envia.</p>
              <button
                type="submit"
                disabled={!session || !composer.trim() || sending}
                className="theme-button-primary inline-flex items-center justify-center gap-2 rounded-[22px] px-5 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45"
              >
                {sending ? <LoaderCircle className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                {sending ? "Enviando" : "Enviar mensagem"}
              </button>
            </div>
          </div>
        </form>
      </>
    );
  }

  return (
    <section className="mx-auto flex min-h-0 w-full max-w-[88rem] flex-1 flex-col">
      <div
        className={
          showSummaryPanel
            ? "grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.72fr)]"
            : "flex min-h-0 flex-1 flex-col"
        }
      >
        <div className="theme-panel relative flex min-h-[34rem] min-w-0 flex-1 flex-col overflow-hidden rounded-[36px] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_60%)]" />

          <header className="relative z-10 border-b px-5 py-4 lg:px-7 lg:py-5" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="theme-copy-soft truncate text-[11px] font-semibold uppercase tracking-[0.22em]">
                  DTIC
                </p>
                <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-text-1 lg:text-2xl">
                  Abrir chamado
                </h2>
                <p className="mt-1 truncate text-sm text-text-2">
                  {session?.submission
                    ? `Chamado aberto para ${requesterName}.`
                    : `Solicitante: ${session?.userContext.name || requesterName}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium ${statusMeta.tone}`}
                  style={{
                    background:
                      session?.status === "submitted"
                        ? "var(--status-solved-bg)"
                        : session?.status === "draft_ready"
                          ? "var(--status-new-bg)"
                          : session?.status === "clarifying"
                            ? "var(--status-active-bg)"
                            : "var(--status-solved-bg)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <StatusIcon size={13} />
                  {statusMeta.label}
                </div>
                <button
                  type="button"
                  onClick={onRestartConversation}
                  className="theme-shell-button inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors"
                  aria-label="Iniciar nova conversa"
                >
                  <X size={13} />
                  Nova conversa
                </button>
              </div>
            </div>
          </header>

          {booting ? (
            <div className="flex flex-1 items-center justify-center px-6">
              <div className="max-w-sm text-center">
                <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-sky-300" />
                <p className="theme-copy-muted mt-4 text-sm leading-7">
                  Abrindo atendimento.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-1 items-center justify-center px-6 py-8">
              <div className="w-full max-w-xl rounded-[30px] border border-red-400/15 bg-red-500/8 p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-1 shrink-0 text-red-300" size={18} />
                  <div>
                    <h3 className="text-lg font-semibold text-text-1">Atendimento indisponivel</h3>
                    <p className="theme-copy-muted mt-2 text-sm leading-7">{error}</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={onRestartConversation}
                        className="theme-button-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors"
                      >
                        Tentar novamente
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="custom-scrollbar relative z-10 flex-1 overflow-y-auto px-5 py-5 lg:px-7">
                {isFreshSession ? (
                  <DticAgentWelcomePanel
                    assistantIntro={normalizeAssistantMessage(assistantIntro)}
                    prompts={STARTER_PROMPTS}
                    sending={sending}
                    onPromptSelect={onPromptSelect}
                    composerSlot={renderComposerPanel({ compact: true })}
                  />
                ) : (
                  <div className="mx-auto max-w-[48rem] space-y-4">
                    {deferredMessages.map((message, index) => (
                      <MessageBubble
                        key={`${message.role}-${index}-${message.content.slice(0, 24)}`}
                        message={message}
                        index={index}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {!isFreshSession ? (
                <div
                  className="relative z-10 border-t px-5 py-4 lg:px-7 lg:py-5"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  {renderComposerPanel()}
                </div>
              ) : null}
            </>
          )}
        </div>

        {showSummaryPanel ? (
          <aside className="theme-floating-panel flex min-h-[34rem] min-w-0 flex-col overflow-hidden rounded-[36px] backdrop-blur-xl">
            <div className="border-b px-5 py-5 lg:px-6" style={{ borderColor: "var(--border-subtle)" }}>
              <p className="theme-copy-soft text-[11px] font-semibold uppercase tracking-[0.22em]">
                Revisao
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-text-1">
                {session?.draft ? "Revise antes de abrir" : "Chamado aberto"}
              </h3>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-5 lg:px-6">
              {session?.draft ? (
                <div className="theme-floating-panel rounded-[30px] px-5 py-4">
                  <div
                    className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={{
                      borderColor: "color-mix(in srgb, var(--accent-primary) 22%, transparent)",
                      background: "var(--accent-primary-subtle)",
                      color: "var(--accent-primary)",
                    }}
                  >
                    <ShieldCheck size={13} />
                    Pronto para revisar
                  </div>

                  <DraftField label="Assunto" value={session.draft.name} />
                  <div className="grid gap-0 md:grid-cols-2 md:gap-4">
                    <DraftField label="Tipo" value={session.draft.typeLabel} />
                    <DraftField label="Urgencia" value={session.draft.urgencyLabel} />
                  </div>
                  <DraftField label="Detalhes" value={session.draft.content} />

                  <div className="mt-5 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={onConfirmDraft}
                      disabled={confirming}
                      className="theme-button-primary inline-flex items-center justify-center gap-2 rounded-[22px] px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {confirming ? <LoaderCircle className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                      {confirming ? "Abrindo chamado" : "Abrir chamado"}
                    </button>
                    <button
                      type="button"
                      onClick={onDiscardDraft}
                      disabled={discarding}
                      className="theme-button-secondary inline-flex items-center justify-center gap-2 rounded-[22px] px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:text-text-3/45"
                    >
                      {discarding ? <LoaderCircle className="animate-spin" size={16} /> : <AlertCircle size={16} />}
                      {discarding ? "Voltando" : "Voltar e ajustar"}
                    </button>
                  </div>
                </div>
              ) : session?.submission ? (
                <div className="theme-floating-panel rounded-[30px] px-5 py-4">
                  <div
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={{
                      borderColor: "color-mix(in srgb, var(--status-solved) 24%, transparent)",
                      background: "var(--status-solved-bg)",
                      color: "var(--status-solved)",
                    }}
                  >
                    <CheckCircle2 size={13} />
                    Aberto
                  </div>
                  <p className="mt-4 text-3xl font-semibold tracking-tight text-text-1">
                    Ticket #{session.submission.ticketId}
                  </p>
                  <div className="mt-5 flex flex-col gap-3">
                    <Link
                      href={`/dtic/ticket/${session.submission.ticketId}`}
                      className="theme-button-primary inline-flex items-center justify-center gap-2 rounded-[22px] px-4 py-3 text-sm font-medium transition-colors"
                    >
                      Ver chamado
                      <ArrowRight size={16} />
                    </Link>
                    <button
                      type="button"
                      onClick={onRestartConversation}
                      className="theme-button-secondary inline-flex items-center justify-center gap-2 rounded-[22px] px-4 py-3 text-sm font-medium transition-colors"
                    >
                      Nova conversa
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
