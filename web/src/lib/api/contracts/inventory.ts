export type InventoryItemTypeDto =
  | "Computer"
  | "Monitor"
  | "Printer"
  | "NetworkEquipment"
  | "Peripheral"
  | "Phone";

export interface InventoryLinksDto {
  glpi: string;
}

export interface InventoryBucketDto {
  key: string;
  label: string;
  total: number;
}

export interface InventoryAssetDto {
  itemtype: InventoryItemTypeDto;
  id: number;
  name: string;
  serial?: string | null;
  asset_tag?: string | null;
  state_id?: number | null;
  state_name?: string | null;
  location_id?: number | null;
  location_name?: string | null;
  responsible_user_id?: number | null;
  responsible_user_name?: string | null;
  responsible_group_id?: number | null;
  responsible_group_name?: string | null;
  tech_user_id?: number | null;
  tech_user_name?: string | null;
  tech_group_id?: number | null;
  tech_group_name?: string | null;
  manufacturer_id?: number | null;
  manufacturer_name?: string | null;
  model_id?: number | null;
  model_name?: string | null;
  is_dynamic: boolean;
  date_mod?: string | null;
  last_inventory_update?: string | null;
  inventory_stale: boolean;
  links: InventoryLinksDto;
}

export interface InventorySummaryResponseDto {
  context: string;
  total_assets: number;
  totals_by_itemtype: InventoryBucketDto[];
  totals_by_state: InventoryBucketDto[];
  missing_owner: number;
  missing_location: number;
  missing_tech_group: number;
  stale_inventory: number;
}

export interface InventoryAssetListResponseDto {
  context: string;
  total: number;
  limit: number;
  offset: number;
  sort: string;
  order: string;
  data: InventoryAssetDto[];
}

export interface InventoryLogEntryDto {
  id: number;
  action: string;
  user_name?: string | null;
  date_mod?: string | null;
  old_value?: string | null;
  new_value?: string | null;
}

export interface InventoryDiskEntryDto {
  id: number;
  name?: string | null;
  device?: string | null;
  mountpoint?: string | null;
  total_size?: number | null;
  free_size?: number | null;
  is_dynamic: boolean;
  date_mod?: string | null;
}

export interface InventoryNetworkPortEntryDto {
  id: number;
  name?: string | null;
  mac?: string | null;
  ifdescr?: string | null;
  ifalias?: string | null;
  ifspeed?: string | null;
  ifstatus?: string | null;
  ifconnectionstatus?: string | null;
  lastup?: string | null;
  date_mod?: string | null;
}

export interface InventorySoftwareInstallationEntryDto {
  id: number;
  software_id?: number | null;
  software_name?: string | null;
  version_id?: number | null;
  version_name?: string | null;
  arch?: string | null;
  date_install?: string | null;
  is_dynamic: boolean;
}

export interface InventoryConnectionEntryDto {
  itemtype: string;
  id: number;
  name?: string | null;
  serial?: string | null;
  asset_tag?: string | null;
}

export interface InventoryAssetDetailResponseDto {
  context: string;
  asset: InventoryAssetDto;
  logs: InventoryLogEntryDto[];
  disks: InventoryDiskEntryDto[];
  network_ports: InventoryNetworkPortEntryDto[];
  software_installations: InventorySoftwareInstallationEntryDto[];
  connections: InventoryConnectionEntryDto[];
}

export interface InventoryMutationResponseDto {
  context: string;
  itemtype: InventoryItemTypeDto;
  id: number;
  success: boolean;
  message: string;
  result?: unknown;
}
