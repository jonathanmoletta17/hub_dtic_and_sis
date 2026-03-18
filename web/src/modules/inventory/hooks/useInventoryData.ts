"use client";

import { useMemo } from "react";
import useSWR from "swr";

import {
  fetchInventoryAssetDetail,
  fetchInventoryAssets,
  fetchInventorySummary,
} from "@/lib/api/inventoryService";
import type { InventoryFilters, InventoryItemType } from "@/lib/api/models/inventory";

interface DetailTarget {
  itemtype: InventoryItemType;
  assetId: number;
}

function stableFilters(filters: InventoryFilters): InventoryFilters {
  return {
    ...filters,
    itemtypes: [...filters.itemtypes],
    statesId: [...filters.statesId],
    locationsId: [...filters.locationsId],
    groupsId: [...filters.groupsId],
  };
}

export function useInventoryData(
  context: string,
  filters: InventoryFilters,
  detailTarget: DetailTarget | null,
) {
  const normalizedFilters = useMemo(() => stableFilters(filters), [filters]);
  const filtersKey = useMemo(() => JSON.stringify(normalizedFilters), [normalizedFilters]);

  const summary = useSWR(
    context ? `inventory-summary-${context}-${filtersKey}` : null,
    () => fetchInventorySummary(context, normalizedFilters),
    { keepPreviousData: true },
  );

  const assets = useSWR(
    context ? `inventory-assets-${context}-${filtersKey}` : null,
    () => fetchInventoryAssets(context, normalizedFilters),
    { keepPreviousData: true },
  );

  const detail = useSWR(
    context && detailTarget
      ? `inventory-detail-${context}-${detailTarget.itemtype}-${detailTarget.assetId}`
      : null,
    () => fetchInventoryAssetDetail(context, detailTarget!.itemtype, detailTarget!.assetId),
    { keepPreviousData: true },
  );

  const refreshAll = async () => {
    await Promise.all([
      summary.mutate(),
      assets.mutate(),
      detailTarget ? detail.mutate() : Promise.resolve(undefined),
    ]);
  };

  return {
    summary: summary.data ?? null,
    assets: assets.data ?? null,
    detail: detail.data ?? null,
    loading: (!summary.data && summary.isLoading) || (!assets.data && assets.isLoading),
    summaryLoading: summary.isLoading,
    assetsLoading: assets.isLoading,
    detailLoading: detail.isLoading,
    error: summary.error || assets.error || detail.error || null,
    mutateSummary: summary.mutate,
    mutateAssets: assets.mutate,
    mutateDetail: detail.mutate,
    refreshAll,
  };
}
