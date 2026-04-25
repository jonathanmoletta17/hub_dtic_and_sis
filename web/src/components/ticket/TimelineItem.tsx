import React from "react";
import { CheckCircle2, Clock, ListTodo, Lock } from "lucide-react";

import { formatIsoDateTime } from "@/lib/datetime/iso";
import type { TicketTimelineEntry } from "@/lib/api/models/ticket-detail";

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

export function TimelineItem({
  entry,
  currentUserId,
  technicianUserId,
}: {
  entry: TicketTimelineEntry;
  currentUserId: number;
  technicianUserId: number | null;
}) {
  const isMe = entry.userId === currentUserId;
  const isTechObj = entry.userId === technicianUserId;
  const isTech = isMe || isTechObj;

  if (entry.type === "solution") {
    const statusLabel =
      entry.solutionStatus === 3 ? "Aceita" : entry.solutionStatus === 4 ? "Recusada" : "Pendente";

    return (
      <div className="flex justify-end gap-2.5">
        <div className="max-w-[75%] text-right">
          <div className="mb-1 flex items-center justify-end gap-2">
            <span
              className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--status-solved)" }}
            >
              <CheckCircle2 size={10} />
              Solucao | {statusLabel}
            </span>
            <span className="theme-meta text-[11px] font-mono">{formatDate(entry.date)}</span>
            <span className="theme-copy-soft text-[13px] font-medium">{entry.userName}</span>
          </div>
          <div
            className="rounded-xl rounded-tr-sm px-4 py-3"
            style={{
              background: "var(--status-solved-bg)",
              border: "1px solid color-mix(in srgb, var(--status-solved) 28%, transparent)",
            }}
          >
            <p className="whitespace-pre-wrap text-left text-[14px] leading-relaxed text-text-1">{entry.content}</p>
          </div>
        </div>

        <div
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--status-solved-bg)" }}
        >
          <CheckCircle2 size={14} style={{ color: "var(--status-solved)" }} />
        </div>
      </div>
    );
  }

  if (entry.type === "task") {
    const minutes = entry.actionTime ? Math.round(entry.actionTime / 60) : 0;

    return (
      <div className="mx-auto max-w-3xl">
        <div
          className="rounded-xl px-4 py-3"
          style={{
            background: "var(--status-pending-bg)",
            border: "1px solid color-mix(in srgb, var(--status-pending) 20%, transparent)",
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span
              className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--status-pending)" }}
            >
              <ListTodo size={10} />
              Tarefa interna
              {entry.isPrivate ? <Lock size={9} className="ml-1" style={{ color: "var(--status-active)" }} /> : null}
            </span>
            <div className="flex items-center gap-2">
              {minutes > 0 ? (
                <span className="theme-meta flex items-center gap-1 text-[10px] font-mono">
                  <Clock size={9} />
                  {minutes}min
                </span>
              ) : null}
              <span className="theme-meta text-[11px] font-mono">{formatDate(entry.date)}</span>
            </div>
          </div>

          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-text-2">{entry.content}</p>
          <div className="theme-copy-soft mt-2 text-[11px]">{entry.userName}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2.5 ${isTech ? "justify-end" : "justify-start"}`}>
      {!isTech ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/15">
          <span className="text-[10px] font-bold text-blue-500">{getInitials(entry.userName)}</span>
        </div>
      ) : null}

      <div className={`max-w-[75%] ${isTech ? "text-right" : ""}`}>
        <div className="mb-1 flex items-center gap-2">
          {isTech ? (
            <>
              <span className="theme-meta ml-auto text-[11px] font-mono">{formatDate(entry.date)}</span>
              <span className="theme-copy-muted text-[13px] font-medium">{entry.userName}</span>
            </>
          ) : (
            <>
              <span className="theme-copy-muted text-[13px] font-medium">{entry.userName}</span>
              <span className="theme-meta text-[11px] font-mono">{formatDate(entry.date)}</span>
            </>
          )}
          {entry.isPrivate ? <Lock size={10} className="text-amber-500/70" /> : null}
        </div>

        <div
          className={`rounded-xl px-4 py-3 ${isTech ? "rounded-tr-sm" : "rounded-tl-sm"}`}
          style={
            isTech
              ? {
                  background: "var(--bg-surface-alt)",
                  border: "1px solid var(--border-subtle)",
                }
              : {
                  background: "color-mix(in srgb, var(--accent-primary) 14%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--accent-primary) 28%, transparent)",
                }
          }
        >
          <p className="theme-copy-muted whitespace-pre-wrap text-left text-[14px] leading-relaxed">
            {entry.content}
          </p>
        </div>
      </div>

      {isTech ? (
        <div className="theme-panel-muted mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <span className="theme-meta text-[10px] font-bold">{getInitials(entry.userName)}</span>
        </div>
      ) : null}
    </div>
  );
}
