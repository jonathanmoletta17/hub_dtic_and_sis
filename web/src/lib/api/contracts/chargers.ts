import type { IsoDateTimeString } from "@/lib/datetime/iso";

export interface ChargerScheduleReadResponseDto {
  business_start: string;
  business_end: string;
  work_on_weekends: boolean;
}

export interface GlobalScheduleResponseDto extends ChargerScheduleReadResponseDto {
  id: number;
  updated_at: IsoDateTimeString;
}

export interface ChargerOfflineStatusDto {
  is_offline: boolean;
  reason?: string | null;
  expected_return?: string | null;
}

export interface KanbanLastTicketDto {
  id: number;
  title: string;
  solvedate?: IsoDateTimeString | null;
  location?: string | null;
}

export interface KanbanDemandDto {
  id: number;
  name: string;
  status: number;
  priority: number;
  date_creation: IsoDateTimeString;
  location?: string | null;
  category?: string | null;
  requester_name?: string | null;
  time_elapsed?: string;
}

export interface KanbanAvailableResourceDto {
  id: number;
  name: string;
  location?: string | null;
  is_offline: boolean;
  offline_reason?: string | null;
  expected_return?: string | null;
  business_start?: string;
  business_end?: string;
  lastTicket?: KanbanLastTicketDto | null;
}

export interface ChargerInTicketDto {
  id: number;
  name: string;
  assigned_date?: IsoDateTimeString | null;
  service_time_minutes?: number;
  schedule?: ChargerScheduleReadResponseDto | null;
}

export interface KanbanAllocatedResourceDto {
  ticket_id: number;
  title: string;
  date?: IsoDateTimeString | null;
  status?: number;
  category?: string | null;
  location?: string | null;
  time_elapsed?: string;
  requester_name?: string | null;
  chargers: ChargerInTicketDto[];
}

export interface KanbanResponseDto {
  context: string;
  demands: KanbanDemandDto[];
  availableResources: KanbanAvailableResourceDto[];
  allocatedResources: KanbanAllocatedResourceDto[];
  timestamp?: IsoDateTimeString;
}

export interface RankingItemDto {
  id: number;
  name: string;
  completed_tickets: number;
  average_wait_time: string;
  total_service_minutes?: number;
  last_activity?: IsoDateTimeString | null;
}

export interface RankingResponseDto {
  context: string;
  ranking: RankingItemDto[];
  timestamp?: IsoDateTimeString;
}

export interface LastTicketBriefDto {
  id: number;
  title: string;
  solvedate?: IsoDateTimeString | null;
  location?: string | null;
}

export interface AvailableChargerBriefDto {
  id: number;
  name: string;
  is_offline: boolean;
  is_within_schedule?: boolean;
  business_start?: string;
  business_end?: string;
  lastTicket?: LastTicketBriefDto | null;
}

export interface TicketDetailResponseDto {
  id: number;
  name: string;
  content?: string | null;
  date?: IsoDateTimeString | null;
  status: number;
  priority: number;
  location?: string | null;
  category?: string | null;
  requester_name?: string | null;
  chargers: ChargerInTicketDto[];
  available_chargers: AvailableChargerBriefDto[];
}
