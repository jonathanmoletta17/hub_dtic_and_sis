import React from "react";

import { formatIsoDateTime } from "@/lib/datetime/iso";
import type { TicketAttachment, TicketTimelineEntry, TimelineEntryType } from "@/lib/api/models/ticket-detail";
import type { TicketDetail } from "@/lib/api/types";
import { TimelineItem } from "./TimelineItem";

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return String(name)
    .split(/[\s.]+/)
    .map((part: string) => part[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string): string {
  return formatIsoDateTime(dateStr) || "-";
}

const TIMELINE_LEGEND: Record<TimelineEntryType, { label: string; color: string }> = {
  followup: { label: "Mensagem", color: "bg-blue-500/40" },
  solution: { label: "Solucao", color: "bg-emerald-500/40" },
  task: { label: "Tarefa", color: "bg-violet-500/40" },
};

export function TicketTimeline({
  ticket,
  timeline,
  requesterName,
  currentUserId,
  technicianUserId,
  chatEndRef,
  isTechOrManager,
  onPreviewAttachment,
  onDownloadAttachment,
}: {
  ticket: TicketDetail;
  timeline: TicketTimelineEntry[];
  requesterName: string;
  currentUserId: number;
  technicianUserId: number | null;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  isTechOrManager: boolean;
  onPreviewAttachment?: (attachment: TicketAttachment) => void;
  onDownloadAttachment?: (attachment: TicketAttachment) => void;
}) {
  const visibleTimeline = isTechOrManager
    ? timeline
    : timeline.filter((entry) => entry.type !== "task" && !entry.isPrivate);
  const visibleTypes = Array.from(new Set(visibleTimeline.map((entry) => entry.type)));
  const showLegend = visibleTypes.length > 1;

  return (
    <div className="flex flex-col overflow-visible lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      <div className="shrink-0 border-b px-4 py-4 lg:px-6" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[16px] font-semibold text-text-1">Historico</h2>
            <span className="theme-meta text-[12px] font-mono">{visibleTimeline.length} registro(s)</span>
          </div>

          {showLegend ? (
            <div className="theme-meta flex flex-wrap items-center gap-3 text-[10px]">
              {visibleTypes.map((type) => (
                <span key={type} className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${TIMELINE_LEGEND[type].color}`} />
                  {TIMELINE_LEGEND[type].label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-4 py-5 lg:flex-1 lg:overflow-y-auto lg:px-6" style={{ scrollbarWidth: "none" }}>
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="flex justify-start gap-2.5">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/15">
              <span className="text-[10px] font-bold text-blue-400">
                {getInitials(requesterName || "Solicitante")}
              </span>
            </div>
            <div className="max-w-[88%] sm:max-w-[75%]">
              <div className="mb-1 flex items-center gap-2">
                <span className="theme-copy-soft text-[13px] font-medium">
                  {requesterName || "Solicitante"}
                </span>
                <span className="theme-meta font-mono text-[11px]">
                  {formatDate(ticket.dateCreated)}
                </span>
              </div>
              <div className="rounded-xl rounded-tl-sm border border-blue-500/[0.10] bg-blue-500/[0.08] px-4 py-3">
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-text-2">
                  {ticket.content || "Sem descricao."}
                </p>
              </div>
            </div>
          </div>

          {visibleTimeline.map((entry) => (
            <TimelineItem
              key={`${entry.type}-${entry.id}`}
              entry={entry}
              currentUserId={currentUserId}
              technicianUserId={technicianUserId}
              onPreviewAttachment={onPreviewAttachment}
              onDownloadAttachment={onDownloadAttachment}
            />
          ))}

          {visibleTimeline.length === 0 && (
            <div className="py-8 text-center">
              <p className="theme-copy-muted text-[13px] italic">
                Nenhum acompanhamento registrado ainda.
              </p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>
    </div>
  );
}
