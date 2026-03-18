import { useCallback, useEffect, useRef, useState } from "react";

import type { TicketTimelineEntry as TimelineEntry } from "@/lib/api/models/ticket-detail";
import {
  addTicketFollowup,
  addTicketSolution,
  approveTicketSolution,
  assumeTicket,
  fetchTicketWorkflowDetail,
  rejectTicketSolution,
  reopenTicket,
  resumeTicket,
  returnTicketToQueue,
  setTicketPending,
  transferTicket,
} from "@/lib/api/ticketWorkflowService";
import type { TicketDetail } from "@/lib/api/types";
import { useAuthStore } from "@/store/useAuthStore";
import { useLiveDataRefresh } from "@/hooks/useLiveDataRefresh";
import { POLL_INTERVALS } from "@/lib/realtime/polling";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export type { TimelineEntry };

export function useTicketDetail(ticketId: number, context: string) {
  const currentUser = useAuthStore((state) => state.currentUserRole);
  const activeView = useAuthStore((state) => state.activeView);
  const getOperationalViewForContext = useAuthStore(
    (state) => state.getOperationalViewForContext,
  );
  const operationalView = getOperationalViewForContext(context) ?? activeView;
  const currentUserId = currentUser?.user_id || 0;
  const currentUserName = currentUser?.name || "Desconhecido";

  const hasTechProfile = (currentUser?.hub_roles || []).some(
    (role) => role.role.startsWith("tecnico") || role.role === "gestor",
  );
  const isTechOrManager = operationalView === "tech" && hasTechProfile;
  const isGestor = (currentUser?.hub_roles || []).some((role) => role.role === "gestor");
  const techProfileId = currentUser?.hub_roles?.find(
    (role) => role.role.startsWith("tecnico") || role.role === "gestor",
  )?.profile_id || undefined;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [requesterName, setRequesterName] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [technicianUserId, setTechnicianUserId] = useState<number | null>(null);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const loadTicketData = useCallback(async (options?: { silent?: boolean }) => {
    const isInitialLoad = !hasLoadedOnceRef.current;
    if (isInitialLoad) setLoading(true);
    else if (!options?.silent) setRefreshing(true);
    setError(null);
    try {
      const detail = await fetchTicketWorkflowDetail(context, ticketId);
      setTicket(detail.ticket);
      setTimeline(detail.timeline);
      setRequesterName(detail.requesterName);
      setTechnicianName(detail.technicianName);
      setTechnicianUserId(detail.technicianUserId);
      setGroupName(detail.groupName);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao carregar dados do ticket."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [context, ticketId]);

  useEffect(() => {
    if (ticketId) {
      hasLoadedOnceRef.current = false;
      void loadTicketData();
    }
  }, [ticketId, loadTicketData]);

  useLiveDataRefresh({
    context,
    domains: ["tickets", "dashboard", "analytics", "search", "user", "chargers"],
    onRefresh: () => loadTicketData({ silent: true }),
    enabled: Boolean(ticketId),
    pollIntervalMs: POLL_INTERVALS.ticketDetail,
    minRefreshGapMs: 750,
  });

  const handleAddFollowup = async (newMessage: string) => {
    if (!newMessage.trim()) {
      return;
    }

    setActionLoading("followup");
    try {
      await addTicketFollowup(context, ticketId, {
        content: newMessage.trim(),
        user_id: currentUserId,
        is_private: false,
      });
      await loadTicketData({ silent: true });
    } catch (err) {
      alert(`Erro ao adicionar acompanhamento: ${getErrorMessage(err, "Erro interno.")}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssumeTicket = async () => {
    setActionLoading("assume");
    try {
      await assumeTicket(context, ticketId, { technician_user_id: currentUserId });
      await loadTicketData({ silent: true });
    } catch (err) {
      alert(`Erro ao assumir ticket: ${getErrorMessage(err, "Erro interno.")}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddSolution = async (solutionText: string) => {
    if (!solutionText.trim()) {
      return;
    }

    setActionLoading("solution");
    try {
      await addTicketSolution(context, ticketId, {
        content: solutionText.trim(),
        user_id: currentUserId,
      });
      await loadTicketData({ silent: true });
    } catch (err) {
      alert(`Erro ao adicionar solução: ${getErrorMessage(err, "Erro interno.")}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetPending = async () => {
    setActionLoading("pending");
    try {
      await setTicketPending(context, ticketId);
      await loadTicketData({ silent: true });
    } catch (err) {
      alert(`Erro ao colocar em pendente: ${getErrorMessage(err, "Erro interno.")}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async () => {
    setActionLoading("resume");
    try {
      await resumeTicket(context, ticketId);
      await loadTicketData({ silent: true });
    } catch (err) {
      alert(`Erro ao retomar atendimento: ${getErrorMessage(err, "Erro interno.")}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReturnToQueue = async () => {
    setActionLoading("return");
    try {
      await returnTicketToQueue(context, ticketId);
      await loadTicketData({ silent: true });
    } catch (err) {
      alert(`Erro ao devolver à fila: ${getErrorMessage(err, "Erro interno.")}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReopenTicket = async () => {
    setActionLoading("reopen");
    try {
      await reopenTicket(context, ticketId);
      await loadTicketData({ silent: true });
    } catch (err) {
      alert(`Erro ao reabrir ticket: ${getErrorMessage(err, "Erro interno.")}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveSolution = async (comment = "") => {
    setActionLoading("approve-solution");
    try {
      await approveTicketSolution(context, ticketId, {
        comment: comment.trim() || undefined,
      });
      await loadTicketData({ silent: true });
    } catch (err) {
      alert(`Erro ao aprovar solução: ${getErrorMessage(err, "Erro interno.")}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSolution = async (comment = "") => {
    setActionLoading("reject-solution");
    try {
      await rejectTicketSolution(context, ticketId, {
        comment: comment.trim() || undefined,
      });
      await loadTicketData({ silent: true });
    } catch (err) {
      alert(`Erro ao recusar solução: ${getErrorMessage(err, "Erro interno.")}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTransferTicket = async (newTechnicianId: number) => {
    setActionLoading("transfer");
    try {
      await transferTicket(context, ticketId, {
        technician_user_id: newTechnicianId,
      });
      await loadTicketData({ silent: true });
    } catch (err) {
      alert(`Erro ao transferir ticket: ${getErrorMessage(err, "Erro interno.")}`);
    } finally {
      setActionLoading(null);
    }
  };

  return {
    ticket,
    timeline,
    requesterName,
    technicianName,
    technicianUserId,
    groupName,
    loading,
    refreshing,
    error,
    actionLoading,
    currentUserId,
    currentUserName,
    isTechOrManager,
    canActOnTicket: isGestor || technicianUserId === currentUserId,
    techProfileId,
    handleAddFollowup,
    handleAssumeTicket,
    handleAddSolution,
    handleSetPending,
    handleResume,
    handleReturnToQueue,
    handleReopenTicket,
    handleApproveSolution,
    handleRejectSolution,
    handleTransferTicket,
    loadTicketData,
  };
}
