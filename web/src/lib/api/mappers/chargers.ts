import { asIsoDateTimeString, toIsoDateTimeOrUndefined } from "@/lib/datetime/iso";

import type {
  AvailableChargerBriefDto,
  ChargerInTicketDto,
  ChargerOfflineStatusDto,
  ChargerScheduleReadResponseDto,
  GlobalScheduleResponseDto,
  KanbanAllocatedResourceDto,
  KanbanAvailableResourceDto,
  KanbanDemandDto,
  KanbanLastTicketDto,
  KanbanResponseDto,
  LastTicketBriefDto,
  RankingResponseDto,
  TicketDetailResponseDto,
} from "../contracts/chargers";
import type {
  AvailableChargerBrief,
  Charger,
  ChargerInTicket,
  ChargerOfflineStatus,
  KanbanAllocatedResource,
  KanbanAvailableResource,
  KanbanData,
  KanbanDemand,
  KanbanLastTicket,
  OperationSettings,
  TicketDetailResponse,
} from "@/types/charger";

function mapOperationSettingsDto(dto: ChargerScheduleReadResponseDto): OperationSettings {
  return {
    businessStart: dto.business_start,
    businessEnd: dto.business_end,
    workOnWeekends: dto.work_on_weekends,
  };
}

function mapKanbanLastTicketDto(dto: KanbanLastTicketDto): KanbanLastTicket {
  return {
    id: dto.id,
    title: dto.title,
    solvedate: toIsoDateTimeOrUndefined(dto.solvedate ?? undefined),
    location: dto.location ?? undefined,
  };
}

function mapKanbanDemandDto(dto: KanbanDemandDto): KanbanDemand {
  const dateCreation = asIsoDateTimeString(dto.date_creation);
  return {
    id: dto.id,
    title: dto.name,
    name: dto.name,
    status: dto.status,
    priority: dto.priority,
    date: dateCreation,
    date_creation: dateCreation,
    location: dto.location ?? undefined,
    category: dto.category ?? undefined,
    requester: dto.requester_name ?? undefined,
    requester_name: dto.requester_name ?? undefined,
    time_elapsed: dto.time_elapsed,
  };
}

function mapKanbanAvailableResourceDto(dto: KanbanAvailableResourceDto): KanbanAvailableResource {
  return {
    id: dto.id,
    name: dto.name,
    location: dto.location ?? undefined,
    is_offline: dto.is_offline,
    offline_reason: dto.offline_reason ?? undefined,
    expected_return: dto.expected_return ?? undefined,
    business_start: dto.business_start ?? "08:00",
    business_end: dto.business_end ?? "18:00",
    lastTicket: dto.lastTicket ? mapKanbanLastTicketDto(dto.lastTicket) : undefined,
    schedule: mapOperationSettingsDto({
      business_start: dto.business_start ?? "08:00",
      business_end: dto.business_end ?? "18:00",
      work_on_weekends: false,
    }),
  };
}

function mapChargerInTicketDto(dto: ChargerInTicketDto): ChargerInTicket {
  return {
    id: dto.id,
    name: dto.name,
    assigned_date: toIsoDateTimeOrUndefined(dto.assigned_date ?? undefined),
    service_time_minutes: dto.service_time_minutes,
    schedule: dto.schedule ? mapOperationSettingsDto(dto.schedule) : undefined,
  };
}

function mapKanbanAllocatedResourceDto(dto: KanbanAllocatedResourceDto): KanbanAllocatedResource {
  return {
    ticket_id: dto.ticket_id,
    title: dto.title,
    date: toIsoDateTimeOrUndefined(dto.date ?? undefined),
    status: dto.status,
    category: dto.category ?? undefined,
    location: dto.location ?? undefined,
    time_elapsed: dto.time_elapsed,
    requester_name: dto.requester_name ?? undefined,
    chargers: dto.chargers.map(mapChargerInTicketDto),
  };
}

function mapLastTicketBriefDto(dto: LastTicketBriefDto) {
  return {
    id: dto.id,
    title: dto.title,
    solvedate: toIsoDateTimeOrUndefined(dto.solvedate ?? undefined),
    location: dto.location ?? undefined,
  };
}

function mapAvailableChargerBriefDto(dto: AvailableChargerBriefDto): AvailableChargerBrief {
  return {
    id: dto.id,
    name: dto.name,
    is_offline: dto.is_offline,
    is_within_schedule: dto.is_within_schedule,
    business_start: dto.business_start ?? undefined,
    business_end: dto.business_end ?? undefined,
    lastTicket: dto.lastTicket ? mapLastTicketBriefDto(dto.lastTicket) : undefined,
  };
}

export function mapGlobalScheduleResponseDto(dto: GlobalScheduleResponseDto): OperationSettings {
  return mapOperationSettingsDto(dto);
}

export function mapChargerScheduleResponseDto(dto: ChargerScheduleReadResponseDto): OperationSettings {
  return mapOperationSettingsDto(dto);
}

export function mapChargerOfflineStatusDto(dto: ChargerOfflineStatusDto, chargerId: number): ChargerOfflineStatus {
  return {
    charger_id: chargerId,
    is_offline: dto.is_offline,
    reason: dto.reason ?? undefined,
    offline_since: undefined,
    expected_return: dto.expected_return ?? undefined,
  };
}

export function mapKanbanResponseDto(dto: KanbanResponseDto): KanbanData {
  return {
    demands: dto.demands.map(mapKanbanDemandDto),
    availableResources: dto.availableResources.map(mapKanbanAvailableResourceDto),
    allocatedResources: dto.allocatedResources.map(mapKanbanAllocatedResourceDto),
  };
}

export function mapRankingResponseToChargers(dto: RankingResponseDto): Charger[] {
  return dto.ranking.map((item) => ({
    id: item.id,
    name: item.name,
    is_deleted: false,
    totalTicketsInPeriod: item.completed_tickets || 0,
    totalServiceMinutes: item.total_service_minutes || 0,
    lastTicket: item.last_activity
      ? {
          id: 0,
          title: "",
          solvedate: asIsoDateTimeString(item.last_activity),
        }
      : undefined,
  }));
}

export function mapTicketDetailResponseDto(dto: TicketDetailResponseDto): TicketDetailResponse {
  return {
    id: dto.id,
    name: dto.name,
    content: dto.content ?? undefined,
    date: toIsoDateTimeOrUndefined(dto.date ?? undefined),
    status: dto.status,
    priority: dto.priority,
    location: dto.location ?? undefined,
    category: dto.category ?? undefined,
    requester_name: dto.requester_name ?? undefined,
    chargers: dto.chargers.map(mapChargerInTicketDto),
    available_chargers: dto.available_chargers.map(mapAvailableChargerBriefDto),
  };
}
