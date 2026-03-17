"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Inbox, UserCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { KanbanColumn } from "./kanban-column";
import { TicketCard } from "./ticket-card";
import type { TicketSummary } from "@/lib/api/types";

// Mapeamento status → cor visual
const statusColorMap: Record<string, "info" | "warning" | "danger" | "success" | "neutral"> = {
  "Novo": "info",
  "Em Atendimento": "warning",
  "Planejado": "warning",
  "Pendente": "danger",
  "Solucionado": "success",
  "Fechado": "neutral",
};

interface KanbanBoardProps {
  context: string;
  tickets: TicketSummary[];
  loading?: boolean;
}

export function KanbanBoard({ context, tickets, loading }: KanbanBoardProps) {
  const router = useRouter();

  const openTicket = (id: number) => {
    router.push(`/${context}/ticket/${id}`);
  };

  // Separar tickets por coluna
  const newTickets = tickets.filter((t) => t.statusId === 1);
  const inProgress = tickets.filter((t) => [2, 3].includes(t.statusId));
  const pending = tickets.filter((t) => t.statusId === 4);
  const solved = tickets.filter((t) => [5, 6].includes(t.statusId));

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 h-full min-h-0">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface-2/50 border border-white/[0.04] rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-white/[0.06] rounded w-24 mb-4" />
            <div className="space-y-3">
              {[1, 2].map((j) => (
                <div key={j} className="h-28 bg-white/[0.04] rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-3/50 gap-3">
        <AlertTriangle size={32} className="text-text-3/30" />
        <p className="text-sm">Nenhum chamado encontrado para este contexto.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 h-full min-h-0">
      <KanbanColumn title="Novos" count={newTickets.length} icon={<Inbox size={14} />}>
        {newTickets.map((t) => (
          <TicketCard
            key={t.id}
            id={`GLPI-${t.id}`}
            title={t.title}
            description={t.content}
            status={t.status}
            statusColor={statusColorMap[t.status] || "neutral"}
            category={t.category}
            onClick={() => openTicket(t.id)}
          />
        ))}
      </KanbanColumn>

      <KanbanColumn title="Em Atendimento" count={inProgress.length} icon={<UserCheck size={14} />}>
        {inProgress.map((t) => (
          <TicketCard
            key={t.id}
            id={`GLPI-${t.id}`}
            title={t.title}
            description={t.content}
            status={t.status}
            statusColor={statusColorMap[t.status] || "warning"}
            category={t.category}
            onClick={() => openTicket(t.id)}
          />
        ))}
      </KanbanColumn>

      <KanbanColumn title="Pendentes" count={pending.length} icon={<AlertTriangle size={14} />}>
        {pending.map((t) => (
          <TicketCard
            key={t.id}
            id={`GLPI-${t.id}`}
            title={t.title}
            description={t.content}
            status={t.status}
            statusColor={statusColorMap[t.status] || "danger"}
            category={t.category}
            onClick={() => openTicket(t.id)}
          />
        ))}
      </KanbanColumn>

      <KanbanColumn title="Resolvidos" count={solved.length} icon={<CheckCircle2 size={14} />}>
        {solved.map((t) => (
          <TicketCard
            key={t.id}
            id={`GLPI-${t.id}`}
            title={t.title}
            description={t.content}
            status={t.status}
            statusColor={statusColorMap[t.status] || "success"}
            category={t.category}
            onClick={() => openTicket(t.id)}
          />
        ))}
      </KanbanColumn>
    </div>
  );
}
