"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  User,
  Tag,
  MapPin,
  Calendar,
  Building2,
  UserPlus,
} from "lucide-react";
import type { TicketDetailResponse } from "../../types/charger";
import {
  getTicketDetail,
  assignMultipleChargersToTicket,
  unassignChargerFromTicket,
} from "../../lib/api/chargerService";
import { formatElapsedSince, formatIsoDateTime } from "../../lib/datetime/iso";
import { formatCategoryName } from "../../lib/utils/formatters";

interface TicketDetailModalProps {
  ticketId: number;
  context: string;
  onClose: () => void;
  onMutate: () => void;
  canAssign?: boolean;
}

const stripHtml = (html: string): string => {
  let decoded = html.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  decoded = decoded
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"');
  return decoded
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const formatIdleTime = (value: string | null | undefined): string =>
  formatElapsedSince(value) ?? "Pronto para operacao";

const parseHourMinute = (value: string | undefined, fallback: string): [number, number] => {
  const source = (value || fallback).trim();
  const [hourRaw, minuteRaw] = source.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    const [fallbackHour, fallbackMinute] = fallback.split(":").map((item) => Number(item));
    return [fallbackHour || 0, fallbackMinute || 0];
  }
  return [hour, minute];
};

const isWithinScheduleNow = (businessStart?: string, businessEnd?: string): boolean => {
  const now = new Date();
  const [startHour, startMinute] = parseHourMinute(businessStart, "08:00");
  const [endHour, endMinute] = parseHourMinute(businessEnd, "18:00");
  const current = now.getHours() * 60 + now.getMinutes();
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  if (start === end) return true;
  if (end > start) return current >= start && current < end;
  return current >= start || current < end;
};

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticketId,
  context,
  onClose,
  onMutate,
  canAssign = true,
}) => {
  const [data, setData] = useState<TicketDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChargers, setSelectedChargers] = useState<number[]>([]);
  const [assigning, setAssigning] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTicketDetail(context, ticketId);
      setData(res);
    } catch (error) {
      console.error("Error fetching ticket detail:", error);
    } finally {
      setLoading(false);
    }
  }, [context, ticketId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const availableForAssignment = useMemo(
    () =>
      (data?.available_chargers || []).filter((charger) => {
        const withinSchedule =
          charger.is_within_schedule ??
          isWithinScheduleNow(charger.business_start, charger.business_end);
        return !charger.is_offline && withinSchedule;
      }),
    [data?.available_chargers]
  );

  const unavailableForAssignment = useMemo(
    () =>
      (data?.available_chargers || []).filter((charger) => {
        const withinSchedule =
          charger.is_within_schedule ??
          isWithinScheduleNow(charger.business_start, charger.business_end);
        return charger.is_offline || !withinSchedule;
      }),
    [data?.available_chargers]
  );

  const handleUnassign = async (chargerId: number) => {
    if (!canAssign) return;
    try {
      await unassignChargerFromTicket(context, ticketId, chargerId);
      setTimeout(() => {
        onMutate();
        fetchDetail();
      }, 500);
    } catch {
      alert("Erro ao desvincular carregador.");
    }
  };

  const handleAssignSelected = async () => {
    if (!canAssign || selectedChargers.length === 0) return;
    setAssigning(true);
    try {
      const success = await assignMultipleChargersToTicket(context, ticketId, selectedChargers);
      if (success) {
        setSelectedChargers([]);
        setTimeout(() => {
          onMutate();
          fetchDetail();
          setAssigning(false);
        }, 500);
      } else {
        alert("Falha ao atribuir carregadores. Verifique os logs do sistema.");
        setAssigning(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao atribuir carregadores.";
      alert(`Erro: ${message}`);
      setAssigning(false);
    }
  };

  const toggleCharger = (id: number) => {
    if (!canAssign) return;
    setSelectedChargers((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Building2 size={20} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Detalhes da Ordem de Servico</h3>
              <span className="text-xs text-slate-500">Ticket #{ticketId}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col lg:flex-row">
              <div className="flex-1 p-6 border-b lg:border-b-0 lg:border-r border-slate-700/50">
                <h2 className="text-xl font-bold text-white mb-4 leading-tight">{data.name}</h2>

                {data.content && (
                  <div className="mb-6">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                      Descricao Detalhada
                    </h4>
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                      <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                        {stripHtml(data.content)}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <User size={14} />
                    {data.chargers.length === 0 ? "Aguardando Designacao" : "Equipe em Retaguarda"}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {data.chargers.map((ch) => (
                      <div
                        key={ch.id}
                        className="flex items-center gap-2 bg-blue-950/40 border border-blue-800/50 rounded-full pl-3 pr-1.5 py-1.5 group/chip"
                      >
                        <span className="text-sm text-slate-200 font-medium">{ch.name}</span>
                        {canAssign && (
                          <button
                            onClick={() => handleUnassign(ch.id)}
                            className="w-5 h-5 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors"
                            title="Desvincular"
                          >
                            <X size={10} className="text-red-400" />
                          </button>
                        )}
                      </div>
                    ))}
                    {data.chargers.length === 0 && (
                      <p className="text-xs text-slate-500 italic">Nenhum carregador atribuido no momento.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-80 p-6 bg-slate-800/30 shrink-0">
                <div className="space-y-3 mb-6">
                  {data.requester_name && (
                    <div className="flex items-center gap-3">
                      <User size={14} className="text-slate-500 shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase text-slate-600 font-bold block">Requerente</span>
                        <span className="text-sm text-slate-200">{data.requester_name}</span>
                      </div>
                    </div>
                  )}
                  {data.category && (
                    <div className="flex items-center gap-3">
                      <Tag size={14} className="text-slate-500 shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase text-slate-600 font-bold block">Categoria</span>
                        <span className="text-sm text-slate-200">{formatCategoryName(data.category)}</span>
                      </div>
                    </div>
                  )}
                  {data.date && (
                    <div className="flex items-center gap-3">
                      <Calendar size={14} className="text-slate-500 shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase text-slate-600 font-bold block">Abertura</span>
                        <span className="text-sm text-slate-200">{formatIsoDateTime(data.date)}</span>
                      </div>
                    </div>
                  )}
                  {data.location && (
                    <div className="flex items-center gap-3">
                      <MapPin size={14} className="text-slate-500 shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase text-slate-600 font-bold block">Localizacao</span>
                        <span className="text-sm text-slate-200">{data.location}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-700/50 pt-4">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <UserPlus size={14} />
                    Adicionar Forca de Trabalho
                  </h4>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">
                    Disponiveis: {availableForAssignment.length}
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pl-1 pr-2 mb-3">
                    {availableForAssignment.map((ch) => (
                      <label
                        key={ch.id}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-700/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedChargers.includes(ch.id)}
                          onChange={() => toggleCharger(ch.id)}
                          className="w-4 h-4 rounded border-slate-600 text-blue-500 focus:ring-blue-500 bg-slate-800"
                          disabled={!canAssign}
                        />
                        <div>
                          <span className="text-sm text-slate-200 font-medium">{ch.name}</span>
                          <span className="text-[10px] text-emerald-500 font-bold block mt-0.5">
                            {formatIdleTime(ch.lastTicket?.solvedate)}
                          </span>
                        </div>
                      </label>
                    ))}
                    {availableForAssignment.length === 0 && (
                      <p className="text-xs text-slate-500 italic px-3 py-2">Nenhum disponivel.</p>
                    )}
                  </div>
                  {unavailableForAssignment.length > 0 && (
                    <p className="mb-3 text-[10px] text-orange-300/90">
                      {unavailableForAssignment.length} indisponivel(eis): offline ou fora do expediente.
                    </p>
                  )}
                  <button
                    onClick={handleAssignSelected}
                    disabled={!canAssign || selectedChargers.length === 0 || assigning}
                    className="w-full py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    {assigning
                      ? "Atribuindo..."
                      : canAssign
                        ? `Atribuir a Missao (${selectedChargers.length})`
                        : "Sem permissao para atribuir"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-20">
            <p className="text-slate-500">Ticket nao encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketDetailModal;
