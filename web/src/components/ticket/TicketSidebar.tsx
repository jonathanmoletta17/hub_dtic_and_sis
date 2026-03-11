import React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Wrench,
  Calendar,
  Tag,
  AlertTriangle,
  Shield,
  MapPin,
  FileText,
  Users,
  Clock,
} from "lucide-react";

import { TicketActions } from "./TicketActions";
import type { TicketDetail } from "@/lib/api/types";

const statusColors: Record<string, string> = {
  Novo: "text-blue-400/80",
  "Em Atendimento": "text-amber-400/80",
  Planejado: "text-amber-400/80",
  Pendente: "text-red-400/80",
  Solucionado: "text-emerald-400/80",
  Fechado: "text-text-3/40",
};

const priorityLabels: Record<number, string> = {
  1: "Muito Baixa", 2: "Baixa", 3: "Média", 4: "Alta", 5: "Muito Alta",
};
const typeLabels: Record<number, string> = { 1: "Incidente", 2: "Requisição" };

function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return dateStr; }
}

function MetaItem({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-text-3/40 mt-0.5">{icon}</div>
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-3/40 block mb-0.5">{label}</span>
        <span className={`text-[14px] text-text-2 ${valueClass || ""}`}>{value}</span>
      </div>
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
    onShowTransferModal: () => void;
}) {
  const router = useRouter();

  if (!ticket) return null;

  return (
    <aside className="w-[340px] border-r border-white/[0.06] bg-surface-1/80 backdrop-blur-sm flex flex-col shrink-0">
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-text-3/60 hover:text-text-2 transition-colors text-[13px] mb-3 group">
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Voltar
        </button>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-mono text-text-3/60">#GLPI-{ticket.id}</span>
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${statusColors[ticket.status] || "text-text-3"}`}>{ticket.status}</span>
        </div>
      </div>

      <div className="px-5 py-4 border-b border-white/[0.06]">
        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.06] text-text-3/60 inline-block mb-2">
          {typeLabels[ticket.type] || "Ticket"}
        </span>
        <h1 className="text-[17px] font-semibold text-text-1 leading-snug mb-2">{ticket.title}</h1>
        <p className="text-[13px] text-text-2/50 leading-relaxed line-clamp-4">{ticket.content}</p>
      </div>

      <div className="flex-grow px-5 py-4 space-y-4 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {requesterName && <MetaItem icon={<User size={14} />} label="Solicitante" value={requesterName} />}
        {technicianName && <MetaItem icon={<Wrench size={14} />} label="Técnico" value={technicianName} />}
        {groupName && <MetaItem icon={<Users size={14} />} label="Grupo Atribuído" value={decodeHtmlEntities(groupName)} />}
        <MetaItem icon={<Shield size={14} />} label="Prioridade" value={priorityLabels[ticket.priority] || `Nível ${ticket.priority}`} valueClass={ticket.priority >= 5 ? "text-red-400/80" : ticket.priority >= 4 ? "text-amber-400/70" : undefined} />
        <MetaItem icon={<AlertTriangle size={14} />} label="Urgência" value={ticket.urgency} />
        <MetaItem icon={<Tag size={14} />} label="Categoria" value={decodeHtmlEntities(ticket.category)} />
        {ticket.location && <MetaItem icon={<MapPin size={14} />} label="Localização" value={decodeHtmlEntities(ticket.location)} />}
        <MetaItem icon={<Calendar size={14} />} label="Criado em" value={formatDate(ticket.dateCreated)} />
        <MetaItem icon={<Clock size={14} />} label="Última Atualização" value={formatDate(ticket.dateModified)} />
        {ticket.solveDate && <MetaItem icon={<FileText size={14} />} label="Solucionado em" value={formatDate(ticket.solveDate)} />}
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
        <div className="px-5 py-4 border-t border-white/[0.06] space-y-2 shrink-0">
          <p className="text-[12px] text-emerald-400/60 text-center pb-2">
            ✓ Ticket solucionado. Se o problema persistir, você pode reabrir.
          </p>
          <button
            onClick={onReopenTicket}
            disabled={actionLoading === "reopen"}
            className="w-full py-2.5 rounded-lg text-[13px] font-medium transition-colors flex items-center justify-center gap-2 bg-white/[0.04] text-text-3/60 hover:text-text-2 hover:bg-white/[0.08] disabled:opacity-40"
          >
            Reabrir Chamado
          </button>
        </div>
      ) : null}
    </aside>
  );
}
