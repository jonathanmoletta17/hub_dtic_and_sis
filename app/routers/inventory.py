from __future__ import annotations

from collections.abc import Iterator
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.auth_guard import verify_session
from app.core.authorization import require_hub_permissions
from app.core.database import get_db
from app.core.glpi_client import GLPIClient
from app.schemas.inventory import (
    InventoryAssetDetailResponse,
    InventoryAssetListResponse,
    InventoryAssetMutationRequest,
    InventoryItemType,
    InventoryMutationResponse,
    InventorySummaryResponse,
)
from app.services.inventory_service import service


InventoryIdentity = require_hub_permissions(
    "tecnico",
    "gestor",
    require_app_access="inventario",
    require_active_hub_role=True,
)

InventorySort = Literal["name", "date_mod", "last_inventory_update", "state_name", "location_name"]
InventoryOrder = Literal["asc", "desc"]

router = APIRouter(
    prefix="/api/v1/{context}/inventory",
    tags=["Inventory"],
    dependencies=[Depends(verify_session)],
)


def ensure_inventory_context(context: str) -> str:
    if context != "dtic":
        raise HTTPException(status_code=403, detail="Modulo de inventario disponivel apenas para o contexto DTIC.")
    return context


def _csv_iterator(payload: str) -> Iterator[str]:
    yield payload


def _get_user_client(session_token: str) -> GLPIClient:
    return GLPIClient.from_session_token(settings.get_glpi_instance("dtic"), session_token)


async def _close_user_client(client: GLPIClient) -> None:
    close_http = getattr(getattr(client, "_http", None), "aclose", None)
    if callable(close_http):
        await close_http()


@router.get("/summary", response_model=InventorySummaryResponse, operation_id="getInventorySummary")
async def get_inventory_summary(
    context: str,
    itemtypes: list[InventoryItemType] | None = Query(default=None),
    states_id: list[int] | None = Query(default=None),
    locations_id: list[int] | None = Query(default=None),
    groups_id: list[int] | None = Query(default=None),
    q: str | None = Query(default=None),
    only_missing_owner: bool = Query(default=False),
    only_missing_location: bool = Query(default=False),
    only_missing_tech_group: bool = Query(default=False),
    only_stale_inventory: bool = Query(default=False),
    _inventory_context: str = Depends(ensure_inventory_context),
    _identity: dict = Depends(InventoryIdentity),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_summary(
        db,
        context=context,
        itemtypes=itemtypes,
        states_id=states_id,
        locations_id=locations_id,
        groups_id=groups_id,
        q=q,
        only_missing_owner=only_missing_owner,
        only_missing_location=only_missing_location,
        only_missing_tech_group=only_missing_tech_group,
        only_stale_inventory=only_stale_inventory,
    )


@router.get("/assets", response_model=InventoryAssetListResponse, operation_id="listInventoryAssets")
async def list_inventory_assets(
    context: str,
    itemtypes: list[InventoryItemType] | None = Query(default=None),
    states_id: list[int] | None = Query(default=None),
    locations_id: list[int] | None = Query(default=None),
    groups_id: list[int] | None = Query(default=None),
    q: str | None = Query(default=None),
    only_missing_owner: bool = Query(default=False),
    only_missing_location: bool = Query(default=False),
    only_missing_tech_group: bool = Query(default=False),
    only_stale_inventory: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    sort: InventorySort = Query(default="name"),
    order: InventoryOrder = Query(default="asc"),
    _inventory_context: str = Depends(ensure_inventory_context),
    _identity: dict = Depends(InventoryIdentity),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_assets(
        db,
        context=context,
        itemtypes=itemtypes,
        states_id=states_id,
        locations_id=locations_id,
        groups_id=groups_id,
        q=q,
        only_missing_owner=only_missing_owner,
        only_missing_location=only_missing_location,
        only_missing_tech_group=only_missing_tech_group,
        only_stale_inventory=only_stale_inventory,
        limit=limit,
        offset=offset,
        sort=sort,
        order=order,
    )


@router.get("/assets/export", operation_id="exportInventoryAssetsCsv")
async def export_inventory_assets(
    context: str,
    itemtypes: list[InventoryItemType] | None = Query(default=None),
    states_id: list[int] | None = Query(default=None),
    locations_id: list[int] | None = Query(default=None),
    groups_id: list[int] | None = Query(default=None),
    q: str | None = Query(default=None),
    only_missing_owner: bool = Query(default=False),
    only_missing_location: bool = Query(default=False),
    only_missing_tech_group: bool = Query(default=False),
    only_stale_inventory: bool = Query(default=False),
    sort: InventorySort = Query(default="name"),
    order: InventoryOrder = Query(default="asc"),
    _inventory_context: str = Depends(ensure_inventory_context),
    _identity: dict = Depends(InventoryIdentity),
    db: AsyncSession = Depends(get_db),
):
    payload = await service.export_assets_csv(
        db,
        context=context,
        itemtypes=itemtypes,
        states_id=states_id,
        locations_id=locations_id,
        groups_id=groups_id,
        q=q,
        only_missing_owner=only_missing_owner,
        only_missing_location=only_missing_location,
        only_missing_tech_group=only_missing_tech_group,
        only_stale_inventory=only_stale_inventory,
        sort=sort,
        order=order,
    )
    return StreamingResponse(
        _csv_iterator(payload),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="inventory-assets-dtic.csv"'},
    )


@router.get("/assets/{itemtype}/{asset_id}", response_model=InventoryAssetDetailResponse, operation_id="getInventoryAssetDetail")
async def get_inventory_asset_detail(
    context: str,
    itemtype: InventoryItemType,
    asset_id: int,
    _inventory_context: str = Depends(ensure_inventory_context),
    _identity: dict = Depends(InventoryIdentity),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_asset_detail(
        db,
        context=context,
        itemtype=itemtype,
        asset_id=asset_id,
    )


@router.post("/assets/{itemtype}", response_model=InventoryMutationResponse, operation_id="createInventoryAsset")
async def create_inventory_asset(
    context: str,
    itemtype: InventoryItemType,
    body: InventoryAssetMutationRequest,
    _inventory_context: str = Depends(ensure_inventory_context),
    identity: dict = Depends(InventoryIdentity),
):
    client = _get_user_client(identity["session_token"])
    try:
        return await service.create_asset(
            client,
            context=context,
            itemtype=itemtype,
            payload=body.input,
        )
    finally:
        await _close_user_client(client)


@router.put("/assets/{itemtype}/{asset_id}", response_model=InventoryMutationResponse, operation_id="updateInventoryAsset")
async def update_inventory_asset(
    context: str,
    itemtype: InventoryItemType,
    asset_id: int,
    body: InventoryAssetMutationRequest,
    _inventory_context: str = Depends(ensure_inventory_context),
    identity: dict = Depends(InventoryIdentity),
):
    client = _get_user_client(identity["session_token"])
    try:
        return await service.update_asset(
            client,
            context=context,
            itemtype=itemtype,
            asset_id=asset_id,
            payload=body.input,
        )
    finally:
        await _close_user_client(client)


@router.delete("/assets/{itemtype}/{asset_id}", response_model=InventoryMutationResponse, operation_id="deleteInventoryAsset")
async def delete_inventory_asset(
    context: str,
    itemtype: InventoryItemType,
    asset_id: int,
    _inventory_context: str = Depends(ensure_inventory_context),
    identity: dict = Depends(InventoryIdentity),
):
    client = _get_user_client(identity["session_token"])
    try:
        return await service.delete_asset(
            client,
            context=context,
            itemtype=itemtype,
            asset_id=asset_id,
        )
    finally:
        await _close_user_client(client)
