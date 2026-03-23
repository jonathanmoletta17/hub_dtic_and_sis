"use client";

import React, { useMemo } from "react";
import {
  CalendarClock,
  CheckCircle,
  Clock,
  Hourglass,
  MapPin,
  User,
  UserCog,
  X,
} from "lucide-react";

import type {
  KanbanDemand,
  KanbanAvailableResource,
  KanbanAllocatedResource,
} from "../../types/charger";
import {
  formatElapsedSince,
  formatIsoDate,
  formatIsoTime,
  toDateOrNull,
} from "../../lib/datetime/iso";
import {
  decodeHtmlEntities,
  formatCategoryName,
  formatLocation,
} from "../../lib/utils/formatters";

interface Props {
  demands: KanbanDemand[];
  available: KanbanAvailableResource[];
  allocated: KanbanAllocatedResource[];
  onDemandClick?: (demand: KanbanDemand) => void;
  onUnassignCharger?: (ticketId: number, chargerId: number, chargerName: string) => void;
  onAllocatedClick?: (ticketId: number) => void;
}

interface ChargerCardViewModel {
  id: number;
  name: string;
  location?: string;
  offlineReason?: string;
  expectedReturn?: string;
  lastSolvedAt?: string;
  idleMinutes: number;
  isOffline: boolean;
  isWithinSchedule: boolean;
}

interface AssignmentCardViewModel {
  ticketId: number;
  title: string;
  category?: string;
  location?: string;
  requester?: string;
  ticketElapsed?: string;
  chargerId: number;
  chargerName: string;
  assignedAt?: string;
  serviceMinutes?: number;
}

function parseHourMinute(value: string | undefined, fallback: string): [number, number] {
  const source = (value || fallback).trim();
  const [hourRaw, minuteRaw] = source.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    const [fallbackHour, fallbackMinute] = fallback.split(":").map((item) => Number(item));
    return [fallbackHour || 0, fallbackMinute || 0];
  }
  return [hour, minute];
}

function isWithinScheduleNow(resource: KanbanAvailableResource): boolean {
  if (resource.is_offline) return false;
  const now = new Date();
  const [startHour, startMinute] = parseHourMinute(resource.business_start, "08:00");
  const [endHour, endMinute] = parseHourMinute(resource.business_end, "18:00");

  const current = now.getHours() * 60 + now.getMinutes();
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;

  if (start === end) return true;
  if (end > start) return current >= start && current < end;
  return current >= start || current < end;
}

function idleMinutesFromSolvedDate(lastSolvedAt?: string): number {
  const solved = toDateOrNull(lastSolvedAt);
  if (!solved) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, Math.floor((Date.now() - solved.getTime()) / 60000));
}

function formatIdleTime(lastSolvedAt?: string): string {
  return formatElapsedSince(lastSolvedAt) ?? "Pronto para operacao";
}

function toAssignmentCards(source: KanbanAllocatedResource[]): AssignmentCardViewModel[] {
  const cards: AssignmentCardViewModel[] = [];
  for (const ticket of source) {
    for (const charger of ticket.chargers || []) {
      cards.push({
        ticketId: ticket.ticket_id,
        title: ticket.title,
        category: ticket.category,
        location: ticket.location,
        requester: ticket.requester_name,
        ticketElapsed: ticket.time_elapsed,
        chargerId: charger.id,
        chargerName: charger.name,
        assignedAt: charger.assigned_date || ticket.date,
        serviceMinutes: charger.service_time_minutes,
      });
    }
  }
  return cards;
}

function Column({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-900/50 rounded-xl border border-slate-800/50 backdrop-blur-sm shadow-xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
        <h3 className="text-slate-100 font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-slate-300">
          {count}
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 mb-4 custom-scrollbar">
        <div className="flex flex-col space-y-3 pb-4">{children}</div>
      </div>
    </div>
  );
}

export function ChargerKanban({
  demands,
  available,
  allocated,
  onDemandClick,
  onUnassignCharger,
  onAllocatedClick,
}: Props) {
  const chargerCards = useMemo<ChargerCardViewModel[]>(() => {
    return available.map((resource) => {
      const withinSchedule = isWithinScheduleNow(resource);
      return {
        id: resource.id,
        name: resource.name,
        location: resource.location,
        offlineReason: resource.offline_reason,
        expectedReturn: resource.expected_return,
        lastSolvedAt: resource.lastTicket?.solvedate,
        idleMinutes: idleMinutesFromSolvedDate(resource.lastTicket?.solvedate),
        isOffline: !!resource.is_offline,
        isWithinSchedule: withinSchedule,
      };
    });
  }, [available]);

  const livreCards = useMemo(
    () =>
      chargerCards
        .filter((item) => !item.isOffline && item.isWithinSchedule)
        .sort((a, b) => b.idleMinutes - a.idleMinutes),
    [chargerCards]
  );

  const indisponivelCards = useMemo(
    () =>
      chargerCards
        .filter((item) => item.isOffline || !item.isWithinSchedule)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [chargerCards]
  );

  const reservedCards = useMemo(
    () =>
      toAssignmentCards(allocated.filter((ticket) => ticket.status === 3)).sort((a, b) => {
        const aValue = toDateOrNull(a.assignedAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bValue = toDateOrNull(b.assignedAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return aValue - bValue;
      }),
    [allocated]
  );

  const operatingCards = useMemo(
    () =>
      toAssignmentCards(allocated.filter((ticket) => ticket.status !== 3)).sort((a, b) => {
        const aValue = toDateOrNull(a.assignedAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bValue = toDateOrNull(b.assignedAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return aValue - bValue;
      }),
    [allocated]
  );

  const waitingCards = useMemo(
    () =>
      [...demands].sort((a, b) => {
        const aValue = toDateOrNull(a.date_creation || a.date)?.getTime() ?? 0;
        const bValue = toDateOrNull(b.date_creation || b.date)?.getTime() ?? 0;
        return bValue - aValue;
      }),
    [demands]
  );

  return (
    <>
      <Column
        title="Livres"
        icon={<CheckCircle size={18} className="text-emerald-400" />}
        count={livreCards.length}
      >
        {livreCards.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-6">Nenhum carregador livre no momento.</p>
        )}
        {livreCards.map((resource) => (
          <div
            key={resource.id}
            className="bg-slate-800/40 border border-emerald-500/20 rounded-xl p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-100 truncate">{resource.name}</span>
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded uppercase tracking-wider">
                Livre
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
              <MapPin size={12} />
              <span className="truncate">{formatLocation(resource.location || "Local nao informado")}</span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-300 font-semibold">
              Ocioso ha: {formatIdleTime(resource.lastSolvedAt)}
            </div>
          </div>
        ))}

        {indisponivelCards.length > 0 && (
          <>
            <div className="pt-2 border-t border-slate-700/60">
              <p className="text-[10px] uppercase tracking-widest text-orange-300/80 font-bold">
                Fora de disponibilidade
              </p>
            </div>
            {indisponivelCards.map((resource) => {
              const reason = resource.isOffline ? "Offline" : "Fora do expediente";
              return (
                <div
                  key={resource.id}
                  className="bg-slate-800/20 border border-orange-500/20 rounded-xl p-3 opacity-80"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-200 truncate">{resource.name}</span>
                    <span className="text-[10px] font-bold text-orange-200 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded uppercase tracking-wider">
                      {reason}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                    <MapPin size={12} />
                    <span className="truncate">{formatLocation(resource.location || "Local nao informado")}</span>
                  </div>
                  {resource.offlineReason && (
                    <div className="mt-2 text-[11px] text-orange-200/80 truncate">{resource.offlineReason}</div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </Column>

      <Column
        title="Reservados"
        icon={<CalendarClock size={18} className="text-indigo-400" />}
        count={reservedCards.length}
      >
        {reservedCards.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-6">Sem reservas planejadas.</p>
        )}
        {reservedCards.map((card) => (
          <div
            key={`${card.ticketId}-${card.chargerId}`}
            className="bg-slate-800/60 border border-indigo-500/20 rounded-xl p-3 cursor-pointer hover:border-indigo-400/40 transition-colors"
            onClick={() => onAllocatedClick?.(card.ticketId)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                  #{card.ticketId}
                </div>
                <div className="font-semibold text-slate-100 truncate" title={decodeHtmlEntities(card.title)}>
                  {decodeHtmlEntities(card.title)}
                </div>
              </div>
              <span className="text-[10px] font-bold text-indigo-200 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded uppercase tracking-wider">
                {formatIsoTime(card.assignedAt) || "--:--"}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 truncate">
              {card.category ? formatCategoryName(card.category) : "Sem categoria"}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-indigo-200">
              <UserCog size={12} />
              <span className="truncate">{card.chargerName}</span>
            </div>
          </div>
        ))}
      </Column>

      <Column
        title="Em Operacao"
        icon={<Clock size={18} className="text-blue-400" />}
        count={operatingCards.length}
      >
        {operatingCards.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-6">Nenhuma operacao ativa.</p>
        )}
        {operatingCards.map((card) => (
          <div
            key={`${card.ticketId}-${card.chargerId}`}
            className="bg-slate-800/60 border border-blue-500/20 rounded-xl p-3 cursor-pointer hover:border-blue-400/40 transition-colors"
            onClick={() => onAllocatedClick?.(card.ticketId)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                  #{card.ticketId}
                </div>
                <div className="font-semibold text-slate-100 truncate" title={decodeHtmlEntities(card.title)}>
                  {decodeHtmlEntities(card.title)}
                </div>
              </div>
              <span className="text-[10px] font-bold text-blue-200 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded uppercase tracking-wider">
                {card.ticketElapsed || "--"}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 truncate">
              {card.category ? formatCategoryName(card.category) : "Sem categoria"}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-blue-200 min-w-0">
                <User size={12} />
                <span className="truncate">{card.chargerName}</span>
              </div>
              {onUnassignCharger && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onUnassignCharger(card.ticketId, card.chargerId, card.chargerName);
                  }}
                  className="w-5 h-5 rounded-full border border-red-500/40 text-red-300 hover:bg-red-500/20 flex items-center justify-center"
                  title="Desvincular carregador"
                >
                  <X size={10} />
                </button>
              )}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 truncate">
              {card.location ? formatLocation(card.location) : "Local nao informado"}
            </div>
          </div>
        ))}
      </Column>

      <Column
        title="Aguardando Atribuicao"
        icon={<Hourglass size={18} className="text-orange-400" />}
        count={waitingCards.length}
      >
        {waitingCards.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-6">Fila vazia.</p>
        )}
        {waitingCards.map((demand) => (
          <div
            key={demand.id}
            onClick={() => onDemandClick?.(demand)}
            className="bg-slate-800/60 border border-orange-500/20 rounded-xl p-3 cursor-pointer hover:border-orange-400/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                  #{demand.id}
                </div>
                <div className="font-semibold text-slate-100 truncate" title={decodeHtmlEntities(demand.title || demand.name)}>
                  {decodeHtmlEntities(demand.title || demand.name)}
                </div>
              </div>
              <span className="text-[10px] font-bold text-orange-200 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded uppercase tracking-wider">
                {demand.time_elapsed || "--"}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 truncate">
              {demand.category ? formatCategoryName(demand.category) : "Sem categoria"}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 truncate">
              {demand.location ? formatLocation(demand.location) : "Local nao informado"}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              {formatIsoDate(demand.date_creation || demand.date)} {formatIsoTime(demand.date_creation || demand.date)}
            </div>
          </div>
        ))}
      </Column>
    </>
  );
}
