"use client";

import React from "react";
import {
  Zap,
  Clock,
  Hourglass,
  UserCheck,
  HardHat,
  Car,
  User,
  X,
} from "lucide-react";
// SSoT: tempo calculado no backend via time_elapsed
import type {
  KanbanDemand,
  KanbanAvailableResource,
  KanbanAllocatedResource,
} from "../../types/charger";
import {
  formatElapsedSince,
  formatIsoTime,
  toDateOrNull,
} from "../../lib/datetime/iso";
import { formatLocation, formatCategoryName, decodeHtmlEntities } from "../../lib/utils/formatters";

interface Props {
  demands: KanbanDemand[];
  available: KanbanAvailableResource[];
  allocated: KanbanAllocatedResource[];
  onDemandClick?: (demand: KanbanDemand) => void;
  onUnassignCharger?: (ticketId: number, chargerId: number, chargerName: string) => void;
  onAllocatedClick?: (ticketId: number) => void;
}

export function ChargerKanban({ demands, available, allocated, onDemandClick, onUnassignCharger, onAllocatedClick }: Props) {
  const formatIdleTime = (value: string | null | undefined) => {
    const elapsed = formatElapsedSince(value);
    return elapsed ? `Ocioso ha: ${elapsed}` : "Pronto para nova atribuicao";
  };

  const formatDemandCreatedAt = (value: string | null | undefined) => {
    const time = formatIsoTime(value);
    const date = toDateOrNull(value)?.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });

    if (!time || !date) {
      return "";
    }

    return `Criado as ${time} (${date})`;
  };

  const sorted = [...available].sort((a, b) => {
    const isOffA = a.is_offline;
    const isOffB = b.is_offline;
    if (isOffA && !isOffB) return 1;
    if (!isOffA && isOffB) return -1;
    
    // Se ambos online: ordenar por tempo ocioso (solvedate mais antigo primeiro)
    const dateA = toDateOrNull(a.lastTicket?.solvedate)?.getTime() ?? 0;
    const dateB = toDateOrNull(b.lastTicket?.solvedate)?.getTime() ?? 0;
    
    if (dateA !== dateB) return dateA - dateB;
    
    return a.name.localeCompare(b.name);
  });
  const activeCount = available.filter((r) => !r.is_offline).length;
  const offlineCount = available.filter((r) => r.is_offline).length;

  return (
    <>
      {/* ─── Coluna 1: Disponíveis ─── */}
      <div className="flex flex-col h-full min-h-0 bg-slate-900/50 rounded-xl border border-slate-800/50 backdrop-blur-sm shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
          <h3 className="text-emerald-500 font-semibold flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            Disponíveis
          </h3>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-500/20">
              {activeCount} Livres
            </span>
            {offlineCount > 0 && (
              <span className="bg-red-500/10 text-red-400 text-xs font-bold px-2.5 py-1 rounded-full border border-red-500/20">
                {offlineCount} Indisponível
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 mb-4 custom-scrollbar">
          <div className="flex flex-col space-y-3 pb-4">
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center mt-10">
                <UserCheck size={40} className="text-slate-700 mb-4" />
                <h3 className="text-white font-bold text-lg">Nenhum disponível</h3>
                <p className="text-slate-400 text-sm mt-2">
                  Todos os carregadores estão em atendimento ou inativos.
                </p>
              </div>
            ) : (
              sorted.map((res, idx) => {
                const isOff = res.is_offline;
                const showSep = isOff && idx > 0 && !sorted[idx - 1].is_offline;
                return (
                  <React.Fragment key={res.id}>
                    {showSep && (
                      <div className="flex items-center gap-2 pt-2 pb-1">
                        <div className="flex-1 h-px bg-red-500/20" />
                        <span className="text-[10px] uppercase font-bold text-red-400/60 tracking-wider">
                          Indisponíveis
                        </span>
                        <div className="flex-1 h-px bg-red-500/20" />
                      </div>
                    )}
                    <div
                      className={`p-3 rounded-xl border shadow-sm relative overflow-hidden group transition-colors cursor-pointer ${
                        isOff
                          ? "bg-slate-800/20 border-red-500/15 opacity-50 hover:opacity-70"
                          : "bg-slate-800/40 border-emerald-500/20 hover:bg-slate-800/70"
                      }`}
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isOff ? "bg-red-500/40" : "bg-emerald-500"}`} />
                      <div className="flex items-center gap-3 pl-2">
                        <div className={`w-10 h-10 shrink-0 rounded-full border flex justify-center items-center ${isOff ? "bg-red-500/10 border-red-500/20" : "bg-emerald-500/10 border-emerald-500/30"}`}>
                          <span className={`font-bold text-sm ${isOff ? "text-red-400/60" : "text-emerald-400"}`}>
                            {res.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-2">
                            <span className={`font-bold text-[15px] truncate ${isOff ? "text-slate-400" : "text-slate-100"}`}>
                              {res.name}
                            </span>
                            {isOff ? (
                              <span className="shrink-0 text-[10px] font-bold text-red-400 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                                Indisponível
                              </span>
                            ) : null}
                          </div>
                          {isOff && res.offline_reason && (
                            <span className="text-[10px] text-red-400/60 mt-0.5 truncate">
                              {res.offline_reason}
                            </span>
                          )}
                          {!isOff && (
                            <>
                              {res.lastTicket?.solvedate ? (
                                  <div className="flex flex-col gap-0.5 mt-1">
                                    <div className="flex justify-between items-center w-full">
                                      <span className="text-[10px] text-slate-400 truncate">
                                        📍 {res.lastTicket.location || 'Local não informado'}
                                      </span>
                                      <span className="flex items-center gap-1 bg-emerald-500/10 text-[10px] text-emerald-400 font-black tracking-widest uppercase px-1.5 py-0.5 rounded border border-emerald-500/20 shadow-sm ml-2 shrink-0">
                                        <Clock size={10} className="text-emerald-500" />
                                        {(() => {
                                          return formatIdleTime(res.lastTicket.solvedate);
                                        })()}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 truncate">
                                    #{res.lastTicket.id} {decodeHtmlEntities(res.lastTicket.title)}
                                    </span>
                                  </div>
                              ) : (
                                <span className="text-xs text-slate-500 mt-1 truncate">
                                  Pronto para nova atribuição
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ─── Coluna 2: Em Atendimento ─── */}
      <div className="flex flex-col h-full min-h-0 bg-slate-900/50 rounded-xl border border-slate-800/50 backdrop-blur-sm shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
          <h3 className="text-blue-500 font-semibold flex items-center gap-2">
            <HardHat size={18} className="text-blue-500" />
            Em Atendimento
          </h3>
          <span className="bg-blue-500/10 text-blue-400 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-500/20">
            {allocated.reduce((acc, r) => acc + (r.chargers?.length || 0), 0)} Em campo
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 mb-4 custom-scrollbar">
          <div className="flex flex-col space-y-3 pb-4">
            {allocated.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center mt-10">
                <Car size={40} className="text-slate-700 mb-4" />
                <h3 className="text-white font-bold text-lg">Nenhum em andamento</h3>
                <p className="text-slate-400 text-sm mt-2">
                  Não há carregadores prestando serviço no momento.
                </p>
              </div>
            ) : (
              allocated.map((tg) => (
                <div
                  key={tg.ticket_id}
                  className="bg-slate-800/60 p-3 rounded-xl border border-blue-500/30 shadow-lg relative overflow-hidden group hover:border-blue-500/60 transition-colors cursor-pointer flex flex-col"
                  onClick={() => onAllocatedClick?.(tg.ticket_id)}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600" />
                  {/* Linha 1: ID, Categoria, Location, Requester & SLA */}
                  <div className="flex justify-between items-start gap-2 mb-2 pl-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 flex-1">
                      <span className="text-slate-500 font-bold tracking-wider text-[11px] uppercase shrink-0">
                        #{tg.ticket_id}
                      </span>
                      {tg.category && (
                        <span className="text-blue-400 font-bold text-[10px] uppercase tracking-wider shrink-0 bg-blue-500/10 px-1.5 py-0.5 rounded">
                          {formatCategoryName(tg.category)}
                        </span>
                      )}
                      {tg.location && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 truncate max-w-[140px]" title={tg.location}>
                          <span className="text-slate-700 font-black px-0.5">·</span>
                          <span className="truncate">{formatLocation(tg.location)}</span>
                        </span>
                      )}
                      {tg.requester_name && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 truncate max-w-[120px]" title={tg.requester_name}>
                          <span className="text-slate-700 font-black px-0.5">·</span>
                          <User size={8} className="text-slate-500 shrink-0" />
                          <span className="truncate">{tg.requester_name}</span>
                        </span>
                      )}
                    </div>
                    {tg.time_elapsed && (
                      <div className="flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 shadow-sm shadow-blue-500/10 shrink-0 mt-0.5">
                        <Clock size={10} className="text-blue-400" />
                        <span className="text-[10px] font-black text-blue-300 uppercase tracking-tighter">
                          {tg.time_elapsed}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Linha 2: Título do chamado com destaque */}
                  <div className="pl-2 mb-2 flex-1 min-w-0">
                    <span className="font-bold text-slate-100 text-[14px] leading-snug truncate uppercase tracking-wider block" title={decodeHtmlEntities(tg.title)}>
                      {decodeHtmlEntities(tg.title)}
                    </span>
                  </div>
                  {/* Chargers Row */}
                  <div 
                    className="pl-2 pt-2 border-t border-slate-700/50 flex flex-nowrap items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1.5"
                    onWheel={(e) => {
                      if (e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
                        e.currentTarget.scrollLeft += e.deltaY;
                        // Removido e.preventDefault() devido ao erro the passivo. O scroll natural do container com flex-nowrap ocorrerá.
                      }
                    }}
                  >
                    {tg.chargers?.map((ch) => (
                      <div key={ch.id} className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 rounded-full pl-2 pr-1.5 py-1 shrink-0 group/chip hover:border-blue-500/40 hover:bg-blue-950/40 transition-colors">
                        <div className="w-4 h-4 rounded-full bg-blue-500/20 flex justify-center items-center">
                          <User size={8} className="text-blue-400 shrink-0" />
                        </div>
                        <span className="text-xs text-slate-300 font-medium whitespace-nowrap">
                          {ch.name}
                        </span>
                        {ch.service_time_minutes !== undefined && (
                          <span className="text-[9px] text-slate-500 font-bold whitespace-nowrap ml-0.5">
                            {Math.floor(ch.service_time_minutes / 60)}h {ch.service_time_minutes % 60}m
                          </span>
                        )}
                        {onUnassignCharger && (
                          <div className="w-0 overflow-hidden opacity-0 group-hover/chip:w-5 group-hover/chip:opacity-100 group-hover/chip:ml-0.5 transition-all duration-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUnassignCharger(tg.ticket_id, ch.id, ch.name);
                              }}
                              className="w-5 h-5 rounded-full hover:bg-red-500/20 flex items-center justify-center transition-colors border border-transparent hover:border-red-500/50 shrink-0"
                              title="Desvincular Carregador"
                            >
                              <X size={10} className="text-red-400" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── Coluna 3: Demandas Pendentes ─── */}
      <div className="flex flex-col h-full min-h-0 bg-slate-900/50 rounded-xl border border-slate-800/50 backdrop-blur-sm shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
          <h3 className="text-orange-500 font-semibold flex items-center gap-2">
            <Zap size={18} className="text-orange-500 fill-orange-500/20" />
            Aguardando Atribuição
          </h3>
          <span className="bg-orange-500/10 text-orange-400 text-xs font-bold px-2.5 py-1 rounded-full border border-orange-500/20 animate-pulse">
            {demands.length} Demandas
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 mb-4 custom-scrollbar">
          <div className="flex flex-col space-y-3 pb-4">
            {demands.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center mt-10">
                <Hourglass size={40} className="text-slate-700 mb-4" />
                <h3 className="text-white font-bold text-lg">Sem Demandas</h3>
                <p className="text-slate-400 text-sm mt-2">
                  A fila de espera está vazia.
                </p>
              </div>
            ) : (
              [...demands].sort((a, b) => b.id - a.id).map((d) => (
                <div
                  key={d.id}
                  onClick={() => onDemandClick?.(d)}
                  className="bg-slate-800/60 p-3 rounded-xl border border-orange-500/30 shadow-lg relative overflow-hidden group hover:border-orange-500/60 transition-colors cursor-pointer flex flex-col"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-400 to-orange-600" />
                  {/* Linha 1: ID, Categoria, Location, Requester & SLA */}
                  <div className="flex justify-between items-start gap-2 mb-2 pl-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 flex-1">
                      <span className="text-slate-500 font-bold tracking-wider text-[11px] uppercase shrink-0">
                        #{d.id}
                      </span>
                      {d.category && (
                        <span className="text-orange-400 font-bold text-[10px] uppercase tracking-wider shrink-0 bg-orange-500/10 px-1.5 py-0.5 rounded">
                          {formatCategoryName(d.category)}
                        </span>
                      )}
                      {d.location && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 truncate max-w-[140px]" title={d.location}>
                          <span className="text-slate-700 font-black px-0.5">·</span>
                          <span className="truncate">{formatLocation(d.location)}</span>
                        </span>
                      )}
                    </div>
                    {d.time_elapsed && (
                      <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 shadow-sm shadow-orange-500/10 shrink-0 mt-0.5">
                        <Clock size={10} className="text-orange-400" />
                        <span className="text-[10px] font-black text-orange-300 uppercase tracking-tighter">
                          {d.time_elapsed}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Linha 2: Título do chamado com destaque */}
                  <div className="pl-2 mb-1 flex-1 min-w-0">
                    <span className="font-bold text-slate-100 text-[14px] leading-snug truncate uppercase tracking-wider block" title={decodeHtmlEntities(d.title || d.name)}>
                      {decodeHtmlEntities(d.title || d.name)}
                    </span>
                  </div>
                  {/* Linha 3: Data de Criação e Solicitante */}
                  {(d.date_creation || d.requester || d.requester_name) && (
                    <div className="pl-2 flex justify-between items-center mt-1 border-t border-slate-700/50 pt-1.5">
                      <div className="flex items-center gap-1">
                        {d.date_creation && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            {formatDemandCreatedAt(d.date_creation)}
                          </span>
                        )}
                      </div>
                      {(d.requester || d.requester_name) && (
                        <span className="flex items-center text-[10px] text-slate-400 font-medium max-w-[130px] truncate justify-end" title={d.requester || d.requester_name}>
                          <User size={10} className="inline mr-1 text-slate-500 shrink-0" />
                          <span className="truncate">{d.requester || d.requester_name}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
