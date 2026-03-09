"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  User,
  Tag,
  MapPin,
  Calendar,
  Building2,
  UserPlus
} from "lucide-react";
import type { TicketDetailResponse } from "../../types/charger";
import { getTicketDetail, assignMultipleChargersToTicket, unassignChargerFromTicket } from "../../lib/api/chargerService";
import { formatCategoryName } from "../../lib/utils/formatters";

interface TicketDetailModalProps {
  ticketId: number;
  context: string;
  onClose: () => void;
  onMutate: () => void;
}

const stripHtml = (html: string): string => {
  // Decodifica entidades HTML numéricas: &#60; → <, &#62; → >, etc.
  let decoded = html.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  // Decodifica entidades nomeadas comuns
  decoded = decoded
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"');
  // Agora remove as tags HTML reais
  return decoded
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticketId,
  context,
  onClose,
  onMutate,
}) => {
  const [data, setData] = useState<TicketDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChargers, setSelectedChargers] = useState<number[]>([]);
  const [assigning, setAssigning] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTicketDetail(context, ticketId);
      setData(res as TicketDetailResponse);
    } catch (error) {
      console.error("Error fetching ticket detail:", error);
    } finally {
      setLoading(false);
    }
  }, [context, ticketId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleUnassign = async (chargerId: number) => {
    try {
      await unassignChargerFromTicket(context, ticketId, chargerId);
      setTimeout(() => {
        onMutate();
        fetchDetail();
      }, 500);
    } catch (_err) {
      alert("Erro ao desvincular carregador.");
    }
  };

  const handleAssignSelected = async () => {
    if (selectedChargers.length === 0) return;
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
        // Fallback p/ comportamento antigo caso return false (agora thow Error é preferível)
        alert("Falha ao atribuir carregadores. Verifique os logs do sistema.");
        setAssigning(false);
      }
    } catch (err: any) {
      alert(`Erro: ${err?.message || "Erro ao atribuir carregadores."}`);
      setAssigning(false);
    }
  };

  const toggleCharger = (id: number) => {
    setSelectedChargers((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Building2 size={20} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Detalhes da Ordem de Serviço</h3>
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
              {/* Left: Content */}
              <div className="flex-1 p-6 border-b lg:border-b-0 lg:border-r border-slate-700/50">
                <h2 className="text-xl font-bold text-white mb-4 leading-tight">{data.name}</h2>

                {data.content && (
                  <div className="mb-6">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                      Descrição Detalhada
                    </h4>
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                      <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                        {stripHtml(data.content)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Equipe em Retaguarda */}
                <div>
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <User size={14} />
                    {data.chargers.length === 0 ? "Aguardando Designação" : "Equipe em Retaguarda"}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {data.chargers.map((ch) => (
                      <div
                        key={ch.id}
                        className="flex items-center gap-2 bg-blue-950/40 border border-blue-800/50 rounded-full pl-3 pr-1.5 py-1.5 group/chip"
                      >
                        <span className="text-sm text-slate-200 font-medium">{ch.name}</span>
                        <button
                          onClick={() => handleUnassign(ch.id)}
                          className="w-5 h-5 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors"
                          title="Desvincular"
                        >
                          <X size={10} className="text-red-400" />
                        </button>
                      </div>
                    ))}
                    {data.chargers.length === 0 && (
                      <p className="text-xs text-slate-500 italic">Nenhum carregador atribuído no momento.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Sidebar */}
              <div className="w-full lg:w-80 p-6 bg-slate-800/30 shrink-0">
                {/* Meta info */}
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
                        <span className="text-sm text-slate-200">
                          {new Date(data.date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </div>
                    </div>
                  )}
                  {data.location && (
                    <div className="flex items-center gap-3">
                      <MapPin size={14} className="text-slate-500 shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase text-slate-600 font-bold block">Localização</span>
                        <span className="text-sm text-slate-200">{data.location}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Adicionar Força de Trabalho */}
                <div className="border-t border-slate-700/50 pt-4">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <UserPlus size={14} />
                    Adicionar Força de Trabalho
                  </h4>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">
                    Disponíveis: {data.available_chargers.filter((c) => !c.is_offline).length}
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pl-1 pr-2 mb-3">
                    {data.available_chargers
                      .filter((c) => !c.is_offline)
                      .map((ch) => (
                        <label
                          key={ch.id}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-700/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedChargers.includes(ch.id)}
                            onChange={() => toggleCharger(ch.id)}
                            className="w-4 h-4 rounded border-slate-600 text-blue-500 focus:ring-blue-500 bg-slate-800"
                          />
                          <div>
                            <span className="text-sm text-slate-200 font-medium">{ch.name}</span>
                            <span className="text-[10px] text-emerald-500 font-bold block mt-0.5">
                              {ch.lastTicket?.solvedate
                                ? `Ocioso há: ${(() => {
                                    const mins = Math.floor((Date.now() - new Date(ch.lastTicket.solvedate).getTime()) / 60000);
                                    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
                                  })()}`
                                : 'Pronto para operação'}
                            </span>
                          </div>
                        </label>
                      ))}
                    {data.available_chargers.filter((c) => !c.is_offline).length === 0 && (
                      <p className="text-xs text-slate-500 italic px-3 py-2">Nenhum disponível.</p>
                    )}
                  </div>
                  <button
                    onClick={handleAssignSelected}
                    disabled={selectedChargers.length === 0 || assigning}
                    className="w-full py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    {assigning ? "Atribuindo..." : `Atribuir à Missão (${selectedChargers.length})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-20">
            <p className="text-slate-500">Ticket não encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketDetailModal;
