"use client";

import { useParams } from "next/navigation";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { getTicketEntryMode } from "@/lib/ticket-entry";
import { DticAgentChatEntry } from "@/modules/tickets/components/agent-chat/DticAgentChatEntry";
import { FormWizard } from "@/modules/tickets/components/wizard/FormWizard";

const contextWizardLabels: Record<string, string> = {
  dtic: "DTIC",
  sis: "Conservacao",
  "sis-conservacao": "Conservacao",
  "sis-manutencao": "Manutencao",
  "sis-memoria": "Conservacao",
};

export default function NewTicketPage() {
  const params = useParams();
  const context = params.context as string;
  const wizardContextLabel = contextWizardLabels[context] ?? context.toUpperCase();
  const entryMode = getTicketEntryMode(context);

  return (
    <ProtectedRoute>
      <div className="flex min-h-full flex-col px-4 py-4 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:px-8 lg:py-5">
        <main className="mx-auto flex w-full max-w-[88rem] flex-1 lg:min-h-0">
          {entryMode === "agents" ? <DticAgentChatEntry /> : <FormWizard contextLabel={wizardContextLabel} />}
        </main>
      </div>
    </ProtectedRoute>
  );
}
