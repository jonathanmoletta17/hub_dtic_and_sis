"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardOverviewHeader } from "@/components/dashboard/DashboardOverviewHeader";
import { DashboardQueuePanel } from "@/components/dashboard/DashboardQueuePanel";
import { buildDashboardStatCards } from "@/components/dashboard/dashboardStats";
import { useLiveDataRefresh } from "@/hooks/useLiveDataRefresh";
import { getContextManifest } from "@/lib/context-registry";
import { fetchStats, fetchTickets } from "@/lib/api/ticketService";
import type { TicketStats, TicketSummary } from "@/lib/api/types";
import { POLL_INTERVALS } from "@/lib/realtime/polling";
import { useAuthStore } from "@/store/useAuthStore";

const contextGroupMap: Record<string, number | null> = {
  dtic: null,
  sis: null,
  "sis-manutencao": 22,
  "sis-memoria": 21,
};

const RECENT_SOLVED_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function isRecentSolvedTicket(ticket: TicketSummary): boolean {
  const referenceDate = ticket.solveDate ?? ticket.dateModified;
  const timestamp = Date.parse(referenceDate);

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= RECENT_SOLVED_WINDOW_MS;
}

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const context = params.context as string;
  const manifest = getContextManifest(context) || getContextManifest("dtic")!;
  const { currentUserRole } = useAuthStore();

  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const hasLoadedOnceRef = useRef(false);

  const hubRoles = currentUserRole?.hub_roles || [];
  const activeProfile = currentUserRole?.roles?.active_profile;
  const activeHubRole =
    currentUserRole?.active_hub_role ||
    hubRoles.find((role) => role.context_override === context) ||
    hubRoles.find((role) => role.profile_id === activeProfile?.id) ||
    hubRoles[0];

  const loadData = useCallback(async () => {
    const isInitialLoad = !hasLoadedOnceRef.current;
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const groupId = activeHubRole?.group_id || contextGroupMap[context];
      const realStats = await fetchStats(context, groupId);
      setStats(realStats);

      const [openResult, solvedResult] = await Promise.all([
        fetchTickets(context, {
          groupId,
          status: [1, 2, 3, 4],
          limit: 500,
        }),
        fetchTickets(context, {
          groupId,
          status: [5],
          limit: 500,
        }),
      ]);

      const recentSolvedTickets = solvedResult.tickets.filter(isRecentSolvedTicket);

      setTickets([...openResult.tickets, ...recentSolvedTickets]);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar chamados";
      setError(message);
      if (!hasLoadedOnceRef.current) {
        setTickets([]);
        setStats(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeHubRole?.group_id, context]);

  useEffect(() => {
    if (activeHubRole?.role === "solicitante") {
      router.replace(`/${context}/user`);
      return;
    }

    hasLoadedOnceRef.current = false;
    void loadData();
  }, [context, activeHubRole?.role, activeHubRole?.group_id, loadData, router]);

  useLiveDataRefresh({
    context,
    domains: ["tickets", "dashboard", "analytics", "chargers"],
    onRefresh: loadData,
    enabled: activeHubRole?.role !== "solicitante",
    pollIntervalMs: POLL_INTERVALS.dashboard,
  });

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredTickets = tickets.filter((ticket) => {
    if (!normalizedQuery) return true;

    const terms = normalizedQuery.split(/\s+/).filter(Boolean);
    const haystack = [
      ticket.id,
      ticket.title,
      ticket.content,
      ticket.category,
      ticket.requester,
      ticket.technician,
      ticket.groupName,
      ticket.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return terms.every((term) => haystack.includes(term));
  });

  const monitoredCount = stats ? stats.totalOpen + stats.solvedRecent : tickets.length;
  const headerCountLabel = normalizedQuery
    ? `${filteredTickets.length} de ${tickets.length} chamados`
    : `${monitoredCount} chamados`;
  const contextBadge = context.startsWith("sis") ? "SIS" : context.toUpperCase();
  const boardHeading = normalizedQuery ? "Resultados da busca" : "Chamados por status";
  const statCards = buildDashboardStatCards(stats);
  const countOverrides = normalizedQuery
    ? undefined
    : {
        new: stats?.new ?? 0,
        "in-progress": stats?.inProgress ?? 0,
        pending: stats?.pending ?? 0,
        solved: stats?.solvedRecent ?? 0,
      };

  return (
    <ProtectedRoute allowedHubRoles={["tecnico", "gestor"]}>
      <div className="flex h-full flex-col px-5 py-5 lg:px-8">
        <DashboardOverviewHeader
          contextBadge={contextBadge}
          roleLabel={activeHubRole?.label}
          title={manifest.dashboardTitle}
          headerCountLabel={headerCountLabel}
          searchQuery={searchQuery}
          refreshing={refreshing}
          loading={loading}
          statCards={statCards}
          onSearchQueryChange={setSearchQuery}
        />

        {error ? (
          <div
            className="mb-4 shrink-0 rounded-lg border px-4 py-3 text-sm text-text-2"
            style={{ borderColor: "var(--status-active)", background: "var(--status-active-bg)" }}
          >
            {error}
          </div>
        ) : null}

        <DashboardQueuePanel
          context={context}
          tickets={filteredTickets}
          loading={loading}
          title={boardHeading}
          countOverrides={countOverrides}
          emptyMessage={
            normalizedQuery
              ? "Nenhum chamado corresponde a busca atual."
              : "Nenhum chamado encontrado para este contexto."
          }
        />
      </div>
    </ProtectedRoute>
  );
}
