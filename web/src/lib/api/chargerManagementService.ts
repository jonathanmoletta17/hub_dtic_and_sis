import { useAuthStore } from "@/store/useAuthStore";
import { request } from "./httpClient";
import { resolveRootContext, withQuery } from "./client";

export type ChargerStatus = "active" | "inactive" | "maintenance";

export interface ChargerV2 {
  id: number;
  name: string;
  department: string;
  status: ChargerStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ChargerReportItemV2 {
  charger_id: number;
  charger_name: string;
  charger_status: ChargerStatus;
  ticket_count: number;
  planned_minutes: number;
  acting_minutes: number;
  idle_minutes: number;
}

export interface ChargerReportResponseV2 {
  start_at: string;
  end_at: string;
  assignment_status: "planned" | "active" | "completed" | "canceled" | null;
  charger_id: number | null;
  data: ChargerReportItemV2[];
}

function buildBasePath(context: string): string {
  return `/api/v2/${resolveRootContext(context)}/charger-management`;
}

function actorHeaders(context: string): Record<string, string> {
  const state = useAuthStore.getState();
  const activeRole = state.getActiveHubRoleForContext(context)?.role || "gestor";
  const userId = String(state.currentUserRole?.user_id || 0);
  return {
    "X-GLPI-User-Id": userId,
    "X-GLPI-Role": activeRole,
  };
}

export function listChargersV2(context: string): Promise<ChargerV2[]> {
  return request<ChargerV2[]>(`${buildBasePath(context)}/chargers`, {
    headers: actorHeaders(context),
  });
}

export function createChargerV2(
  context: string,
  payload: { name: string; department: string }
): Promise<ChargerV2> {
  return request<ChargerV2>(`${buildBasePath(context)}/chargers`, {
    method: "POST",
    headers: actorHeaders(context),
    body: JSON.stringify(payload),
  });
}

export function inactivateChargerV2(
  context: string,
  chargerId: number,
  payload: {
    reason_code: "vacation" | "medical_leave" | "equipment_maintenance" | "training" | "administrative" | "other";
    reason_text?: string | null;
    inactivated_at: string;
    expected_return_at?: string | null;
  }
): Promise<unknown> {
  return request(`${buildBasePath(context)}/chargers/${chargerId}/inactivation`, {
    method: "POST",
    headers: actorHeaders(context),
    body: JSON.stringify(payload),
  });
}

export function reactivateChargerV2(context: string, chargerId: number): Promise<ChargerV2> {
  return request<ChargerV2>(`${buildBasePath(context)}/chargers/${chargerId}/reactivation`, {
    method: "POST",
    headers: actorHeaders(context),
  });
}

export function fetchChargerReportV2(
  context: string,
  params: {
    start_at: string;
    end_at: string;
    assignment_status?: "planned" | "active" | "completed" | "canceled";
    charger_id?: number;
  }
): Promise<ChargerReportResponseV2> {
  const path = withQuery(`${buildBasePath(context)}/reports`, params);
  return request<ChargerReportResponseV2>(path, {
    headers: actorHeaders(context),
  });
}
