from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pytest
from fastapi import HTTPException

from app.schemas.inventory import (
    InventoryAssetListResponse,
    InventoryAssetRecord,
)
from app.services.inventory_service import EXPORT_LIMIT, ITEM_CONFIGS, service


def test_validate_mutation_payload_rejects_fields_outside_whitelist():
    with pytest.raises(HTTPException) as exc_info:
        service.validate_mutation_payload(
            "Computer",
            {"name": "Notebook 01", "serial": "ABC", "unsupported": "x"},
        )

    assert exc_info.value.status_code == 400
    assert "unsupported" in str(exc_info.value.detail)


def test_validate_mutation_payload_accepts_itemtype_specific_model_field():
    payload = service.validate_mutation_payload(
        "Phone",
        {"name": "Ramal 101", "phonemodels_id": 11, "groups_id": 17},
    )

    assert payload["name"] == "Ramal 101"
    assert payload["phonemodels_id"] == 11
    assert payload["groups_id"] == 17


def test_build_where_clause_supports_all_filters_and_flags():
    where_clause, params = service._build_where_clause(
        itemtypes=["Computer", "Monitor"],
        states_id=[1, 2],
        locations_id=[3],
        groups_id=[17],
        q="notebook",
        only_missing_owner=True,
        only_missing_location=True,
        only_missing_tech_group=True,
        only_stale_inventory=True,
    )

    assert "assets.itemtype IN" in where_clause
    assert "assets.state_id IN" in where_clause
    assert "assets.location_id IN" in where_clause
    assert "assets.responsible_group_id IN" in where_clause
    assert "assets.tech_group_id IN" in where_clause
    assert "assets.name LIKE :q" in where_clause
    assert "assets.serial LIKE :q" in where_clause
    assert "assets.asset_tag LIKE :q" in where_clause
    assert "COALESCE(assets.responsible_user_id, 0) = 0" in where_clause
    assert "COALESCE(assets.location_id, 0) = 0" in where_clause
    assert "COALESCE(assets.tech_group_id, 0) = 0" in where_clause
    assert "COALESCE(assets.last_inventory_update, assets.date_mod) < :stale_cutoff" in where_clause

    assert params["q"] == "%notebook%"
    assert params["itemtype_0"] == "Computer"
    assert params["itemtype_1"] == "Monitor"
    assert params["state_0"] == 1
    assert params["state_1"] == 2
    assert params["location_0"] == 3
    assert params["group_0"] == 17
    assert "stale_cutoff" in params


def test_build_where_clause_ignores_blank_query():
    where_clause, params = service._build_where_clause(q="   ")

    assert "assets.name LIKE :q" not in where_clause
    assert "q" not in params


def test_union_sql_is_limited_to_supported_hardware_itemtypes():
    union_sql = service._build_union_sql()

    for config in ITEM_CONFIGS.values():
        assert config.table in union_sql
        assert config.model_table in union_sql

    assert "glpi_softwares" not in union_sql
    assert "glpi_softwarelicenses" not in union_sql


@dataclass
class _DummyResult:
    first_row: dict[str, Any] | None = None
    rows: list[dict[str, Any]] | None = None
    scalar_value: Any = None

    def mappings(self):
        return self

    def first(self):
        return self.first_row

    def all(self):
        return self.rows or []

    def scalar(self):
        return self.scalar_value


class _DummySession:
    async def execute(self, sql, params=None):
        query = str(sql)
        if "WHERE assets.itemtype = :itemtype AND assets.id = :asset_id" in query:
            return _DummyResult(
                first_row={
                    "itemtype": "Computer",
                    "id": 77,
                    "name": "Notebook 77",
                    "serial": "SER-77",
                    "asset_tag": "PAT-77",
                    "state_id": 1,
                    "state_name": "Ativo",
                    "location_id": 10,
                    "location_name": "DTIC/CPD",
                    "responsible_user_id": 100,
                    "responsible_user_name": "Alice",
                    "responsible_group_id": 17,
                    "responsible_group_name": "DTIC",
                    "tech_user_id": 101,
                    "tech_user_name": "Bob",
                    "tech_group_id": 17,
                    "tech_group_name": "DTIC",
                    "manufacturer_id": 1,
                    "manufacturer_name": "Dell",
                    "model_id": 12,
                    "model_name": "Latitude",
                    "is_dynamic": 0,
                    "date_mod": None,
                    "last_inventory_update": None,
                    "inventory_stale": 1,
                }
            )
        raise AssertionError(f"SQL inesperado no teste: {query}")


@pytest.mark.asyncio
async def test_get_asset_detail_computer_aggregates_relationships(monkeypatch: pytest.MonkeyPatch):
    async def fake_logs(*args, **kwargs):
        return []

    async def fake_disks(*args, **kwargs):
        return [{"id": 1, "name": "Disk 1"}]

    async def fake_ports(*args, **kwargs):
        return [{"id": 2, "name": "eth0"}]

    async def fake_softwares(*args, **kwargs):
        return [{"id": 3, "software_name": "Office"}]

    async def fake_connections(*args, **kwargs):
        return [{"itemtype": "Monitor", "id": 4, "name": "Monitor 24"}]

    monkeypatch.setattr(service, "_get_logs", fake_logs)
    monkeypatch.setattr(service, "_get_disks", fake_disks)
    monkeypatch.setattr(service, "_get_network_ports", fake_ports)
    monkeypatch.setattr(service, "_get_software_installations", fake_softwares)
    monkeypatch.setattr(service, "_get_connections", fake_connections)

    response = await service.get_asset_detail(
        _DummySession(),
        context="dtic",
        itemtype="Computer",
        asset_id=77,
    )

    assert response.context == "dtic"
    assert response.asset.itemtype == "Computer"
    assert response.asset.id == 77
    assert len(response.disks) == 1
    assert len(response.network_ports) == 1
    assert len(response.software_installations) == 1
    assert len(response.connections) == 1


class _FakeGlpiClient:
    def __init__(self):
        self.calls: list[tuple[str, int, bool]] = []

    async def delete_item(self, itemtype: str, asset_id: int, force_purge: bool = True):
        self.calls.append((itemtype, asset_id, force_purge))
        return {"id": asset_id}


@pytest.mark.asyncio
async def test_delete_asset_uses_soft_delete():
    client = _FakeGlpiClient()

    response = await service.delete_asset(
        client,
        context="dtic",
        itemtype="Computer",
        asset_id=55,
    )

    assert response.success is True
    assert response.id == 55
    assert client.calls == [("Computer", 55, False)]


@pytest.mark.asyncio
async def test_export_assets_csv_uses_same_filters_as_listing(monkeypatch: pytest.MonkeyPatch):
    captured: dict[str, Any] = {}

    async def fake_list_assets(*args, **kwargs):
        captured.update(kwargs)
        return InventoryAssetListResponse(
            context="dtic",
            total=1,
            limit=EXPORT_LIMIT,
            offset=0,
            sort="name",
            order="asc",
            data=[
                InventoryAssetRecord(
                    itemtype="Computer",
                    id=1,
                    name="Notebook 01",
                    serial="SER-01",
                    asset_tag="PAT-01",
                    inventory_stale=False,
                    links={"glpi": "https://glpi.example/front/computer.form.php?id=1"},
                )
            ],
        )

    monkeypatch.setattr(service, "list_assets", fake_list_assets)

    csv_payload = await service.export_assets_csv(
        db=object(),
        context="dtic",
        itemtypes=["Computer"],
        states_id=[1],
        locations_id=[2],
        groups_id=[17],
        q="notebook",
        only_missing_owner=True,
        only_missing_location=True,
        only_missing_tech_group=True,
        only_stale_inventory=True,
        sort="name",
        order="asc",
    )

    assert captured["context"] == "dtic"
    assert captured["itemtypes"] == ["Computer"]
    assert captured["states_id"] == [1]
    assert captured["locations_id"] == [2]
    assert captured["groups_id"] == [17]
    assert captured["q"] == "notebook"
    assert captured["only_missing_owner"] is True
    assert captured["only_missing_location"] is True
    assert captured["only_missing_tech_group"] is True
    assert captured["only_stale_inventory"] is True
    assert captured["limit"] == EXPORT_LIMIT
    assert captured["offset"] == 0
    assert "Notebook 01" in csv_payload


@pytest.mark.asyncio
async def test_export_assets_csv_blocks_massive_dump(monkeypatch: pytest.MonkeyPatch):
    async def fake_list_assets(*args, **kwargs):
        return InventoryAssetListResponse(
            context="dtic",
            total=EXPORT_LIMIT + 1,
            limit=EXPORT_LIMIT,
            offset=0,
            sort="name",
            order="asc",
            data=[],
        )

    monkeypatch.setattr(service, "list_assets", fake_list_assets)

    with pytest.raises(HTTPException) as exc_info:
        await service.export_assets_csv(
            db=object(),
            context="dtic",
        )

    assert exc_info.value.status_code == 400
    assert str(EXPORT_LIMIT) in str(exc_info.value.detail)
