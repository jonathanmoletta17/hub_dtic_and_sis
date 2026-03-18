import { useAuthStore } from "@/store/useAuthStore";
import { publishLiveDataEvent } from "@/lib/realtime/liveDataBus";

import { apiDelete, apiGet, apiPost, apiPut, buildApiPath, withQuery } from "./client";
import { API_BASE, ApiError, normalizeApiPath } from "./httpClient";
import type {
  InventoryAssetDetailResponseDto,
  InventoryAssetListResponseDto,
  InventoryMutationResponseDto,
  InventorySummaryResponseDto,
} from "./contracts/inventory";
import {
  mapInventoryAssetDetailResponseDto,
  mapInventoryAssetListResponseDto,
  mapInventoryMutationResponseDto,
  mapInventorySummaryResponseDto,
} from "./mappers/inventory";
import type {
  InventoryAssetDetail,
  InventoryAssetListResult,
  InventoryFilters,
  InventoryItemType,
  InventoryMutationResult,
  InventorySummary,
} from "./models/inventory";

export type InventoryMutationPayload = Record<string, unknown>;

function buildInventoryQuery(filters: Partial<InventoryFilters>): Record<string, string | number | boolean | string[] | number[] | undefined> {
  return {
    itemtypes: filters.itemtypes,
    states_id: filters.statesId,
    locations_id: filters.locationsId,
    groups_id: filters.groupsId,
    q: filters.q || undefined,
    only_missing_owner: filters.onlyMissingOwner,
    only_missing_location: filters.onlyMissingLocation,
    only_missing_tech_group: filters.onlyMissingTechGroup,
    only_stale_inventory: filters.onlyStaleInventory,
    limit: filters.limit,
    offset: filters.offset,
    sort: filters.sort,
    order: filters.order,
  };
}

function getAuthHeaders(context: string): Record<string, string> {
  const sessionToken = useAuthStore.getState().getSessionToken(context);
  const activeRole = useAuthStore.getState().getActiveHubRoleForContext(context);
  const headers: Record<string, string> = {};

  if (sessionToken) {
    headers["Session-Token"] = sessionToken;
  }
  if (activeRole?.role) {
    headers["X-Active-Hub-Role"] = activeRole.role;
  }

  return headers;
}

export async function fetchInventorySummary(
  context: string,
  filters: Partial<InventoryFilters> = {},
): Promise<InventorySummary> {
  const dto = await apiGet<InventorySummaryResponseDto>(
    buildApiPath(context, "inventory/summary"),
    buildInventoryQuery(filters),
  );
  return mapInventorySummaryResponseDto(dto);
}

export async function fetchInventoryAssets(
  context: string,
  filters: Partial<InventoryFilters> = {},
): Promise<InventoryAssetListResult> {
  const dto = await apiGet<InventoryAssetListResponseDto>(
    buildApiPath(context, "inventory/assets"),
    buildInventoryQuery(filters),
  );
  return mapInventoryAssetListResponseDto(dto);
}

export async function fetchInventoryAssetDetail(
  context: string,
  itemtype: InventoryItemType,
  assetId: number,
): Promise<InventoryAssetDetail> {
  const dto = await apiGet<InventoryAssetDetailResponseDto>(
    buildApiPath(context, `inventory/assets/${itemtype}/${assetId}`),
  );
  return mapInventoryAssetDetailResponseDto(dto);
}

export async function createInventoryAsset(
  context: string,
  itemtype: InventoryItemType,
  input: InventoryMutationPayload,
): Promise<InventoryMutationResult> {
  const dto = await apiPost<InventoryMutationResponseDto, { input: InventoryMutationPayload }>(
    buildApiPath(context, `inventory/assets/${itemtype}`),
    { input },
  );
  publishLiveDataEvent({
    context,
    domains: ["inventory"],
    source: "mutation",
    reason: "inventory-create",
  });
  return mapInventoryMutationResponseDto(dto);
}

export async function updateInventoryAsset(
  context: string,
  itemtype: InventoryItemType,
  assetId: number,
  input: InventoryMutationPayload,
): Promise<InventoryMutationResult> {
  const dto = await apiPut<InventoryMutationResponseDto, { input: InventoryMutationPayload }>(
    buildApiPath(context, `inventory/assets/${itemtype}/${assetId}`),
    { input },
  );
  publishLiveDataEvent({
    context,
    domains: ["inventory"],
    source: "mutation",
    reason: "inventory-update",
  });
  return mapInventoryMutationResponseDto(dto);
}

export async function deleteInventoryAsset(
  context: string,
  itemtype: InventoryItemType,
  assetId: number,
): Promise<InventoryMutationResult> {
  const dto = await apiDelete<InventoryMutationResponseDto>(
    buildApiPath(context, `inventory/assets/${itemtype}/${assetId}`),
  );
  publishLiveDataEvent({
    context,
    domains: ["inventory"],
    source: "mutation",
    reason: "inventory-delete",
  });
  return mapInventoryMutationResponseDto(dto);
}

export async function exportInventoryAssetsCsv(
  context: string,
  filters: Partial<InventoryFilters> = {},
): Promise<Blob> {
  const path = withQuery(
    buildApiPath(context, "inventory/assets/export"),
    buildInventoryQuery(filters),
  );
  const response = await fetch(`${API_BASE}${normalizeApiPath(path)}`, {
    headers: getAuthHeaders(context),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new ApiError(body.detail || response.statusText, response.status);
  }

  return response.blob();
}
