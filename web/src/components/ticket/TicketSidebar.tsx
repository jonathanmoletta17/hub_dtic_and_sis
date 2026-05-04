import React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Tag,
  User,
  Users,
  Wrench,
} from "lucide-react";

import { CategoryBadge } from "@/components/ui/category-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatIsoDateTime } from "@/lib/datetime/iso";
import type { TicketActor, TicketAuditLog, TicketGroupActor } from "@/lib/api/models/ticket-detail";
import type { TicketDetail } from "@/lib/api/types";
import { TicketActions } from "./TicketActions";

const typeLabels: Record<number, string> = {
  1: "Incidente",
  2: "Requisicao",
};

const actorRoleLabels: Record<TicketActor["role"], string> = {
  requester: "Solicitante",
  technician: "Tecnico",
  observer: "Observador",
  unknown: "Usuario",
};

const groupRoleLabels: Record<TicketGroupActor["role"], string> = {
  requester: "Grupo solicitante",
  assigned: "Grupo atribuido",
  observer: "Grupo observador",
  unknown: "Grupo",
};

const auditItemLabels: Record<string, string> = {
  ITILFollowup: "Acompanhamento",
  ITILSolution: "Solucao",
  TicketTask: "Tarefa",
  Document: "Documento",
  Document_Item: "Anexo",
  Ticket_User: "Ator",
  Group_Ticket: "Grupo",
  User: "Usuario",
  Group: "Grupo",
  PluginGenericobjectCarregador: "Carregador",
  Ticket: "Ticket",
};

const auditActionLabels: Record<string, string> = {
  add: "adicionado",
  update: "atualizado",
  delete: "removido",
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

function formatAuditLabel(log: TicketAuditLog): string {
  const itemLabel = log.linkedItemtype ? auditItemLabels[log.linkedItemtype] || "Evento" : "Evento";
  const actionLabel = log.linkedAction ? auditActionLabels[log.linkedAction] || "registrado" : "registrado";
  return `${itemLabel} ${actionLabel}`;
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

function CompactList({
  items,
  getKey,
  getLabel,
  getValue,
}: {
  items: unknown[];
  getKey: (item: unknown) => string;
  getLabel: (item: unknown) => string;
  getValue: (item: unknown) => string;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <div
      className="rounded-xl border px-3 py-3"
      style={{
        borderColor: "var(--border-subtle)",
        background: "color-mix(in srgb, var(--bg-surface-alt) 82%, transparent)",
      }}
    >
      <div className="space-y-2">
        {items.map((item) => (
          <div key={getKey(item)} className="flex min-w-0 items-start justify-between gap-3">
            <span className="theme-copy-soft shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em]">
              {getLabel(item)}
            </span>
            <span className="min-w-0 break-words text-right text-[12px] leading-relaxed text-text-1">
              {decodeHtmlEntities(getValue(item))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LifecycleItem {
  key: string;
  label: string;
  date?: string;
  userName?: string;
}

function buildLifecycleItems(ticket: TicketDetail, logs: TicketAuditLog[]): LifecycleItem[] {
  const baseItems: LifecycleItem[] = [
    {
      key: "ticket-created",
      label: "Ticket criado",
      date: ticket.dateCreated,
    },
    {
      key: "ticket-updated",
      label: "Ultima atualizacao",
      date: ticket.dateModified,
    },
  ];

  if (ticket.solveDate) {
    baseItems.push({
      key: "ticket-solved",
      label: "Ticket solucionado",
      date: ticket.solveDate,
    });
  }

  if (ticket.closeDate) {
    baseItems.push({
      key: "ticket-closed",
      label: "Ticket fechado",
      date: ticket.closeDate,
    });
  }

  const auditItems = logs.map((log) => ({
    key: `audit-${log.id}`,
    label: formatAuditLabel(log),
    date: log.date,
    userName: log.userName,
  }));

  return [...baseItems, ...auditItems]
    .sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime())
    .slice(0, 8);
}

function LifecycleList({ ticket, logs }: { ticket: TicketDetail; logs: TicketAuditLog[] }) {
  const items = buildLifecycleItems(ticket, logs);

  return (
    <div
      className="rounded-xl border px-3 py-3"
      style={{
        borderColor: "var(--border-subtle)",
        background: "color-mix(in srgb, var(--bg-surface-alt) 82%, transparent)",
      }}
    >
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.key}
            className="border-b pb-2 last:border-b-0 last:pb-0"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-[12px] font-medium leading-snug text-text-1">{item.label}</span>
              {item.date ? <span className="theme-meta shrink-0 text-[10px]">{formatDate(item.date)}</span> : null}
            </div>
            {item.userName ? <p className="theme-copy-soft mt-1 text-[11px]">{item.userName}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TicketSidebar({
  ticket,
  requesterName,
  technicianName,
  groupName,
  actors,
  groups,
  auditLogs,
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
  actors: TicketActor[];
  groups: TicketGroupActor[];
  auditLogs: TicketAuditLog[];
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

  const visibleActors = actors.filter((actor) => actor.name);
  const visibleGroups = groups.filter((group) => group.name);

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
          {visibleActors.length ? (
            <CompactList
              items={visibleActors}
              getKey={(item) => {
                const actor = item as TicketActor;
                return `${actor.role}-${actor.userId}`;
              }}
              getLabel={(item) => actorRoleLabels[(item as TicketActor).role]}
              getValue={(item) => (item as TicketActor).name}
            />
          ) : (
            <>
              {requesterName ? <MetaItem icon={<User size={14} />} label="Solicitante" value={requesterName} /> : null}
              {technicianName ? <MetaItem icon={<Wrench size={14} />} label="Tecnico" value={technicianName} /> : null}
            </>
          )}
          {visibleGroups.length ? (
            <CompactList
              items={visibleGroups}
              getKey={(item) => {
                const group = item as TicketGroupActor;
                return `${group.role}-${group.groupId}`;
              }}
              getLabel={(item) => groupRoleLabels[(item as TicketGroupActor).role]}
              getValue={(item) => (item as TicketGroupActor).name}
            />
          ) : groupName ? (
            <MetaItem icon={<Users size={14} />} label="Grupo atribuido" value={decodeHtmlEntities(groupName)} />
          ) : null}
        </MetaSection>

        <MetaSection title="Contexto">
          <MetaItem icon={<Tag size={14} />} label="Categoria" value={decodeHtmlEntities(ticket.category)} />
          {ticket.location ? (
            <MetaItem
              icon={<MapPin size={14} />}
              label="Localizacao"
              value={decodeHtmlEntities(ticket.location)}
            />
          ) : null}
        </MetaSection>

        <MetaSection title="Ciclo de vida">
          <LifecycleList ticket={ticket} logs={auditLogs} />
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
