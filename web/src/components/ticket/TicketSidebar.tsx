import React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  MapPin,
  Shield,
  Tag,
  User,
  Users,
  Wrench,
} from "lucide-react";

import { CategoryBadge } from "@/components/ui/category-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatIsoDateTime } from "@/lib/datetime/iso";
import type { TicketDetail } from "@/lib/api/types";
import { TicketActions } from "./TicketActions";

const priorityLabels: Record<number, string> = {
  1: "Muito baixa",
  2: "Baixa",
  3: "Media",
  4: "Alta",
  5: "Muito alta",
};

const typeLabels: Record<number, string> = {
  1: "Incidente",
  2: "Requisicao",
};

function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function formatDate(dateStr: string): string {
  return formatIsoDateTime(dateStr) || "-";
}

function MetaSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <h2 className="theme-copy-soft text-[10px] font-semibold uppercase tracking-[0.14em]">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function MetaItem({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div
      className="rounded-xl border px-3 py-3"
      style={{
        borderColor: "var(--border-subtle)",
        background: "color-mix(in srgb, var(--bg-surface-alt) 82%, transparent)",
      }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="theme-copy-soft shrink-0">{icon}</span>
        <span className="theme-copy-soft text-[10px] font-semibold uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>
      <div className={`break-words text-[13px] leading-relaxed text-text-1 ${valueClass || ""}`}>{value}</div>
    </div>
  );
}

export function TicketSidebar({
  ticket,
  requesterName,
  technicianName,
  groupName,
  isTechOrManager,
  canActOnTicket,
  actionLoading,
  onAssumeTicket,
  onShowSolutionModal,
  onSetPending,
  onReturnToQueue,
  onResume,
  onReopenTicket,
  onApproveSolution,
  onRejectSolution,
  onShowTransferModal,
}: {
  ticket: TicketDetail;
  requesterName: string;
  technicianName: string;
  groupName: string;
  isTechOrManager: boolean;
  canActOnTicket: boolean;
  actionLoading: string | null;
  onAssumeTicket: () => void;
  onShowSolutionModal: () => void;
  onSetPending: () => void;
  onReturnToQueue: () => void;
  onResume: () => void;
  onReopenTicket: () => void;
  onApproveSolution: () => void;
  onRejectSolution: () => void;
  onShowTransferModal: () => void;
}) {
  const router = useRouter();

  if (!ticket) return null;

  return (
    <aside
      className="w-full shrink-0 border-b backdrop-blur-sm lg:flex lg:w-[360px] lg:flex-col lg:border-b-0 lg:border-r"
      style={{
        borderColor: "var(--border-subtle)",
        background: "color-mix(in srgb, var(--bg-surface) 92%, transparent)",
      }}
    >
      <div className="border-b px-4 py-4 lg:px-5" style={{ borderColor: "var(--border-subtle)" }}>
        <button
          onClick={() => router.back()}
          className="theme-copy-soft group mb-3 flex items-center gap-1.5 text-[13px] transition-colors hover:text-text-1"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          Voltar
        </button>

        <div className="flex items-center justify-between gap-3">
          <span className="theme-copy-soft text-[12px] font-mono">#GLPI-{ticket.id}</span>
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      <div className="border-b px-4 py-4 lg:px-5" style={{ borderColor: "var(--border-subtle)" }}>
        <CategoryBadge className="mb-2 inline-flex px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
          {typeLabels[ticket.type] || "Ticket"}
        </CategoryBadge>
        <h1 className="mb-2 text-[17px] font-semibold leading-snug text-text-1">{ticket.title}</h1>
        <p className="line-clamp-4 text-[13px] leading-relaxed text-text-2">{ticket.content}</p>
      </div>

      <div
        className="space-y-4 px-4 py-4 lg:flex-grow lg:overflow-y-auto lg:px-5"
        style={{ scrollbarWidth: "none" }}
      >
        <MetaSection title="Atendimento">
          {requesterName ? <MetaItem icon={<User size={14} />} label="Solicitante" value={requesterName} /> : null}
          {technicianName ? <MetaItem icon={<Wrench size={14} />} label="Tecnico" value={technicianName} /> : null}
          {groupName ? (
            <MetaItem
              icon={<Users size={14} />}
              label="Grupo atribuido"
              value={decodeHtmlEntities(groupName)}
            />
          ) : null}
        </MetaSection>

        <MetaSection title="Classificacao">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <MetaItem
              icon={<Shield size={14} />}
              label="Prioridade"
              value={priorityLabels[ticket.priority] || `Nivel ${ticket.priority}`}
              valueClass={ticket.priority >= 4 ? "text-[var(--status-active)]" : undefined}
            />
            <MetaItem icon={<AlertTriangle size={14} />} label="Urgencia" value={ticket.urgency} />
          </div>
          <MetaItem icon={<Tag size={14} />} label="Categoria" value={decodeHtmlEntities(ticket.category)} />
          {ticket.location ? (
            <MetaItem
              icon={<MapPin size={14} />}
              label="Localizacao"
              value={decodeHtmlEntities(ticket.location)}
            />
          ) : null}
        </MetaSection>

        <MetaSection title="Registro">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <MetaItem icon={<Calendar size={14} />} label="Criado em" value={formatDate(ticket.dateCreated)} />
            <MetaItem
              icon={<Clock size={14} />}
              label="Ultima atualizacao"
              value={formatDate(ticket.dateModified)}
            />
          </div>
          {ticket.solveDate ? (
            <MetaItem
              icon={<FileText size={14} />}
              label="Solucionado em"
              value={formatDate(ticket.solveDate)}
            />
          ) : null}
        </MetaSection>
      </div>

      {isTechOrManager ? (
        <TicketActions
          ticket={ticket}
          canActOnTicket={canActOnTicket}
          actionLoading={actionLoading}
          onAssumeTicket={onAssumeTicket}
          onShowSolutionModal={onShowSolutionModal}
          onSetPending={onSetPending}
          onReturnToQueue={onReturnToQueue}
          onResume={onResume}
          onReopenTicket={onReopenTicket}
          onShowTransferModal={onShowTransferModal}
        />
      ) : ticket.statusId === 5 ? (
        <div
          className="shrink-0 space-y-2 border-t px-5 py-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <p className="pb-2 text-center text-[12px]" style={{ color: "var(--status-solved)" }}>
            Ticket solucionado. Valide a solucao para fechar ou recuse para reabrir.
          </p>
          <button
            onClick={() => onApproveSolution()}
            disabled={actionLoading === "approve-solution"}
            className="theme-button-primary flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-medium transition-colors disabled:opacity-40"
          >
            Aprovar solucao e fechar
          </button>
          <button
            onClick={() => onRejectSolution()}
            disabled={actionLoading === "reject-solution"}
            className="theme-button-secondary flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-medium transition-colors disabled:opacity-40"
          >
            Recusar solucao
          </button>
        </div>
      ) : null}
    </aside>
  );
}
