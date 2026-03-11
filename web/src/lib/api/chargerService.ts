/**
 * chargerService — API layer para Gestão de Carregadores.
 * Consome o httpClient centralizado.
 */
import type {
  KanbanData,
  Charger,
  OperationSettings,
  ChargerOfflineStatus,
  RankingResponse,
  RankingItem,
} from "../../types/charger";
import { request } from './httpClient';
import { useAuthStore } from '@/store/useAuthStore';





export const fetchKanbanData = (context: string): Promise<KanbanData> =>
  request<KanbanData>(`/api/v1/${context}/chargers/kanban`);

export const fetchChargers = async (
  context: string,
  startDate?: string,
  endDate?: string
): Promise<Charger[]> => {
  const qs = new URLSearchParams();
  if (startDate) qs.set("start_date", startDate);
  if (endDate) qs.set("end_date", endDate);

  try {
    const response = await request<RankingResponse | Charger[]>(
      `/api/v1/${context}/metrics/chargers?${qs.toString()}`
    );

    // O backend pode retornar o wrapper RankingResponse ou o Array nativo
    const items: (RankingItem | Charger)[] = 
      Array.isArray(response) ? response : (response.ranking || []);
    
    return items.map((r) => {
      // Se já vier no formato Charger, apenas preservamos
      if ("totalTicketsInPeriod" in r) {
        return r as Charger;
      }

      // Senão, transformamos RankingItem em Charger compatível com UI
      const rankingItem = r as RankingItem;
      return {
        id: rankingItem.id,
        name: rankingItem.name,
        is_deleted: false,
        totalTicketsInPeriod: rankingItem.completed_tickets || 0,
        totalServiceMinutes: rankingItem.total_service_minutes || 0,
        lastTicket: rankingItem.last_activity 
          ? { id: 0, title: "", solvedate: rankingItem.last_activity } 
          : undefined,
      };
    });
  } catch (error) {
    console.error("Silenced API error fetching chargers:", error);
    return [];
  }
};

export const fetchGlobalSchedule = async (
  context: string
): Promise<OperationSettings> => {
  const raw = await request<{
    business_start: string;
    business_end: string;
    work_on_weekends: boolean;
  }>(`/api/v1/${context}/chargers/global-schedule`);

  return {
    businessStart: raw.business_start,
    businessEnd: raw.business_end,
    workOnWeekends: raw.work_on_weekends,
  };
};

export const fetchChargerSchedule = async (
  context: string,
  id: number
): Promise<OperationSettings> => {
  const raw = await request<{
    business_start: string;
    business_end: string;
    work_on_weekends: boolean;
  }>(`/api/v1/${context}/chargers/${id}/schedule`);

  return {
    businessStart: raw.business_start,
    businessEnd: raw.business_end,
    workOnWeekends: raw.work_on_weekends,
  };
};

export const fetchChargerOfflineStatus = (
  context: string,
  id: number
): Promise<ChargerOfflineStatus> =>
  request<ChargerOfflineStatus>(`/api/v1/${context}/chargers/${id}/offline`);

// ─── WRITE ───

export const updateGlobalSchedule = (
  context: string,
  settings: OperationSettings
): Promise<boolean> =>
  request(`/api/v1/${context}/chargers/global-schedule`, {
    method: "PUT",
    body: JSON.stringify({
      business_start: settings.businessStart,
      business_end: settings.businessEnd,
      work_on_weekends: settings.workOnWeekends,
    }),
  }).then(() => true);

export const updateChargerSchedule = (
  context: string,
  id: number,
  settings: OperationSettings
): Promise<boolean> =>
  request(`/api/v1/${context}/chargers/${id}/schedule`, {
    method: "PUT",
    body: JSON.stringify({
      business_start: settings.businessStart,
      business_end: settings.businessEnd,
      work_on_weekends: settings.workOnWeekends,
    }),
  }).then(() => true);

export const toggleChargerOffline = (
  context: string,
  id: number,
  isOffline: boolean,
  reason?: string,
  expectedReturn?: string
): Promise<boolean> =>
  request(`/api/v1/${context}/chargers/${id}/offline`, {
    method: "PUT",
    body: JSON.stringify({
      is_offline: isOffline,
      reason: reason || null,
      expected_return: expectedReturn || null,
    }),
  }).then(() => true);

export const assignChargerToTicket = async (context: string, ticketId: number, chargerId: number): Promise<boolean> => {
  try {
    await request(`/api/v1/${context}/chargers/${chargerId}/assign/${ticketId}`, {
      method: "POST"
    });
    return true;
  } catch (error) {
    console.error("Error error assigning charger:", error);
    return false;
  }
};

export const assignMultipleChargersToTicket = async (context: string, ticketId: number, chargerIds: number[]): Promise<boolean> => {
  try {
    const authState = useAuthStore.getState();
    const isTech = authState.activeView === 'tech';
    const hasTechRole = authState.currentUserRole?.hub_roles.some(r => r.role.includes('tecnico') || r.role.includes('gestor'));

    if (!isTech && !hasTechRole) {
      console.error("ERRO DE PERMISSÃO GLPI: Usuário não tem privilégios para executar atribuições múltiplas.");
      throw new Error("Você não tem permissão para executar essa ação.");
    }

    console.log(`[assignMultipleChargersToTicket] Iniciando atribuição múltipla para o ticket ${ticketId}`, { chargerIds });

    await request(`/api/v1/${context}/chargers/tickets/${ticketId}/assign-multiple`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ charger_ids: chargerIds })
    });

    console.log(`[assignMultipleChargersToTicket] Atribuição múltipla concluída com sucesso para o ticket ${ticketId}`);
    return true;
  } catch (error: any) {
    console.error("ERRO [assignMultipleChargersToTicket]: Falha ao tentar atribuir carregadores.", error);
    // Se o backend retorna 400 ou 500, o helper "request" já extrai a mensagem de texto ou body.detail
    const errorMessage = error.message || "Ocorreu um erro interno no servidor ao tentar concluir a operação.";
    throw new Error(errorMessage);
  }
};

export const unassignChargerFromTicket = async (
  context: string,
  ticketId: number,
  chargerId: number
): Promise<boolean> => {
  await request(`/api/v1/${context}/chargers/${chargerId}/assign/${ticketId}`, {
    method: "DELETE",
  });
  return true;
};

export const getTicketDetail = (
  context: string,
  ticketId: number
) =>
  request(`/api/v1/${context}/chargers/tickets/${ticketId}/detail`);

export const createCharger = (
  context: string,
  name: string,
  locationId: number = 0
): Promise<boolean> =>
  request(`/api/v1/${context}/chargers`, {
    method: "POST",
    body: JSON.stringify({ name, locations_id: locationId }),
  }).then(() => true).catch((e) => { console.error("API Error creating charger:", e); return false; });

export const updateCharger = (
  context: string,
  chargerId: number,
  name: string,
  locationId: number = 0
): Promise<boolean> =>
  request(`/api/v1/${context}/chargers/${chargerId}`, {
    method: "PUT",
    body: JSON.stringify({ name, locations_id: locationId }),
  }).then(() => true).catch((e) => { console.error("API Error updating charger:", e); return false; });

export const deleteCharger = (
  context: string,
  chargerId: number
): Promise<boolean> =>
  request(`/api/v1/${context}/chargers/${chargerId}`, {
    method: "DELETE",
  }).then(() => true).catch((e) => { console.error("API Error deleting charger:", e); return false; });

export const reactivateCharger = (
  context: string,
  chargerId: number
): Promise<boolean> =>
  request(`/api/v1/${context}/chargers/${chargerId}/reactivate`, {
    method: "POST",
  }).then(() => true).catch((e) => { console.error("API Error reactivating charger:", e); return false; });

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
): Promise<boolean> =>
  request(`/api/v1/${context}/chargers/batch-action`, {
    method: "POST",
    body: JSON.stringify({
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
    }),
  }).then(() => true).catch((e) => { console.error("API Error batch updating chargers:", e); return false; });
