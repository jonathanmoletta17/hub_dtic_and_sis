/**
 * ticketService — Camada de dados para tickets.
 *
 * CQRS:
 *   LEITURAS (listagens, stats)  → /db/stats, /db/tickets (SQL direto)
 *   ESCRITAS (detalhe individual) → GLPI REST API (session token do user)
 */

import { API_BASE } from './httpClient';
import { getItem, getSubItems } from "./glpiService";
import type { TicketSummary, TicketDetail, FollowUp, TicketStats } from "./types";
import { TICKET_STATUS_MAP, TICKET_URGENCY_MAP } from "./types";

// ─── Helper: strip HTML ───
function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Helper: resolver contexto de API ───
function resolveApiContext(context: string): string {
  return context.startsWith("sis") ? "sis" : context;
}

// ────────────────────────────────────────────────────────────────────────
// CQRS: LEITURAS via /db (SQL direto)
// ────────────────────────────────────────────────────────────────────────

type DbTicketRow = {
  id: number;
  title?: string;
  content?: string;
  category?: string;
  status?: string;
  statusId?: number;
  urgency?: string;
  urgencyId?: number;
  dateCreated?: string;
  dateModified?: string;
  requester?: string;
  technician?: string;
  group?: string;
  entity?: string;
};

type GlpiTicket = Record<string, unknown>;
type GlpiFollowup = Record<string, unknown>;

function getString(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val : fallback;
}

function getNumber(val: unknown, fallback = 0): number {
  if (typeof val === "number") return val;
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Busca contagens reais de tickets por status via SQL.
 * Substitui o antigo computeStats() que contava apenas 50 tickets.
 */
export async function fetchStats(
  context: string,
  groupId?: number | null,
  department?: string | null
): Promise<TicketStats> {
  const apiContext = resolveApiContext(context);
  const params = new URLSearchParams();
  if (groupId) params.set("group_ids", String(groupId));
  if (department) params.set("department", department);

  const qs = params.toString();
  const url = `${API_BASE}/api/v1/${apiContext}/db/stats${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Stats error: ${res.status}`);
  }

  const data = await res.json();

  return {
    new: data.novos ?? 0,
    inProgress: data.em_atendimento ?? 0,
    pending: data.pendentes ?? 0,
    solved: data.solucionados ?? 0,
    solvedRecent: data.solucionados_recentes ?? 0,
    totalOpen: data.total_abertos ?? 0,
    total: data.total ?? 0,
  };
}

/**
 * Busca tickets com JOINs reais (requester, technician, category).
 * Substitui fetchTicketsByGroup/fetchAllTickets que usavam Search API.
 */
export async function fetchTickets(
  context: string,
  options: {
    groupId?: number | null;
    department?: string | null;
    status?: number[];
    requesterId?: number | null;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ total: number; tickets: TicketSummary[] }> {
  const apiContext = resolveApiContext(context);
  const params = new URLSearchParams();

  if (options.groupId) params.set("group_ids", String(options.groupId));
  if (options.department) params.set("department", options.department);
  if (options.status?.length) params.set("status", options.status.join(","));
  if (options.requesterId) params.set("requester_id", String(options.requesterId));
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));

  const qs = params.toString();
  const url = `${API_BASE}/api/v1/${apiContext}/db/tickets${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Tickets error: ${res.status}`);
  }

  const result = await res.json();
  const dataRows: DbTicketRow[] = Array.isArray(result.data) ? result.data : [];
  const tickets: TicketSummary[] = dataRows.map((r) => ({
    id: r.id,
    title: r.title || "Sem título",
    content: r.content || "",
    category: r.category || "Sem categoria",
    status: r.status || "",
    statusId: r.statusId || 0,
    urgency: r.urgency || "",
    urgencyId: r.urgencyId || 0,
    dateCreated: r.dateCreated || "",
    dateModified: r.dateModified || "",
    requester: r.requester,
    technician: r.technician,
  }));

  return { total: result.total || 0, tickets };
}

/**
 * Busca os tickets abertos do usuário logado diretamente via DB SQL
 */
export async function fetchMyTickets(
  context: string,
  userId: number,
): Promise<TicketSummary[]> {
  const { tickets } = await fetchTickets(context, {
    requesterId: userId,
    limit: 100
  });
  return tickets;
}

/**
 * Busca direta no banco (SQL) via novo endpoint de busca do tensor-aurora.
 * Suporta busca por texto (MATCH AGAINST/LIKE) e por ID.
 */
export async function searchTicketsDirect(
  context: string,
  query: string,
  options: {
    department?: string | null;
    status?: number[];
    limit?: number;
  } = {}
): Promise<{ total: number; tickets: TicketSummary[] }> {
  const apiContext = resolveApiContext(context);
  const params = new URLSearchParams();
  
  params.set("q", query);
  if (options.department) params.set("department", options.department);
  if (options.status?.length) params.set("status", options.status.join(","));
  if (options.limit) params.set("limit", String(options.limit));

  const qs = params.toString();
  const url = `${API_BASE}/api/v1/${apiContext}/tickets/search?${qs}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Search error: ${res.status}`);
  }

  const result = await res.json();
  const dataRows: DbTicketRow[] = Array.isArray(result.data) ? result.data : [];
  const tickets: TicketSummary[] = dataRows.map((r) => ({
    id: r.id,
    title: r.title || "Sem título",
    content: r.content || "",
    category: r.category || "Sem categoria",
    status: r.status || "",
    statusId: r.statusId || 0,
    urgency: r.urgency || "",
    urgencyId: r.urgencyId || 0,
    dateCreated: r.dateCreated || "",
    dateModified: r.dateModified || "",
    requester: r.requester,
    technician: r.technician,
    groupName: r.group,
    entityName: r.entity,
  }));

  return { total: result.total || 0, tickets };
}

// ────────────────────────────────────────────────────────────────────────
// Detalhe de ticket (via GLPI REST API — session token do user)
// ────────────────────────────────────────────────────────────────────────

export async function fetchTicketDetail(
  context: string,
  ticketId: number
): Promise<{ ticket: TicketDetail; followups: FollowUp[] }> {
  const apiContext = resolveApiContext(context);

  const [rawData, rawFollowupsData] = await Promise.all([
    getItem(apiContext, "Ticket", ticketId, true),
    getSubItems(apiContext, "Ticket", ticketId, "ITILFollowup"),
  ]);

  const raw = rawData as GlpiTicket;
  const rawFollowups = Array.isArray(rawFollowupsData) ? rawFollowupsData : [];
  const statusId = getNumber(raw.status, 1);
  const urgencyId = getNumber(raw.urgency, 3);

  const ticket: TicketDetail = {
    id: getNumber(raw.id),
    title: getString(raw.name, "Sem título"),
    content: stripHtml(getString(raw.content)),
    category: getString(raw.itilcategories_id_completename) || getString(raw.itilcategories_id, "Sem categoria"),
    status: TICKET_STATUS_MAP[statusId] || `Status ${statusId}`,
    statusId,
    urgency: TICKET_URGENCY_MAP[urgencyId] || `Urgência ${urgencyId}`,
    urgencyId,
    dateCreated: getString(raw.date),
    dateModified: getString(raw.date_mod),
    location: getString(raw.locations_id_completename) || getString(raw.locations_id) || undefined,
    entityName: getString(raw.entities_id_completename) || getString(raw.entities_id) || undefined,
    priority: getNumber(raw.priority, 3),
    type: getNumber(raw.type, 1),
    closeDate: getString(raw.closedate) || undefined,
    solveDate: getString(raw.solvedate) || undefined,
  };

  const followups: FollowUp[] = rawFollowups.map((f) => {
    const followup = f as GlpiFollowup;
    return {
      id: getNumber(followup.id),
      content: stripHtml(getString(followup.content)),
      dateCreated: getString(followup.date) || getString(followup.date_creation),
      userName: getString(followup.users_id_completename) || getString(followup.users_id, "Sistema"),
      isPrivate: Boolean(followup.is_private),
      isTech: false,
    };
  });

  return { ticket, followups };
}
