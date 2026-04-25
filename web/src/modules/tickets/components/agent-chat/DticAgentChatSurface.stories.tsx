import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type FormEvent } from "react";
import { fn } from "storybook/test";

import {
  DticAgentChatSurface,
  type DticAgentChatSurfaceProps,
} from "@/modules/tickets/components/agent-chat/DticAgentChatSurface";
import type { AgentChatDraft, AgentChatSession } from "@/lib/api/agent-chat-service";

const userContext = {
  name: "Jonathan Moletta",
  requesterId: 1032,
};

const baseDraft: AgentChatDraft = {
  name: "Equipe inteira sem acesso ao sistema de protocolo",
  content:
    "Usuario relata indisponibilidade coletiva no sistema de protocolo. Impacto: equipe inteira sem acesso.",
  urgency: 4,
  urgencyLabel: "Alta",
  type: "incident",
  typeLabel: "TipoIncidente",
  itilcategoriesId: 22,
  requesterId: 1032,
  entityId: null,
  needsClarification: false,
  clarificationPrompt: "",
  metadata: {
    intent_confidence: 0.91,
    category_confidence: 0.88,
    decision_source: "story-fixture",
  },
};

function sessionFixture(overrides: Partial<AgentChatSession> = {}): AgentChatSession {
  return {
    sessionId: "story-session-001",
    source: "hub-operacional-web",
    context: "dtic",
    status: "ready",
    userContext,
    messages: [
      {
        role: "assistant",
        content: "Descreva o problema ou pedido. Se faltar detalhe, eu peco.",
      },
    ],
    draft: null,
    submission: null,
    ...overrides,
  };
}

function StatefulStory(args: DticAgentChatSurfaceProps) {
  const [composer, setComposer] = useState(args.composer);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    args.onSubmitMessage(event);
  }

  return (
    <div className="min-h-screen px-5 py-5 lg:px-8">
      <DticAgentChatSurface
        {...args}
        composer={composer}
        onComposerChange={setComposer}
        onSubmitMessage={handleSubmit}
      />
    </div>
  );
}

const readySession = sessionFixture();

const clarifyingSession = sessionFixture({
  status: "clarifying",
  messages: [
    {
      role: "assistant",
      content: "Escreva o problema, erro ou pedido. Se faltar detalhe, eu peco.",
    },
    {
      role: "user",
      content: "Preciso de acesso.",
    },
    {
      role: "assistant",
      content:
        "Entendi que pode ser uma demanda de acesso. Confirme o sistema e se voce precisa liberar perfil, resetar senha ou investigar erro.",
    },
  ],
});

const draftReadySession = sessionFixture({
  status: "draft_ready",
  messages: [
    {
      role: "assistant",
      content: "Escreva o problema, erro ou pedido. Se faltar detalhe, eu peco.",
    },
    {
      role: "user",
      content: "Equipe inteira sem acesso ao sistema de protocolo.",
    },
    {
      role: "assistant",
      content: "Analise pronta. Montei o chamado para revisao antes do envio.",
    },
  ],
  draft: baseDraft,
});

const submittedSession = sessionFixture({
  status: "submitted",
  messages: [
    {
      role: "assistant",
      content: "Escreva o problema, erro ou pedido. Se faltar detalhe, eu peco.",
    },
    {
      role: "user",
      content: "Equipe inteira sem acesso ao sistema de protocolo.",
    },
    {
      role: "assistant",
      content: "Chamado aberto: #13749.",
    },
  ],
  submission: {
    ticketId: 13749,
    rawResponse: {
      id: 13749,
    },
  },
});

const meta = {
  title: "DTIC/AgentChatSurface",
  component: DticAgentChatSurface,
  tags: ["autodocs", "test"],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    requesterName: "Jonathan Moletta",
    session: readySession,
    composer: "",
    deferredMessages: readySession.messages,
    assistantIntro: readySession.messages[0]?.content ?? "",
    isFreshSession: true,
    showSummaryPanel: false,
    booting: false,
    sending: false,
    confirming: false,
    discarding: false,
    error: null,
    actionError: null,
    onComposerChange: fn(),
    onSubmitMessage: fn(),
    onPromptSelect: fn(),
    onRestartConversation: fn(),
    onConfirmDraft: fn(),
    onDiscardDraft: fn(),
  },
  render: (args) => <StatefulStory {...args} />,
} satisfies Meta<typeof DticAgentChatSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const Booting: Story = {
  args: {
    session: null,
    deferredMessages: [],
    assistantIntro: "",
    isFreshSession: false,
    booting: true,
  },
};

export const Unavailable: Story = {
  args: {
    session: null,
    deferredMessages: [],
    assistantIntro: "",
    isFreshSession: false,
    error: "Nao foi possivel iniciar o atendimento assistido.",
  },
};

export const Sending: Story = {
  args: {
    composer: "Nao consigo entrar no email",
    sending: true,
  },
};

export const Clarifying: Story = {
  args: {
    session: clarifyingSession,
    deferredMessages: clarifyingSession.messages,
    assistantIntro: clarifyingSession.messages[0]?.content ?? "",
    isFreshSession: false,
  },
};

export const DraftReady: Story = {
  args: {
    session: draftReadySession,
    deferredMessages: draftReadySession.messages,
    assistantIntro: draftReadySession.messages[0]?.content ?? "",
    isFreshSession: false,
    showSummaryPanel: true,
  },
};

export const Submitted: Story = {
  args: {
    session: submittedSession,
    deferredMessages: submittedSession.messages,
    assistantIntro: submittedSession.messages[0]?.content ?? "",
    isFreshSession: false,
    showSummaryPanel: true,
  },
};

export const ActionError: Story = {
  args: {
    session: draftReadySession,
    deferredMessages: draftReadySession.messages,
    assistantIntro: draftReadySession.messages[0]?.content ?? "",
    isFreshSession: false,
    showSummaryPanel: true,
    actionError: "Falha ao atualizar a conversa.",
  },
};
