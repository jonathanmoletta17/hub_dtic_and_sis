"use client";

import { useParams } from "next/navigation";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { getTicketEntryMode } from "@/lib/ticket-entry";
import { DticAgentChatEntry } from "@/modules/tickets/components/agent-chat/DticAgentChatEntry";
import { FormWizard } from "@/modules/tickets/components/wizard/FormWizard";

const contextWizardLabels: Record<string, string> = {
  dtic: "DTIC",
  sis: "SIS",
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
      <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-4 lg:px-8 lg:py-5">
        <main className="mx-auto flex min-h-0 w-full max-w-[88rem] flex-1">
          {entryMode === "agents" ? <DticAgentChatEntry /> : <FormWizard contextLabel={wizardContextLabel} />}
        </main>
      </div>
    </ProtectedRoute>
  );
}
