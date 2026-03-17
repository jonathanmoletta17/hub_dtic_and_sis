/**
 * useChargerData — SWR hook para dados da Gestão de Carregadores.
 * Alinhado com useOperationData.ts do projeto legado.
 * 2 SWR keys: kanban + chargers (com período para ranking).
 */
"use client";

import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import type {
  KanbanData,
  Charger,
  OperationDashboardStats,
  OperationSettings,
} from "../types/charger";
import {
  fetchKanbanData,
  fetchChargers,
  fetchGlobalSchedule,
} from "../lib/api/chargerService";

export interface UseOperationDataResult {
  kanbanData: KanbanData;
  chargers: Charger[];
  stats: OperationDashboardStats;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  rankingPeriod: { startDate: string; endDate: string };
  setRankingPeriod: (period: { startDate: string; endDate: string }) => void;
}

export function useChargerData(context: string | undefined, pause: boolean = false): UseOperationDataResult {
  // Período padrão: mês atual
  const now = new Date();
  const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [rankingPeriod, setRankingPeriod] = useState({ startDate: defaultStart, endDate: defaultEnd });

  // SWR 1: Kanban data
  const {
    data: rawKanban,
    error: kanbanError,
    mutate: mutateKanban,
  } = useSWR(
    !pause && context === "sis" ? `chargers-kanban-${context}` : null,
    () => fetchKanbanData(context!),
    { refreshInterval: 15000, keepPreviousData: true }
  );

  // SWR 2: Chargers com métricas (para ranking)
  const {
    data: rawChargers,
    error: chargersError,
    mutate: mutateChargers,
  } = useSWR(
    !pause && context === "sis"
      ? `chargers-list-${context}-${rankingPeriod.startDate}-${rankingPeriod.endDate}`
      : null,
    () => fetchChargers(context!, rankingPeriod.startDate, rankingPeriod.endDate),
    { refreshInterval: 30000, keepPreviousData: true }
  );

  const kanbanData = useMemo<KanbanData>(
    () =>
      rawKanban ?? {
        demands: [],
        availableResources: [],
        allocatedResources: [],
      },
    [rawKanban]
  );
  const chargers = useMemo<Charger[]>(() => rawChargers ?? [], [rawChargers]);
  const error = useMemo(() => {
    const sourceError = kanbanError || chargersError;
    if (!sourceError) return null;
    return sourceError instanceof Error ? sourceError.message : "Falha ao carregar dados de carregadores.";
  }, [chargersError, kanbanError]);

  // Stats derivados (exatamente como o legado)
  const stats = useMemo<OperationDashboardStats>(
    () => ({
      available: kanbanData.availableResources.filter((r) => !r.is_offline).length,
      occupied: kanbanData.allocatedResources.reduce(
        (acc, r) => acc + (r.chargers?.length || 0),
        0
      ),
      offline:
        kanbanData.availableResources.filter((r) => r.is_offline).length +
        chargers.filter((c) => c.is_deleted).length,
      total: chargers.length,
    }),
    [kanbanData, chargers]
  );

  const refresh = useCallback(() => {
    mutateKanban();
    mutateChargers();
  }, [mutateKanban, mutateChargers]);

  return {
    kanbanData,
    chargers,
    stats,
    loading: !rawKanban && !kanbanError && !chargersError,
    error,
    refresh,
    rankingPeriod,
    setRankingPeriod,
  };
}

/**
 * Hook para as configurações globais de expediente.
 * Busca do backend e persiste via PUT.
 */
export function useOperationSettings(context: string | undefined, pause: boolean = false) {
  const { data, mutate: mutateSettings } = useSWR(
    !pause && context === "sis" ? `chargers-global-schedule-${context}` : null,
    () => fetchGlobalSchedule(context!),
    { revalidateOnFocus: true }
  );

  const settings: OperationSettings = useMemo(() => {
    if (!data) {
      return {
        businessStart: "08:00",
        businessEnd: "18:00",
        workOnWeekends: false,
      };
    }
    return data;
  }, [data]);

  return { settings, mutateSettings };
}
