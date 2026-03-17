"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Clock, CheckCircle2, AlertCircle,
  Search, Loader2,
} from "lucide-react";

import { KanbanBoard } from "@/components/ui/kanban-board";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchStats, fetchTickets } from "@/lib/api/ticketService";
import type { TicketSummary, TicketStats } from "@/lib/api/types";
import { getContextManifest } from "@/lib/context-registry";

// Mapeamento contexto → group_id para filtro de tickets
const contextGroupMap: Record<string, number | null> = {
  "dtic": null,              // DTIC: todos os tickets do banco (sem filtro de grupo)
  "sis-manutencao": 22,    // CC-MANUTENCAO
  "sis-memoria": 21,       // CC-CONSERVAÇÃO
  "sis": null,             // Gestor SIS: todos
};

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const context = params.context as string;
  const manifest = getContextManifest(context) || getContextManifest("dtic")!;
  const current = {
    title: manifest.dashboardTitle,
    subtitle: manifest.dashboardSubtitle,
    accentClass: manifest.accentClass.split(' ')[2], // text-accent-blue
  };
  const { currentUserRole } = useAuthStore();

  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determinar o hubRole ativo de forma rigorosa
  // Prioridade: 0) Papel explícito escolhido, 1) context_override bate com URL (SIS sub-papéis), 2) profile_id, 3) fallback
  const hubRoles = currentUserRole?.hub_roles || [];
  const activeProfile = currentUserRole?.roles?.active_profile;
  const activeHubRole =
    currentUserRole?.active_hub_role ||
    hubRoles.find(r => r.context_override === context) ||
    hubRoles.find(r => r.profile_id === activeProfile?.id) ||
    hubRoles[0];

  useEffect(() => {
    // PROTEÇÃO DA ROTA: Solicitante não acessa Dashboard
    if (activeHubRole?.role === "solicitante") {
      router.replace(`/${context}/user`);
      return;
    }

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const groupId = activeHubRole?.group_id || contextGroupMap[context];

        // CQRS: Stats reais via SQL (não mais contagem de 50 tickets)
        const realStats = await fetchStats(context, groupId);
        setStats(realStats);

        // CQRS: Tickets para o Kanban (com JOINs reais)
        // Busca abertos sem LIMIT (poucos) + resolvidos recentes com LIMIT
        const [openResult, solvedResult] = await Promise.all([
          fetchTickets(context, {
            groupId,
            status: [1, 2, 3, 4], // Abertos: sem limit
          }),
          fetchTickets(context, {
            groupId,
            status: [5], // Solucionados: últimos recentes
            limit: 200,
          }),
        ]);
        const ticketList = [...openResult.tickets, ...solvedResult.tickets];
        setTickets(ticketList);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao carregar chamados";
        setError(message);
        setTickets([]);
        setStats(null);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [context, activeHubRole?.role, activeHubRole?.group_id, router]);




  const statCards = stats
    ? [
        { label: "Novos", value: String(stats.new).padStart(2, "0"), icon: <AlertCircle size={16} /> },
      { label: "Em Atendimento", value: String(stats.inProgress).padStart(2, "0"), icon: <Clock size={16} /> },
        { label: "Pendentes", value: String(stats.pending).padStart(2, "0"), icon: <AlertCircle size={16} /> },
      { label: "Resolvidos (30d)", value: String(stats.solvedRecent).padStart(2, "0"), icon: <CheckCircle2 size={16} /> },
      ]
    : [
        { label: "Novos", value: "--", icon: <AlertCircle size={16} /> },
        { label: "Em Atendimento", value: "--", icon: <Clock size={16} /> },
        { label: "Pendentes", value: "--", icon: <AlertCircle size={16} /> },
      { label: "Resolvidos (30d)", value: "--", icon: <CheckCircle2 size={16} /> },
      ];

  return (
    <ProtectedRoute allowedHubRoles={["tecnico", "gestor"]}>
        <div className="flex flex-col h-full px-5 lg:px-8 py-5">
          {/* Header */}
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 shrink-0">
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-text-1 tracking-tight">{current.title}</h1>
              <p className="text-text-2/50 text-[14px] mt-0.5">{current.subtitle}</p>
            </div>

            <div className="flex items-center gap-2.5">
            <div className="relative group hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3/40 group-focus-within:text-text-2 transition-colors" size={14} />
                <input
                  placeholder="Buscar chamados..."
                  className="bg-surface-2 border border-white/[0.06] rounded-lg py-2.5 pl-9 pr-4 text-[14px] outline-none focus:border-white/[0.12] w-56 transition-all text-text-2 placeholder:text-text-3/40"
                />
            </div>
            </div>
          </header>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm mb-4 shrink-0">
              {error}
            </div>
          )}

          {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5 shrink-0">
            {statCards.map((stat, idx) => (
              <div key={idx} className="bg-surface-2 border border-white/[0.06] rounded-lg px-4 py-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-3/50">{stat.label}</span>
                  <div className="text-text-3/30">{stat.icon}</div>
                </div>
                <div className="text-xl font-semibold text-text-1 font-mono tracking-tighter">
                  {loading ? <Loader2 size={16} className="animate-spin text-text-3/30" /> : stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Kanban Board */}
          <div className="flex-grow min-h-0">
            <KanbanBoard context={context} tickets={tickets} loading={loading} />
        </div>
      </div>
    </ProtectedRoute>
  );
}
