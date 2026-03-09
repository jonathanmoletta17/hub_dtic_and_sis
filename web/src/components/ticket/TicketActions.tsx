import React from "react";
import { User, CheckCircle2, Pause, RotateCcw, Play, Loader2 } from "lucide-react";
import type { TicketDetail } from "@/lib/api/types";

function ActionButton({ label, icon, variant, loading, onClick }: {
  label: string; icon: React.ReactNode; variant: "primary" | "ghost"; loading: boolean; onClick: () => void;
}) {
  const base = variant === "primary"
    ? "bg-blue-500/90 hover:bg-blue-500 text-white"
    : "text-text-3/60 hover:text-text-2 hover:bg-white/[0.04]";
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full py-2.5 rounded-lg text-[13px] font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-40 ${base}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}

export function TicketActions({
  ticket,
  actionLoading,
  onAssumeTicket,
  onShowSolutionModal,
  onSetPending,
  onReturnToQueue,
  onResume,
}: {
  ticket: TicketDetail;
  actionLoading: string | null;
  onAssumeTicket: () => void;
  onShowSolutionModal: () => void;
  onSetPending: () => void;
  onReturnToQueue: () => void;
  onResume: () => void;
}) {
  const isNew = ticket.statusId === 1;
  const isInProgress = [2, 3].includes(ticket.statusId);
  const isPending = ticket.statusId === 4;
  const isResolved = ticket.statusId === 5;
  const isClosed = ticket.statusId === 6;

  return (
    <div className="px-5 py-4 border-t border-white/[0.06] space-y-2 shrink-0">
      {isNew && (
        <ActionButton label="Assumir Ticket" icon={<User size={14} />} variant="primary" loading={actionLoading === "assume"} onClick={onAssumeTicket} />
      )}

      {isInProgress && (
        <>
          <ActionButton label="Adicionar Solução" icon={<CheckCircle2 size={14} />} variant="primary" loading={actionLoading === "solution"} onClick={onShowSolutionModal} />
          <ActionButton label="Colocar em Pendente" icon={<Pause size={14} />} variant="ghost" loading={actionLoading === "pending"} onClick={onSetPending} />
          <ActionButton label="Devolver à Fila" icon={<RotateCcw size={14} />} variant="ghost" loading={actionLoading === "return"} onClick={onReturnToQueue} />
        </>
      )}

      {isPending && (
        <>
          <ActionButton label="Retomar Atendimento" icon={<Play size={14} />} variant="primary" loading={actionLoading === "resume"} onClick={onResume} />
          <ActionButton label="Adicionar Solução" icon={<CheckCircle2 size={14} />} variant="ghost" loading={actionLoading === "solution"} onClick={onShowSolutionModal} />
        </>
      )}

      {isResolved && (
        <p className="text-[12px] text-emerald-400/60 text-center py-2">
          ✓ Ticket solucionado — aguardando aprovação
        </p>
      )}

      {isClosed && (
        <p className="text-[12px] text-text-3/30 text-center py-2">Ticket fechado</p>
      )}
    </div>
  );
}
