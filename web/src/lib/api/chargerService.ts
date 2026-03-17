/**
 * chargerService — API layer para Gestão de Carregadores.
 * Consome o httpClient centralizado.
 */
import type {
  KanbanData,
  Charger,
  OperationSettings,
  ChargerOfflineStatus,
  TicketDetailResponse,
} from "../../types/charger";
import { apiDelete, apiGet, apiPost, apiPut, buildApiPath } from './client';
import { useAuthStore } from '@/store/useAuthStore';
import type {
  ChargerOfflineStatusDto,
  ChargerScheduleReadResponseDto,
  GlobalScheduleResponseDto,
  KanbanResponseDto,
  RankingResponseDto,
  TicketDetailResponseDto,
} from "./contracts/chargers";
import {
  mapChargerOfflineStatusDto,
  mapChargerScheduleResponseDto,
  mapGlobalScheduleResponseDto,
  mapKanbanResponseDto,
  mapRankingResponseToChargers,
  mapTicketDetailResponseDto,
} from "./mappers/chargers";

export interface ChargerBatchActionUpdate {
  success: boolean;
  message?: string;
  action?: string;
}

export interface ChargerBatchActionResult {
  charger_id: number;
  updates: ChargerBatchActionUpdate[];
}

export interface ChargerBatchActionResponse {
  success: boolean;
  message?: string;
  results?: ChargerBatchActionResult[];
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}





export const fetchKanbanData = (context: string): Promise<KanbanData> =>
  apiGet<KanbanResponseDto>(buildApiPath(context, "chargers/kanban"))
    .then(mapKanbanResponseDto);

export const fetchChargers = async (
  context: string,
  startDate?: string,
  endDate?: string
): Promise<Charger[]> => {
  const response = await apiGet<RankingResponseDto>(
    buildApiPath(context, "metrics/chargers"),
    {
      start_date: startDate,
      end_date: endDate,
    },
  );
  return mapRankingResponseToChargers(response);
};

export const fetchGlobalSchedule = async (
  context: string
): Promise<OperationSettings> =>
  apiGet<GlobalScheduleResponseDto>(buildApiPath(context, "chargers/global-schedule"))
    .then(mapGlobalScheduleResponseDto);

export const fetchChargerSchedule = async (
  context: string,
  id: number
): Promise<OperationSettings> =>
  apiGet<ChargerScheduleReadResponseDto>(buildApiPath(context, `chargers/${id}/schedule`))
    .then(mapChargerScheduleResponseDto);

export const fetchChargerOfflineStatus = (
  context: string,
  id: number
): Promise<ChargerOfflineStatus> =>
  apiGet<ChargerOfflineStatusDto>(buildApiPath(context, `chargers/${id}/offline`))
    .then((dto) => mapChargerOfflineStatusDto(dto, id));

// ─── WRITE ───

export const updateGlobalSchedule = (
  context: string,
  settings: OperationSettings
): Promise<boolean> =>
  apiPut(buildApiPath(context, "chargers/global-schedule"), {
    business_start: settings.businessStart,
    business_end: settings.businessEnd,
    work_on_weekends: settings.workOnWeekends,
  }).then(() => true);

export const updateChargerSchedule = (
  context: string,
  id: number,
  settings: OperationSettings
): Promise<boolean> =>
  apiPut(buildApiPath(context, `chargers/${id}/schedule`), {
    business_start: settings.businessStart,
    business_end: settings.businessEnd,
    work_on_weekends: settings.workOnWeekends,
  }).then(() => true);

export const toggleChargerOffline = (
  context: string,
  id: number,
  isOffline: boolean,
  reason?: string,
  expectedReturn?: string
): Promise<boolean> =>
  apiPut(buildApiPath(context, `chargers/${id}/offline`), {
    is_offline: isOffline,
    reason: reason || null,
    expected_return: expectedReturn || null,
  }).then(() => true);

export const assignChargerToTicket = async (context: string, ticketId: number, chargerId: number): Promise<boolean> => {
  await apiPost(buildApiPath(context, `chargers/${chargerId}/assign/${ticketId}`));
  return true;
};

export const assignMultipleChargersToTicket = async (context: string, ticketId: number, chargerIds: number[]): Promise<boolean> => {
  try {
    const authState = useAuthStore.getState();
    const isTech =
      (authState.getOperationalViewForContext(context) ?? authState.activeView) === 'tech';
    const hasTechRole = authState.currentUserRole?.hub_roles.some(r => r.role.includes('tecnico') || r.role.includes('gestor'));

    if (!isTech && !hasTechRole) {
      console.error("ERRO DE PERMISSÃO GLPI: Usuário não tem privilégios para executar atribuições múltiplas.");
      throw new Error("Você não tem permissão para executar essa ação.");
    }

    console.log(`[assignMultipleChargersToTicket] Iniciando atribuição múltipla para o ticket ${ticketId}`, { chargerIds });

    await apiPost(buildApiPath(context, `chargers/tickets/${ticketId}/assign-multiple`), { charger_ids: chargerIds });

    console.log(`[assignMultipleChargersToTicket] Atribuição múltipla concluída com sucesso para o ticket ${ticketId}`);
    return true;
  } catch (error) {
    console.error("ERRO [assignMultipleChargersToTicket]: Falha ao tentar atribuir carregadores.", error);
    // Se o backend retorna 400 ou 500, o helper "request" já extrai a mensagem de texto ou body.detail
    const errorMessage = getErrorMessage(error, "Ocorreu um erro interno no servidor ao tentar concluir a operação.");
    throw new Error(errorMessage);
  }
};

export const unassignChargerFromTicket = async (
  context: string,
  ticketId: number,
  chargerId: number
): Promise<boolean> => {
  await apiDelete(buildApiPath(context, `chargers/${chargerId}/assign/${ticketId}`));
  return true;
};

export const getTicketDetail = (
  context: string,
  ticketId: number
): Promise<TicketDetailResponse> =>
  apiGet<TicketDetailResponseDto>(buildApiPath(context, `chargers/tickets/${ticketId}/detail`))
    .then(mapTicketDetailResponseDto);

export const createCharger = (
  context: string,
  name: string,
  locationId: number = 0
): Promise<boolean> =>
  apiPost(buildApiPath(context, "chargers"), { name, locations_id: locationId })
    .then(() => true);

export const updateCharger = (
  context: string,
  chargerId: number,
  name: string,
  locationId: number = 0
): Promise<boolean> =>
  apiPut(buildApiPath(context, `chargers/${chargerId}`), { name, locations_id: locationId })
    .then(() => true);

export const deleteCharger = (
  context: string,
  chargerId: number
): Promise<boolean> =>
  apiDelete(buildApiPath(context, `chargers/${chargerId}`))
    .then(() => true);

export const reactivateCharger = (
  context: string,
  chargerId: number
): Promise<boolean> =>
  apiPost(buildApiPath(context, `chargers/${chargerId}/reactivate`))
    .then(() => true);

export const batchUpdateChargers = (
  context: string,
  payload: {
    charger_ids: number[];
    update_schedule?: boolean;
    schedule?: {
      businessStart: string;
      businessEnd: string;
      workOnWeekends: boolean;
    };
    update_offline?: boolean;
    offline?: {
      is_offline: boolean;
      reason?: string | null;
      expected_return?: string | null;
    };
  }
): Promise<ChargerBatchActionResponse> => {
  return apiPost<ChargerBatchActionResponse>(buildApiPath(context, "chargers/batch-action"), {
      charger_ids: payload.charger_ids,
      update_schedule: payload.update_schedule,
      schedule: payload.schedule ? {
        business_start: payload.schedule.businessStart,
        business_end: payload.schedule.businessEnd,
        work_on_weekends: payload.schedule.workOnWeekends
      } : undefined,
      update_offline: payload.update_offline,
      offline: payload.offline ? {
        is_offline: payload.offline.is_offline,
        reason: payload.offline.reason,
        expected_return: payload.offline.expected_return
      } : undefined
    }).catch((e) => {
    console.error("API Error batch updating chargers:", e);
    throw e;
  });
};
