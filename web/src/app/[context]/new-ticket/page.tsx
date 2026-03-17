"use client";

// ═══════════════════════════════════════════════════════════════════
// Página: Novo Chamado — [context]/new-ticket
// ═══════════════════════════════════════════════════════════════════

import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { FormWizard } from "@/modules/tickets/components/wizard/FormWizard";

const contextTitles: Record<string, string> = {
  "dtic": "Novo Chamado — DTIC",
  "sis": "Novo Chamado — SIS",
  "sis-manutencao": "Novo Chamado — Manutenção",
  "sis-memoria": "Novo Chamado — Conservação",
};

export default function NewTicketPage() {
  const params = useParams();
  const context = params.context as string;
  const title = contextTitles[context] || "Novo Chamado";

  return (
    <ProtectedRoute>
      <div className="new-ticket-page">
        <header className="new-ticket-header">
          <h1 className="new-ticket-title">{title}</h1>
        </header>
        <main className="new-ticket-content">
          <FormWizard />
        </main>

        <style jsx>{`
          .new-ticket-page {
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow-y: auto;
          }

          .new-ticket-header {
            padding: 20px 32px;
            flex-shrink: 0;
          }

          .new-ticket-title {
            font-size: 20px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
            margin: 0;
          }

          .new-ticket-content {
            flex: 1;
            padding: 0 32px 32px;
          }

          @media (max-width: 768px) {
            .new-ticket-header {
              padding: 16px 20px;
            }

            .new-ticket-content {
              padding: 0 16px 20px;
            }
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}
