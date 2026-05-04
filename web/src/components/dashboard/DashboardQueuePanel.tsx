"use client";

import type { TicketSummary } from "@/lib/api/types";

import { KanbanBoard } from "@/components/ui/kanban-board";

interface DashboardQueuePanelProps {
  context: string;
  tickets: TicketSummary[];
  loading?: boolean;
  title: string;
  hint?: string | null;
  countLabel?: string | null;
  emptyMessage?: string;
  countOverrides?: Partial<Record<"new" | "in-progress" | "pending" | "solved", number>>;
  onTicketOpen?: (id: number) => void;
}

export function DashboardQueuePanel({
  context,
  tickets,
  loading,
  title,
  hint,
  countLabel,
  emptyMessage,
  countOverrides,
  onTicketOpen,
}: DashboardQueuePanelProps) {
  return (
    <div className="flex-grow xl:min-h-0">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-text-1">{title}</h2>
          {hint ? <p className="theme-copy-soft mt-1 text-[12px]">{hint}</p> : null}
        </div>
        {countLabel ? (
          <span className="theme-shell-button rounded-full px-3 py-1 text-[12px] font-medium">
            {countLabel}
          </span>
        ) : null}
      </div>
      <KanbanBoard
        context={context}
        tickets={tickets}
        loading={loading}
        emptyMessage={emptyMessage}
        countOverrides={countOverrides}
        onTicketOpen={onTicketOpen}
      />
    </div>
  );
}
