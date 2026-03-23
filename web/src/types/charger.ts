// ═══════════════════════════════════════════════════════════════════
// Tipos — Gestão de Carregadores (Alinhados com Projeto Legado)
// ═══════════════════════════════════════════════════════════════════

import type { IsoDateTimeString } from "@/lib/datetime/iso";

// --- Charger (Recurso com métricas) ---

export interface ChargerLastTicket {
  id: number;
  title: string;
  location?: string;
  solvedate?: IsoDateTimeString;
}

export interface Charger {
  id: number;
  name: string;
  locations_id?: number;
  location?: string;
  is_deleted: boolean;
  is_offline?: boolean;
  offline_reason?: string;
  offline_since?: IsoDateTimeString;
  expected_return?: string;
  totalTicketsInPeriod: number;
  totalServiceMinutes: number;
  lastTicket?: ChargerLastTicket;
  schedule?: OperationSettings;
}

// --- Operation Settings (camelCase unificado) ---

export interface OperationSettings {
  businessStart?: string;
  businessEnd?: string;
  workOnWeekends?: boolean;
}

export const DEFAULT_OPERATION_SETTINGS: OperationSettings = {
  businessStart: "08:00",
  businessEnd: "18:00",
  workOnWeekends: false,
};

// --- Dashboard Stats ---

export interface OperationDashboardStats {
  livres: number;
  reservados: number;
  emOperacao: number;
  offline: number;
  total: number;
}

// --- Kanban Types ---

export interface KanbanDemand {
  id: number;
  title: string;             // nome do ticket
  name?: string;             // alias
  status: number;
  priority: number;
  date: IsoDateTimeString;              // data de criação ISO
  date_creation?: IsoDateTimeString;    // alias
  location?: string;
  category?: string;
  requester?: string;          // legado
  requester_name?: string;     // novo cqrs
  time_elapsed?: string;
}

export interface KanbanLastTicket {
  id: number;
  title: string;
  solvedate?: IsoDateTimeString;
  location?: string;
}

export interface KanbanAvailableResource {
  id: number;
  name: string;
  location?: string;
  is_offline: boolean;
  offline_reason?: string;
  expected_return?: string;
  business_start?: string;
  business_end?: string;
  lastTicket?: KanbanLastTicket;
  schedule?: OperationSettings;
}

export interface ChargerInTicket {
  id: number;
  name: string;
  assigned_date?: IsoDateTimeString;
  service_time_minutes?: number;
  schedule?: OperationSettings;
}

export interface KanbanAllocatedResource {
  ticket_id: number;
  title: string;
  date?: IsoDateTimeString;               // data de abertura do ticket
  status?: number;             // status GLPI (1-4 para ativos)
  category?: string;
  location?: string;
  time_elapsed?: string;
  requester_name?: string;
  chargers: ChargerInTicket[];
}

export interface AvailableChargerBrief {
  id: number;
  name: string;
  is_offline: boolean;
  is_within_schedule?: boolean;
  business_start?: string;
  business_end?: string;
  lastTicket?: {
    id: number;
    title: string;
    solvedate?: IsoDateTimeString;
    location?: string;
  };
}

export interface TicketDetailResponse {
  id: number;
  name: string;
  content?: string;
  date?: IsoDateTimeString;
  status: number;
  priority: number;
  location?: string;
  category?: string;
  requester_name?: string;
  chargers: ChargerInTicket[];
  available_chargers: AvailableChargerBrief[];
}

export interface KanbanData {
  demands: KanbanDemand[];
  availableResources: KanbanAvailableResource[];
  allocatedResources: KanbanAllocatedResource[];
}

// Resposta completa do backend (pode incluir metadata)
export interface KanbanResponse extends KanbanData {
  context?: string;
  timestamp?: IsoDateTimeString;
}

// --- Ranking Response ---

export interface RankingItem {
  id: number;
  name: string;
  completed_tickets: number;
  average_wait_time: string;
  total_service_minutes?: number;
  last_activity?: IsoDateTimeString;
}

export interface RankingResponse {
  context: string;
  ranking: RankingItem[];
  timestamp?: IsoDateTimeString;
}

// --- Offline Status ---

export interface ChargerOfflineStatus {
  charger_id: number;
  is_offline: boolean;
  reason?: string;
  offline_since?: IsoDateTimeString;
  expected_return?: string;
}
