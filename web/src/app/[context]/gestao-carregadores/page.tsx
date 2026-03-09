"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { RotateCw, ShieldAlert } from "lucide-react";

import { useChargerData, useOperationSettings } from "../../../hooks/useChargerData";
import StatCards from "../../../components/chargers/ChargerStats";
import HorizontalRanking from "../../../components/chargers/HorizontalRanking";
import { ChargerKanban } from "../../../components/chargers/ChargerKanban";
import ManageMenu from "../../../components/chargers/ManageMenu";
import TicketDetailModal from "../../../components/chargers/TicketDetailModal";
import UnassignConfirmModal from "../../../components/chargers/UnassignConfirmModal";
import CreateChargerModal from "../../../components/chargers/CreateChargerModal";
import DeleteChargerModal from "../../../components/chargers/DeleteChargerModal";
import SettingsModal from "../../../components/chargers/SettingsModal";
import { useAuthStore } from "../../../store/useAuthStore";
import type { KanbanDemand } from "../../../types/charger";
import {
  createCharger as apiCreateCharger,
  deleteCharger as apiDeleteCharger,
  unassignChargerFromTicket,
} from "../../../lib/api/chargerService";
import { logoutApi } from "../../../lib/api/glpiService";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function GestaoCarregadoresPage() {
  const { context } = useParams() as { context: string };
  const router = useRouter();

  const token = useAuthStore(state => state.sessionTokens[context]);
  const logoutStore = useAuthStore(state => state.logout);

  // O fetch só deveria acontecer se houver token, porém a refatoração do hook é externa e
  // o ProtectedRoute já garante a autenticação antes de chegar aqui.
  const { kanbanData, chargers, stats, loading, refresh } = useChargerData(context);
  const { settings } = useOperationSettings(context);

  // ─── Estado dos Modais ───
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [detailTicketId, setDetailTicketId] = useState<number | null>(null);
  const [unassignTarget, setUnassignTarget] = useState<{
    ticketId: number;
    chargerId: number;
    chargerName: string;
  } | null>(null);

  // ─── Relógio em Tempo Real ───
  const [clock, setClock] = useState("");
  useEffect(() => {
    const tick = () => {
      setClock(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const isInBusinessHours = (() => {
    const now = new Date();
    const h = now.getHours();
    const bStart = parseInt(settings?.businessStart?.split(":")[0] || settings?.business_start?.split(":")[0] || "8", 10);
    const bEnd = parseInt(settings?.businessEnd?.split(":")[0] || settings?.business_end?.split(":")[0] || "18", 10);
    return h >= bStart && h < bEnd;
  })();

  // ─── Callbacks de Mutação ───
  const handleCreate = useCallback(async (name: string, locationId: number) => {
    setMutationLoading(true);
    try {
      await apiCreateCharger(context, name, locationId);
      refresh();
    } finally {
      setMutationLoading(false);
    }
  }, [context, refresh]);

  const handleDelete = useCallback(async (id: number) => {
    setMutationLoading(true);
    try {
      await apiDeleteCharger(context, id);
      refresh();
    } finally {
      setMutationLoading(false);
    }
  }, [context, refresh]);

  const handleUnassign = useCallback(async (ticketId: number, chargerId: number, chargerName: string) => {
    setUnassignTarget({ ticketId, chargerId, chargerName });
  }, []);

  const handleConfirmUnassign = useCallback(async () => {
    if (!unassignTarget) return;
    setMutationLoading(true);
    try {
      await unassignChargerFromTicket(context, unassignTarget.ticketId, unassignTarget.chargerId);
      // Delay para GLPI propagar commit antes de re-fetch
      setTimeout(() => refresh(), 500);
    } catch (_err) {
      alert("Erro ao desvincular carregador.");
    } finally {
      setMutationLoading(false);
      setUnassignTarget(null);
    }
  }, [context, refresh, unassignTarget]);

  const handleLogout = useCallback(async () => {
    try {
      await logoutApi(context);
    } catch (err) {
      console.warn("API de Logout falhou ou sessão já expirada.", err);
    } finally {
      logoutStore();
    }
  }, [context, logoutStore]);




  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400 gap-4">
        <div className="w-10 h-10 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-sm font-semibold">Sincronizando com SIS...</span>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedHubRoles={["gestor"]} requireContext="sis">
      <div className="flex flex-col h-screen bg-slate-950 p-4 md:p-6 overflow-hidden font-sans">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Gestão de Carregadores
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Orquestração de recursos, demandas e produtividade operacional.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end justify-center mr-2">
            <span className="text-2xl font-black text-white tabular-nums tracking-tight leading-none">{clock}</span>
            <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isInBusinessHours ? 'text-emerald-400' : 'text-red-400'}`}>
              {isInBusinessHours ? '● Em Expediente' : '● Oper. Encerrada'}
            </span>
          </div>
          <button
            onClick={() => refresh()}
            className="flex items-center justify-center gap-2 px-4 h-10 text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-white/10 transition-all shadow-lg shadow-black/20"
          >
            <RotateCw size={16} />
            Atualizar
          </button>
          <ManageMenu
            onOpenCreate={() => setShowCreateModal(true)}
            onOpenDelete={() => setShowDeleteModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Stat Cards */}
      <StatCards stats={stats} />

      {/* Kanban (3 Colunas) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChargerKanban
          demands={kanbanData.demands}
          available={kanbanData.availableResources}
          allocated={kanbanData.allocatedResources}
          onDemandClick={(demand) => setDetailTicketId(demand.id)}
          onUnassignCharger={handleUnassign}
          onAllocatedClick={(ticketId) => setDetailTicketId(ticketId)}
        />
      </div>

      {/* Ranking */}
      <div className="shrink-0">
        <HorizontalRanking
          chargers={chargers}
          settings={settings}
        />
      </div>

      {/* ─── Modais ─── */}
      <CreateChargerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        loading={mutationLoading}
        context={context}
      />

      <DeleteChargerModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDelete={handleDelete}
        chargers={kanbanData.availableResources}
        loading={mutationLoading}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        chargers={kanbanData.availableResources}
        context={context}
        onUpdate={refresh}
      />

      {detailTicketId && (
        <TicketDetailModal
          ticketId={detailTicketId}
          context={context}
          onClose={() => setDetailTicketId(null)}
          onMutate={refresh}
        />
      )}

        {unassignTarget && (
        <UnassignConfirmModal
          chargerName={unassignTarget.chargerName}
          onConfirm={handleConfirmUnassign}
          onCancel={() => setUnassignTarget(null)}
        />
      )}
    </div>
    </ProtectedRoute>
  );
}
