import React from "react";
import { User, CheckCircle2, Pause, RotateCcw, Play, Loader2, UserPlus } from "lucide-react";
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
  canActOnTicket,
  actionLoading,
  onAssumeTicket,
  onShowSolutionModal,
  onSetPending,
  onReturnToQueue,
  onResume,
  onReopenTicket,
  onShowTransferModal,
}: {
  ticket: TicketDetail;
    canActOnTicket: boolean;
  actionLoading: string | null;
  onAssumeTicket: () => void;
  onShowSolutionModal: () => void;
  onSetPending: () => void;
  onReturnToQueue: () => void;
  onResume: () => void;
    onReopenTicket: () => void;
    onShowTransferModal: () => void;
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

      {isInProgress && canActOnTicket && (
        <>
          <ActionButton label="Adicionar Solução" icon={<CheckCircle2 size={14} />} variant="primary" loading={actionLoading === "solution"} onClick={onShowSolutionModal} />
          <ActionButton label="Delegar Ticket" icon={<UserPlus size={14} />} variant="ghost" loading={actionLoading === "transfer"} onClick={onShowTransferModal} />
          <ActionButton label="Colocar em Pendente" icon={<Pause size={14} />} variant="ghost" loading={actionLoading === "pending"} onClick={onSetPending} />
          <ActionButton label="Devolver à Fila" icon={<RotateCcw size={14} />} variant="ghost" loading={actionLoading === "return"} onClick={onReturnToQueue} />
        </>
      )}

      {(isInProgress || isPending) && !canActOnTicket && (
        <p className="text-[12px] text-amber-400/60 text-center py-2">
          Apenas relator ou equipe técnica do chamado pode editá-lo.
        </p>
      )}

      {isPending && canActOnTicket && (
        <>
          <ActionButton label="Retomar Atendimento" icon={<Play size={14} />} variant="primary" loading={actionLoading === "resume"} onClick={onResume} />
          <ActionButton label="Adicionar Solução" icon={<CheckCircle2 size={14} />} variant="ghost" loading={actionLoading === "solution"} onClick={onShowSolutionModal} />
        </>
      )}

      {isResolved && (
        <>
          <p className="text-[12px] text-emerald-400/60 text-center py-2">
            ✓ Ticket solucionado — aguardando aprovação
          </p>
          <ActionButton label="Reabrir Chamado" icon={<RotateCcw size={14} />} variant="ghost" loading={actionLoading === "reopen"} onClick={onReopenTicket} />
        </>
      )}

      {isClosed && (
        <p className="text-[12px] text-text-3/30 text-center py-2">Ticket fechado</p>
      )}
    </div>
  );
}
