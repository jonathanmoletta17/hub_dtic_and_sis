"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Inbox,
  UserCheck,
} from "lucide-react";

import type { TicketSummary } from "@/lib/api/types";
import { KanbanColumn } from "./kanban-column";
import { TicketCard } from "./ticket-card";

const statusColorMap: Record<string, "info" | "warning" | "danger" | "success" | "neutral"> = {
  Novo: "info",
  "Em Atendimento": "warning",
  Planejado: "warning",
  Pendente: "danger",
  Solucionado: "success",
  Fechado: "neutral",
};

interface KanbanBoardProps {
  context: string;
  tickets: TicketSummary[];
  loading?: boolean;
  emptyMessage?: string;
  countOverrides?: Partial<Record<"new" | "in-progress" | "pending" | "solved", number>>;
  onTicketOpen?: (id: number) => void;
}

function getColumnPanelClass(key: string) {
  if (key === "solved") {
    return "min-w-[220px] xl:min-w-0 xl:basis-0 xl:flex-[0.78]";
  }

  if (key === "in-progress") {
    return "min-w-[300px] xl:min-w-0 xl:basis-0 xl:flex-[1.18]";
  }

  if (key === "new") {
    return "min-w-[280px] xl:min-w-0 xl:basis-0 xl:flex-[1.02]";
  }

  return "min-w-[280px] xl:min-w-0 xl:basis-0 xl:flex-[1]";
}

export function KanbanBoard({
  context,
  tickets,
  loading,
  emptyMessage = "Nenhum chamado encontrado para este contexto.",
  countOverrides,
  onTicketOpen,
}: KanbanBoardProps) {
  const router = useRouter();

  const openTicket = (id: number) => {
    if (onTicketOpen) {
      onTicketOpen(id);
      return;
    }

    router.push(`/${context}/ticket/${id}`);
  };

  const columns = [
    {
      key: "new",
      title: "Novos",
      count: countOverrides?.["new"] ?? tickets.filter((ticket) => ticket.statusId === 1).length,
      icon: <Inbox size={14} />,
      tickets: tickets.filter((ticket) => ticket.statusId === 1),
      emptyLabel: "Nenhum chamado novo.",
    },
    {
      key: "in-progress",
      title: "Em atendimento",
      count:
        countOverrides?.["in-progress"] ??
        tickets.filter((ticket) => [2, 3].includes(ticket.statusId)).length,
      icon: <UserCheck size={14} />,
      tickets: tickets.filter((ticket) => [2, 3].includes(ticket.statusId)),
      emptyLabel: "Nenhum chamado em atendimento.",
    },
    {
      key: "pending",
      title: "Pendentes",
      count: countOverrides?.["pending"] ?? tickets.filter((ticket) => ticket.statusId === 4).length,
      icon: <AlertTriangle size={14} />,
      tickets: tickets.filter((ticket) => ticket.statusId === 4),
      emptyLabel: "Nenhum chamado pendente.",
    },
    {
      key: "solved",
      title: "Resolvidos",
      count: countOverrides?.["solved"] ?? tickets.filter((ticket) => [5, 6].includes(ticket.statusId)).length,
      icon: <CheckCircle2 size={14} />,
      tickets: tickets.filter((ticket) => [5, 6].includes(ticket.statusId)),
      emptyLabel: "Nenhum chamado resolvido.",
      compactCards: true,
    },
  ];

  if (loading) {
    const loadingWidths = [
      getColumnPanelClass("new"),
      getColumnPanelClass("in-progress"),
      getColumnPanelClass("pending"),
      getColumnPanelClass("solved"),
    ];

    return (
      <div className="flex h-full min-h-0 gap-4 overflow-x-auto pb-2 xl:overflow-x-visible" style={{ scrollbarWidth: "thin" }}>
        {[1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={`theme-panel min-h-0 rounded-xl p-4 ${loadingWidths[index - 1]}`}
          >
            <div className="mb-4 h-4 w-28 rounded" style={{ background: "var(--bg-surface-hover)" }} />
            <div className="space-y-3">
              {[1, 2].map((item) => (
                <div key={item} className="h-28 rounded-lg" style={{ background: "var(--bg-surface-hover)" }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="theme-copy-muted flex h-full flex-col items-center justify-center gap-3">
        <AlertTriangle size={32} className="theme-copy-soft" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 gap-4 overflow-x-auto pb-2 pr-1 xl:overflow-x-visible" style={{ scrollbarWidth: "thin" }}>
      {columns.map((column) => (
        <KanbanColumn
          key={column.key}
          title={column.title}
          count={column.count}
          icon={column.icon}
          emptyLabel={column.emptyLabel}
          panelClassName={getColumnPanelClass(column.key)}
        >
          {column.tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              id={`GLPI-${ticket.id}`}
              title={ticket.title}
              description={ticket.content}
              status={ticket.status}
              statusColor={statusColorMap[ticket.status] || "neutral"}
              category={ticket.category}
              compact={Boolean(column.compactCards)}
              onClick={() => openTicket(ticket.id)}
            />
          ))}
        </KanbanColumn>
      ))}
    </div>
  );
}
