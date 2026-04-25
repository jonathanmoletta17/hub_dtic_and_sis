"use client";

import type { ReactNode } from "react";
import { Bot, Sparkles } from "lucide-react";

const DEFAULT_PROMPTS = [
  "Sem acesso a sistema",
  "Erro no email",
  "Notebook com problema",
  "Solicitar equipamento",
] as const;

interface DticAgentWelcomePanelProps {
  assistantIntro: string;
  prompts?: readonly string[];
  sending?: boolean;
  onPromptSelect?: (prompt: string) => void;
  composerSlot?: ReactNode;
}

function DefaultComposerStub() {
  return (
    <div className="theme-floating-panel rounded-[30px] p-3.5">
      <textarea
        rows={3}
        disabled
        placeholder="Escreva o problema, erro ou pedido."
        className="min-h-[6rem] w-full resize-none bg-transparent px-3 py-2 text-sm leading-7 text-text-1 outline-none placeholder:text-text-3"
      />
      <div
        className="mt-2 flex flex-col gap-3 border-t px-2 pt-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <p className="theme-copy-soft text-xs leading-6">Enter envia.</p>
        <button
          type="button"
          disabled
          className="theme-button-primary inline-flex items-center justify-center gap-2 rounded-[22px] px-5 py-3 text-sm font-medium opacity-45"
        >
          Enviar mensagem
        </button>
      </div>
    </div>
  );
}

export function DticAgentWelcomePanel({
  assistantIntro,
  prompts = DEFAULT_PROMPTS,
  sending = false,
  onPromptSelect,
  composerSlot,
}: DticAgentWelcomePanelProps) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[48rem] flex-col justify-center gap-4 py-6 lg:py-8">
      <div
        className="theme-copy-soft inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{
          borderColor: "var(--border-subtle)",
          background: "color-mix(in srgb, var(--bg-surface-alt) 90%, transparent)",
        }}
      >
        <Sparkles size={13} />
        Atendimento DTIC
      </div>

      <div className="space-y-3">
        <h3 className="text-3xl font-semibold tracking-tight text-text-1 lg:text-[2.2rem]">
          Escreva o problema, erro ou pedido.
        </h3>
        <p className="max-w-2xl text-sm leading-7 text-text-2">
          Eu organizo o relato, peco so o contexto que faltar e deixo a revisao pronta antes do envio.
        </p>
      </div>

      <div className="theme-floating-panel rounded-[30px] px-5 py-4">
        <div className="theme-copy-soft mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
          <Bot size={13} />
          Atendimento
        </div>
        <p className="text-sm leading-7 text-text-1/95">{assistantIntro}</p>
      </div>

      <div>
        <p className="theme-copy-soft mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
          Exemplos rapidos
        </p>
        <div className="flex flex-wrap gap-2.5">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onPromptSelect?.(prompt)}
              disabled={sending}
              className="theme-shell-button inline-flex items-center rounded-full px-3.5 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-1">{composerSlot ?? <DefaultComposerStub />}</div>
    </div>
  );
}
