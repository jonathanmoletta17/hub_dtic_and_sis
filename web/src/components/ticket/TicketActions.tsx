import React from "react";
import { CheckCircle2, Loader2, Pause, Play, RotateCcw, User, UserPlus } from "lucide-react";

import type { TicketDetail } from "@/lib/api/types";

function ActionButton({
  label,
  icon,
  variant,
  loading,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  variant: "primary" | "ghost";
  loading: boolean;
  onClick: () => void;
}) {
  const base = variant === "primary" ? "theme-button-primary" : "theme-button-secondary";

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-medium transition-colors disabled:opacity-40 ${base}`}
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
    <div
      className="shrink-0 space-y-2 border-t px-4 py-4 lg:px-5"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      {isNew ? (
        <ActionButton
          label="Assumir Ticket"
          icon={<User size={14} />}
          variant="primary"
          loading={actionLoading === "assume"}
          onClick={onAssumeTicket}
        />
      ) : null}

      {isInProgress && canActOnTicket ? (
        <>
          <ActionButton
            label="Adicionar Solucao"
            icon={<CheckCircle2 size={14} />}
            variant="primary"
            loading={actionLoading === "solution"}
            onClick={onShowSolutionModal}
          />
          <ActionButton
            label="Delegar Ticket"
            icon={<UserPlus size={14} />}
            variant="ghost"
            loading={actionLoading === "transfer"}
            onClick={onShowTransferModal}
          />
          <ActionButton
            label="Colocar em Pendente"
            icon={<Pause size={14} />}
            variant="ghost"
            loading={actionLoading === "pending"}
            onClick={onSetPending}
          />
          <ActionButton
            label="Devolver a Fila"
            icon={<RotateCcw size={14} />}
            variant="ghost"
            loading={actionLoading === "return"}
            onClick={onReturnToQueue}
          />
        </>
      ) : null}

      {(isInProgress || isPending) && !canActOnTicket ? (
        <p className="py-2 text-center text-[12px]" style={{ color: "var(--status-active)" }}>
          Apenas o relator ou a equipe tecnica do chamado pode edita-lo.
        </p>
      ) : null}

      {isPending && canActOnTicket ? (
        <>
          <ActionButton
            label="Retomar Atendimento"
            icon={<Play size={14} />}
            variant="primary"
            loading={actionLoading === "resume"}
            onClick={onResume}
          />
          <ActionButton
            label="Adicionar Solucao"
            icon={<CheckCircle2 size={14} />}
            variant="ghost"
            loading={actionLoading === "solution"}
            onClick={onShowSolutionModal}
          />
        </>
      ) : null}

      {isResolved ? (
        <>
          <p className="py-2 text-center text-[12px]" style={{ color: "var(--status-solved)" }}>
            Chamado solucionado, aguardando aprovacao.
          </p>
          <ActionButton
            label="Reabrir Chamado"
            icon={<RotateCcw size={14} />}
            variant="ghost"
            loading={actionLoading === "reopen"}
            onClick={onReopenTicket}
          />
        </>
      ) : null}

      {isClosed ? <p className="theme-copy-soft py-2 text-center text-[12px]">Chamado fechado</p> : null}
    </div>
  );
}
