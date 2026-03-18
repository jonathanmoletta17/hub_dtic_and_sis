import { toIsoDateTimeOrNull } from "@/lib/datetime/iso";

import type {
  InventoryAssetDetailResponseDto,
  InventoryAssetDto,
  InventoryAssetListResponseDto,
  InventoryConnectionEntryDto,
  InventoryDiskEntryDto,
  InventoryLogEntryDto,
  InventoryMutationResponseDto,
  InventoryNetworkPortEntryDto,
  InventorySoftwareInstallationEntryDto,
  InventorySummaryResponseDto,
} from "../contracts/inventory";
import type {
  InventoryAsset,
  InventoryAssetDetail,
  InventoryAssetListResult,
  InventoryConnectionEntry,
  InventoryDiskEntry,
  InventoryLogEntry,
  InventoryMutationResult,
  InventoryNetworkPortEntry,
  InventorySoftwareInstallationEntry,
  InventorySummary,
} from "../models/inventory";

function mapInventoryAssetDto(dto: InventoryAssetDto): InventoryAsset {
  return {
    itemtype: dto.itemtype,
    id: dto.id,
    name: dto.name,
    serial: dto.serial ?? null,
    assetTag: dto.asset_tag ?? null,
    stateId: dto.state_id ?? null,
    stateName: dto.state_name ?? null,
    locationId: dto.location_id ?? null,
    locationName: dto.location_name ?? null,
    responsibleUserId: dto.responsible_user_id ?? null,
    responsibleUserName: dto.responsible_user_name ?? null,
    responsibleGroupId: dto.responsible_group_id ?? null,
    responsibleGroupName: dto.responsible_group_name ?? null,
    techUserId: dto.tech_user_id ?? null,
    techUserName: dto.tech_user_name ?? null,
    techGroupId: dto.tech_group_id ?? null,
    techGroupName: dto.tech_group_name ?? null,
    manufacturerId: dto.manufacturer_id ?? null,
    manufacturerName: dto.manufacturer_name ?? null,
    modelId: dto.model_id ?? null,
    modelName: dto.model_name ?? null,
    isDynamic: dto.is_dynamic,
    dateMod: toIsoDateTimeOrNull(dto.date_mod),
    lastInventoryUpdate: toIsoDateTimeOrNull(dto.last_inventory_update),
    inventoryStale: dto.inventory_stale,
    links: dto.links,
  };
}

function mapLogEntryDto(dto: InventoryLogEntryDto): InventoryLogEntry {
  return {
    id: dto.id,
    action: dto.action,
    userName: dto.user_name ?? null,
    dateMod: toIsoDateTimeOrNull(dto.date_mod),
    oldValue: dto.old_value ?? null,
    newValue: dto.new_value ?? null,
  };
}

function mapDiskEntryDto(dto: InventoryDiskEntryDto): InventoryDiskEntry {
  return {
    id: dto.id,
    name: dto.name ?? null,
    device: dto.device ?? null,
    mountpoint: dto.mountpoint ?? null,
    totalSize: dto.total_size ?? null,
    freeSize: dto.free_size ?? null,
    isDynamic: dto.is_dynamic,
    dateMod: toIsoDateTimeOrNull(dto.date_mod),
  };
}

function mapNetworkPortEntryDto(dto: InventoryNetworkPortEntryDto): InventoryNetworkPortEntry {
  return {
    id: dto.id,
    name: dto.name ?? null,
    mac: dto.mac ?? null,
    ifdescr: dto.ifdescr ?? null,
    ifalias: dto.ifalias ?? null,
    ifspeed: dto.ifspeed ?? null,
    ifstatus: dto.ifstatus ?? null,
    ifconnectionstatus: dto.ifconnectionstatus ?? null,
    lastup: toIsoDateTimeOrNull(dto.lastup),
    dateMod: toIsoDateTimeOrNull(dto.date_mod),
  };
}

function mapSoftwareInstallationEntryDto(
  dto: InventorySoftwareInstallationEntryDto,
): InventorySoftwareInstallationEntry {
  return {
    id: dto.id,
    softwareId: dto.software_id ?? null,
    softwareName: dto.software_name ?? null,
    versionId: dto.version_id ?? null,
    versionName: dto.version_name ?? null,
    arch: dto.arch ?? null,
    dateInstall: toIsoDateTimeOrNull(dto.date_install),
    isDynamic: dto.is_dynamic,
  };
}

function mapConnectionEntryDto(dto: InventoryConnectionEntryDto): InventoryConnectionEntry {
  return {
    itemtype: dto.itemtype,
    id: dto.id,
    name: dto.name ?? null,
    serial: dto.serial ?? null,
    assetTag: dto.asset_tag ?? null,
  };
}

export function mapInventorySummaryResponseDto(dto: InventorySummaryResponseDto): InventorySummary {
  return {
    context: dto.context,
    totalAssets: dto.total_assets ?? 0,
    totalsByItemtype: (dto.totals_by_itemtype || []).map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      total: bucket.total ?? 0,
    })),
    totalsByState: (dto.totals_by_state || []).map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      total: bucket.total ?? 0,
    })),
    missingOwner: dto.missing_owner ?? 0,
    missingLocation: dto.missing_location ?? 0,
    missingTechGroup: dto.missing_tech_group ?? 0,
    staleInventory: dto.stale_inventory ?? 0,
  };
}

export function mapInventoryAssetListResponseDto(dto: InventoryAssetListResponseDto): InventoryAssetListResult {
  return {
    context: dto.context,
    total: dto.total ?? 0,
    limit: dto.limit ?? 50,
    offset: dto.offset ?? 0,
    sort: dto.sort,
    order: dto.order,
    data: (dto.data || []).map(mapInventoryAssetDto),
  };
}

export function mapInventoryAssetDetailResponseDto(dto: InventoryAssetDetailResponseDto): InventoryAssetDetail {
  return {
    context: dto.context,
    asset: mapInventoryAssetDto(dto.asset),
    logs: (dto.logs || []).map(mapLogEntryDto),
    disks: (dto.disks || []).map(mapDiskEntryDto),
    networkPorts: (dto.network_ports || []).map(mapNetworkPortEntryDto),
    softwareInstallations: (dto.software_installations || []).map(mapSoftwareInstallationEntryDto),
    connections: (dto.connections || []).map(mapConnectionEntryDto),
  };
}

export function mapInventoryMutationResponseDto(dto: InventoryMutationResponseDto): InventoryMutationResult {
  return {
    context: dto.context,
    itemtype: dto.itemtype,
    id: dto.id,
    success: dto.success,
    message: dto.message,
    result: dto.result,
  };
}
