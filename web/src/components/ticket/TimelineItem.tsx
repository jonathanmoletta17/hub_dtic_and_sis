import React from "react";
import { CheckCircle2, Clock, Lock, ListTodo } from "lucide-react";
import type { TimelineEntry } from "./useTicketDetail";

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

export function TimelineItem({ 
  entry, 
  requesterName, 
  currentUserId, 
  technicianUserId 
}: { 
  entry: TimelineEntry; 
  requesterName: string; 
  currentUserId: number; 
  technicianUserId: number | null;
}) {
  const isMe = entry.userId === currentUserId;
  const isTechObj = entry.userId === technicianUserId;
  // Na UI, 'isTech' indica que o balão flutua para a direita
  const isTech = isMe || isTechObj;

  if (entry.type === "solution") {
    const statusLabel = entry.solutionStatus === 3 ? "Aceita" : entry.solutionStatus === 4 ? "Recusada" : "Pendente";
    return (
      <div className="flex gap-2.5 justify-end">
        <div className="max-w-[75%] text-right">
          <div className="flex items-center gap-2 mb-1 justify-end">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/60 flex items-center gap-1">
              <CheckCircle2 size={10} /> Solução — {statusLabel}
            </span>
            <span className="text-[11px] text-text-3/30 font-mono">{formatDate(entry.date)}</span>
            <span className="text-[13px] font-medium text-text-2/80">{entry.userName}</span>
          </div>
          <div className="rounded-xl px-4 py-3 bg-emerald-500/[0.08] border border-emerald-500/[0.15] rounded-tr-sm">
            <p className="text-[14px] text-emerald-200/90 leading-relaxed whitespace-pre-wrap text-left">{entry.content}</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 mt-1">
          <CheckCircle2 size={14} className="text-emerald-400" />
        </div>
      </div>
    );
  }

  if (entry.type === "task") {
    const minutes = entry.actionTime ? Math.round(entry.actionTime / 60) : 0;
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-xl px-4 py-3 bg-violet-500/[0.05] border border-violet-500/[0.10]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-400/60 flex items-center gap-1">
              <ListTodo size={10} /> Tarefa Interna
              {entry.isPrivate && <Lock size={9} className="text-amber-400/60 ml-1" />}
            </span>
            <div className="flex items-center gap-2">
              {minutes > 0 && <span className="text-[10px] font-mono text-text-3/40 flex items-center gap-1"><Clock size={9} /> {minutes}min</span>}
              <span className="text-[11px] text-text-3/30 font-mono">{formatDate(entry.date)}</span>
            </div>
          </div>
          <p className="text-[13px] text-text-2/70 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
          <div className="mt-2 text-[11px] text-text-3/40">{entry.userName}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2.5 ${isTech ? "justify-end" : "justify-start"}`}>
      {!isTech && (
        <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0 mt-1">
          <span className="text-[10px] font-bold text-blue-400">{getInitials(entry.userName)}</span>
        </div>
      )}
      <div className={`max-w-[75%] ${isTech ? "text-right" : ""}`}>
        <div className="flex items-center gap-2 mb-1">
          {isTech ? (
            <>
              <span className="text-[11px] text-text-3/30 font-mono ml-auto">{formatDate(entry.date)}</span>
              <span className="text-[13px] font-medium text-text-2/80">{entry.userName}</span>
            </>
          ) : (
            <>
              <span className="text-[13px] font-medium text-text-2/80">{entry.userName}</span>
              <span className="text-[11px] text-text-3/30 font-mono">{formatDate(entry.date)}</span>
            </>
          )}
          {entry.isPrivate && <Lock size={10} className="text-amber-400/60" />}
        </div>
        <div className={`rounded-xl px-4 py-3 ${isTech ? "bg-surface-2 border border-white/[0.06] rounded-tr-sm" : "bg-blue-500/[0.08] border border-blue-500/[0.10] rounded-tl-sm"}`}>
          <p className="text-[14px] text-text-2/90 leading-relaxed whitespace-pre-wrap text-left">{entry.content}</p>
        </div>
      </div>
      {isTech && (
        <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0 mt-1">
          <span className="text-[10px] font-bold text-text-3/60">{getInitials(entry.userName)}</span>
        </div>
      )}
    </div>
  );
}
