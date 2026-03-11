import React from "react";
import { TimelineItem } from "./TimelineItem";
import type { TimelineEntry } from "./useTicketDetail";

// Tipos do próprio ticket para a mensagem original (topo)
import type { TicketDetail } from "@/lib/api/types";

function getInitials(name: any): string {
  if (!name) return "?";
  return String(name).split(/[\s.]+/).map((n: string) => n[0]).filter(Boolean).join("").toUpperCase().slice(0, 2);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return dateStr; }
}

export function TicketTimeline({
  ticket,
  timeline,
  requesterName,
  currentUserId,
  technicianUserId,
  chatEndRef,
  isTechOrManager,
}: {
  ticket: TicketDetail;
  timeline: TimelineEntry[];
  requesterName: string;
  currentUserId: number;
  technicianUserId: number | null;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
    isTechOrManager: boolean;
}) {
  const visibleTimeline = isTechOrManager
    ? timeline
    : timeline.filter(entry => entry.type !== "task" && !entry.isPrivate);

  return (
    <div className="flex-grow flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[16px] font-semibold text-text-1">Histórico</h2>
          <span className="text-[12px] font-mono text-text-3/40">{timeline.length} entradas</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-text-3/40">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500/40" /> Mensagem
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500/40" /> Solução
          </span>
          {isTechOrManager && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-500/40" /> Tarefa
            </span>
          )}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto px-6 py-5" style={{ scrollbarWidth: "none" }}>
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Mensagem Inicial do Ticket */}
          <div className="flex gap-2.5 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0 mt-1">
              <span className="text-[10px] font-bold text-blue-400">
                {getInitials(requesterName || "Solicitante")}
              </span>
            </div>
            <div className="max-w-[75%]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-medium text-text-2/80">
                  {requesterName || "Solicitante"}
                </span>
                <span className="text-[11px] text-text-3/30 font-mono">
                  {formatDate(ticket.dateCreated)}
                </span>
              </div>
              <div className="rounded-xl px-4 py-3 bg-blue-500/[0.08] border border-blue-500/[0.10] rounded-tl-sm">
                <p className="text-[14px] text-text-2/90 leading-relaxed whitespace-pre-wrap">
                  {ticket.content || "Sem descrição."}
                </p>
              </div>
            </div>
          </div>

          {visibleTimeline.map((entry) => (
            <TimelineItem
              key={`${entry.type}-${entry.id}`}
              entry={entry}
              requesterName={requesterName}
              currentUserId={currentUserId}
              technicianUserId={technicianUserId}
            />
          ))}

          {visibleTimeline.length === 0 && (
            <div className="text-center py-8">
              <p className="text-[13px] text-text-3/30 italic">Nenhum acompanhamento registrado ainda.</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>
    </div>
  );
}
