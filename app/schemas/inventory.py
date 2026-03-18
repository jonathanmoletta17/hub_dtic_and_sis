from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.core.datetime_contract import AwareDateTime


InventoryItemType = Literal[
    "Computer",
    "Monitor",
    "Printer",
    "NetworkEquipment",
    "Peripheral",
    "Phone",
]


class InventoryLinks(BaseModel):
    glpi: str


class InventoryBucket(BaseModel):
    key: str
    label: str
    total: int


class InventoryAssetRecord(BaseModel):
    itemtype: InventoryItemType
    id: int
    name: str
    serial: str | None = None
    asset_tag: str | None = None
    state_id: int | None = None
    state_name: str | None = None
    location_id: int | None = None
    location_name: str | None = None
    responsible_user_id: int | None = None
    responsible_user_name: str | None = None
    responsible_group_id: int | None = None
    responsible_group_name: str | None = None
    tech_user_id: int | None = None
    tech_user_name: str | None = None
    tech_group_id: int | None = None
    tech_group_name: str | None = None
    manufacturer_id: int | None = None
    manufacturer_name: str | None = None
    model_id: int | None = None
    model_name: str | None = None
    is_dynamic: bool = False
    date_mod: AwareDateTime | None = None
    last_inventory_update: AwareDateTime | None = None
    inventory_stale: bool = False
    links: InventoryLinks


class InventorySummaryResponse(BaseModel):
    context: str
    total_assets: int
    totals_by_itemtype: list[InventoryBucket] = Field(default_factory=list)
    totals_by_state: list[InventoryBucket] = Field(default_factory=list)
    missing_owner: int = 0
    missing_location: int = 0
    missing_tech_group: int = 0
    stale_inventory: int = 0


class InventoryAssetListResponse(BaseModel):
    context: str
    total: int
    limit: int
    offset: int
    sort: str
    order: str
    data: list[InventoryAssetRecord] = Field(default_factory=list)


class InventoryLogEntry(BaseModel):
    id: int
    action: str
    user_name: str | None = None
    date_mod: AwareDateTime | None = None
    old_value: str | None = None
    new_value: str | None = None


class InventoryDiskEntry(BaseModel):
    id: int
    name: str | None = None
    device: str | None = None
    mountpoint: str | None = None
    total_size: int | None = None
    free_size: int | None = None
    is_dynamic: bool = False
    date_mod: AwareDateTime | None = None


class InventoryNetworkPortEntry(BaseModel):
    id: int
    name: str | None = None
    mac: str | None = None
    ifdescr: str | None = None
    ifalias: str | None = None
    ifspeed: str | None = None
    ifstatus: str | None = None
    ifconnectionstatus: str | None = None
    lastup: AwareDateTime | None = None
    date_mod: AwareDateTime | None = None


class InventorySoftwareInstallationEntry(BaseModel):
    id: int
    software_id: int | None = None
    software_name: str | None = None
    version_id: int | None = None
    version_name: str | None = None
    arch: str | None = None
    date_install: AwareDateTime | None = None
    is_dynamic: bool = False


class InventoryConnectionEntry(BaseModel):
    itemtype: str
    id: int
    name: str | None = None
    serial: str | None = None
    asset_tag: str | None = None


class InventoryAssetDetailResponse(BaseModel):
    context: str
    asset: InventoryAssetRecord
    logs: list[InventoryLogEntry] = Field(default_factory=list)
    disks: list[InventoryDiskEntry] = Field(default_factory=list)
    network_ports: list[InventoryNetworkPortEntry] = Field(default_factory=list)
    software_installations: list[InventorySoftwareInstallationEntry] = Field(default_factory=list)
    connections: list[InventoryConnectionEntry] = Field(default_factory=list)


class InventoryAssetMutationRequest(BaseModel):
    input: dict[str, Any] = Field(default_factory=dict)


class InventoryMutationResponse(BaseModel):
    context: str
    itemtype: InventoryItemType
    id: int
    success: bool
    message: str
    result: dict[str, Any] | list[Any] | None = None
