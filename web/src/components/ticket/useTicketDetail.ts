import { useState, useRef, useEffect, useCallback } from "react";
import { fetchTicketDetail } from "@/lib/api/ticketService";
import { getSubItems, getItem, createItem, updateItem, deleteItem } from "@/lib/api/glpiService";
import { useAuthStore } from "@/store/useAuthStore";
import type { TicketDetail } from "@/lib/api/types";

// ─── Timeline entry types ───
export type TimelineEntryType = "followup" | "solution" | "task";
export interface TimelineEntry {
  id: number;
  type: TimelineEntryType;
  content: string;
  date: string;
  userId: number;
  userName: string;
  isPrivate: boolean;
  actionTime?: number;
  solutionStatus?: number;
}

interface TicketUser { users_id: number; type: number; }
interface GroupTicket { groups_id: number; type: number; }

function stripHtml(html: string) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

export function useTicketDetail(ticketId: number, context: string) {
  const apiContext = context.startsWith("sis") ? "sis" : context;

  const currentUser = useAuthStore((s) => s.currentUserRole);
  const activeView = useAuthStore((s) => s.activeView);
  const currentUserId = currentUser?.user_id || 0;
  const currentUserName = currentUser?.name || "Desconhecido";
  
  // Permissão baseada no CONTEXTO DE NAVEGAÇÃO, não no perfil global.
  // Se o usuário entrou pelo dashboard/kanban → 'tech' → botões de ação visíveis.
  // Se entrou por "Meus Chamados" → 'user' → somente chat.
  const hasTechProfile = (currentUser?.hub_roles || []).some(
    (r) => r.role.startsWith("tecnico") || r.role === "gestor"
  );
  const isTechOrManager = activeView === 'tech' && hasTechProfile;
  
  const techProfileId = currentUser?.hub_roles?.find(
    (r) => r.role.startsWith("tecnico") || r.role === "gestor"
  )?.profile_id || undefined;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [requesterName, setRequesterName] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [technicianUserId, setTechnicianUserId] = useState<number | null>(null);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const userCacheRef = useRef<Map<number, string>>(new Map());

  const resolveUserName = useCallback(async (userId: number): Promise<string> => {
    if (!userId || userId === 0) return "Sistema";
    const cached = userCacheRef.current.get(userId);
    if (cached) return cached;
    try {
      const user = await getItem(apiContext, "User", userId, true);
      const name = user.name || user.realname || `User #${userId}`;
      userCacheRef.current.set(userId, name);
      return name;
    } catch {
      const fallback = `User #${userId}`;
      userCacheRef.current.set(userId, fallback);
      return fallback;
    }
  }, [apiContext]);

  const loadTicketData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { ticket: t } = await fetchTicketDetail(context, ticketId);
      setTicket(t);

      const [rawFollowups, rawSolutions, rawTasks, ticketUsers, ticketGroups] =
        await Promise.all([
          getSubItems(apiContext, "Ticket", ticketId, "ITILFollowup").catch(() => []),
          getSubItems(apiContext, "Ticket", ticketId, "ITILSolution").catch(() => []),
          getSubItems(apiContext, "Ticket", ticketId, "TicketTask").catch(() => []),
          getSubItems(apiContext, "Ticket", ticketId, "Ticket_User").catch(() => []),
          getSubItems(apiContext, "Ticket", ticketId, "Group_Ticket").catch(() => []),
        ]);

      const requester = (ticketUsers as TicketUser[]).find((u) => u.type === 1);
      const technician = (ticketUsers as TicketUser[]).find((u) => u.type === 2);
      const assignedGroup = (ticketGroups as GroupTicket[]).find((g) => g.type === 2);

      if (requester) setRequesterName(await resolveUserName(requester.users_id));
      if (technician) {
        setTechnicianName(await resolveUserName(technician.users_id));
        setTechnicianUserId(technician.users_id);
      } else {
        setTechnicianName("");
        setTechnicianUserId(null);
      }

      if (assignedGroup) {
        try {
          const g = await getItem(apiContext, "Group", assignedGroup.groups_id, true);
          setGroupName(g.completename || g.name || `Grupo #${assignedGroup.groups_id}`);
        } catch { setGroupName(`Grupo #${assignedGroup.groups_id}`); }
      }

      // Build timeline
      const entries: TimelineEntry[] = [];
      for (const f of rawFollowups as any[]) {
        entries.push({ id: f.id, type: "followup", content: stripHtml(f.content || ""), date: f.date || f.date_creation || "", userId: Number(f.users_id) || 0, userName: "", isPrivate: Boolean(f.is_private) });
      }
      for (const s of rawSolutions as any[]) {
        entries.push({ id: s.id, type: "solution", content: stripHtml(s.content || ""), date: s.date_creation || s.date || "", userId: Number(s.users_id) || 0, userName: "", isPrivate: false, solutionStatus: Number(s.status) || 2 });
      }
      for (const tk of rawTasks as any[]) {
        entries.push({ id: tk.id, type: "task", content: stripHtml(tk.content || ""), date: tk.date || tk.date_creation || "", userId: Number(tk.users_id) || Number(tk.users_id_tech) || 0, userName: "", isPrivate: Boolean(tk.is_private), actionTime: Number(tk.actiontime) || 0 });
      }
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const uniqueIds = [...new Set(entries.map((e) => e.userId).filter(Boolean))];
      await Promise.all(uniqueIds.map((id) => resolveUserName(id)));
      for (const entry of entries) entry.userName = userCacheRef.current.get(entry.userId) || `User #${entry.userId}`;

      setTimeline(entries);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados do ticket.");
    } finally {
      setLoading(false);
    }
  }, [ticketId, context, apiContext, resolveUserName]);

  useEffect(() => { if (ticketId) loadTicketData(); }, [ticketId, loadTicketData]);

  // ─── Actions ───
  const handleAddFollowup = async (newMessage: string) => {
    if (!newMessage.trim()) return;
    setActionLoading("followup");
    try {
      await createItem(apiContext, "ITILFollowup", {
        itemtype: "Ticket",
        items_id: ticketId,
        content: newMessage.trim(),
        is_private: 0,
        users_id: currentUserId,
      });
      await loadTicketData();
    } catch (err: any) {
      alert(`Erro ao adicionar acompanhamento: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssumeTicket = async () => {
    setActionLoading("assume");
    try {
      await updateItem(apiContext, "Ticket", ticketId, { status: 2 });
      await createItem(apiContext, "Ticket_User", {
        tickets_id: ticketId,
        users_id: currentUserId,
        type: 2, 
      });
      await loadTicketData();
    } catch (err: any) {
      alert(`Erro ao assumir ticket: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddSolution = async (solutionText: string) => {
    if (!solutionText.trim()) return;
    setActionLoading("solution");
    try {
      await createItem(apiContext, "ITILSolution", {
        itemtype: "Ticket",
        items_id: ticketId,
        content: solutionText.trim(),
        users_id: currentUserId,
      });
      await loadTicketData();
    } catch (err: any) {
      alert(`Erro ao adicionar solução: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetPending = async () => {
    setActionLoading("pending");
    try {
      await updateItem(apiContext, "Ticket", ticketId, { status: 4 });
      await loadTicketData();
    } catch (err: any) {
      alert(`Erro ao colocar em pendente: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async () => {
    setActionLoading("resume");
    try {
      await updateItem(apiContext, "Ticket", ticketId, { status: 2 });
      await loadTicketData();
    } catch (err: any) {
      alert(`Erro ao retomar atendimento: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReturnToQueue = async () => {
    if (!technicianUserId) return;
    setActionLoading("return");
    try {
      const users: TicketUser[] = await getSubItems(apiContext, "Ticket", ticketId, "Ticket_User");
      const assignedEntry = users.find((u) => u.type === 2);
      if (assignedEntry) {
        await deleteItem(apiContext, "Ticket_User", (assignedEntry as any).id);
      }
      await updateItem(apiContext, "Ticket", ticketId, { status: 1 });
      await loadTicketData();
    } catch (err: any) {
      alert(`Erro ao devolver à fila: ${err.message}`);
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
    error,
    actionLoading,
    currentUserId,
    currentUserName,
    isTechOrManager,
    techProfileId,
    handleAddFollowup,
    handleAssumeTicket,
    handleAddSolution,
    handleSetPending,
    handleResume,
    handleReturnToQueue,
    loadTicketData,
  };
}
