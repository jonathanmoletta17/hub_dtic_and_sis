from __future__ import annotations

import csv
import io
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.datetime_contract import now_in_app_timezone, serialize_datetime
from app.core.glpi_client import GLPIClient, GLPIClientError
from app.schemas.inventory import (
    InventoryAssetDetailResponse,
    InventoryAssetListResponse,
    InventoryAssetRecord,
    InventoryBucket,
    InventoryConnectionEntry,
    InventoryDiskEntry,
    InventoryItemType,
    InventoryLogEntry,
    InventoryMutationResponse,
    InventoryNetworkPortEntry,
    InventorySoftwareInstallationEntry,
    InventorySummaryResponse,
)


STALE_INVENTORY_DAYS = 30
EXPORT_LIMIT = 5000
DETAIL_LOG_LIMIT = 100
DETAIL_SOFTWARE_LIMIT = 200

COMMON_MUTATION_FIELDS = {
    "name",
    "serial",
    "otherserial",
    "states_id",
    "locations_id",
    "users_id",
    "groups_id",
    "users_id_tech",
    "groups_id_tech",
    "manufacturers_id",
}

SORT_COLUMNS = {
    "name": "assets.name",
    "date_mod": "assets.date_mod",
    "last_inventory_update": "assets.last_inventory_update",
    "state_name": "assets.state_name",
    "location_name": "assets.location_name",
}


@dataclass(frozen=True)
class InventoryItemConfig:
    itemtype: InventoryItemType
    table: str
    model_table: str
    model_fk: str
    front_name: str
    has_last_inventory_update: bool


ITEM_CONFIGS: dict[InventoryItemType, InventoryItemConfig] = {
    "Computer": InventoryItemConfig(
        itemtype="Computer",
        table="glpi_computers",
        model_table="glpi_computermodels",
        model_fk="computermodels_id",
        front_name="computer",
        has_last_inventory_update=True,
    ),
    "Monitor": InventoryItemConfig(
        itemtype="Monitor",
        table="glpi_monitors",
        model_table="glpi_monitormodels",
        model_fk="monitormodels_id",
        front_name="monitor",
        has_last_inventory_update=False,
    ),
    "Printer": InventoryItemConfig(
        itemtype="Printer",
        table="glpi_printers",
        model_table="glpi_printermodels",
        model_fk="printermodels_id",
        front_name="printer",
        has_last_inventory_update=True,
    ),
    "NetworkEquipment": InventoryItemConfig(
        itemtype="NetworkEquipment",
        table="glpi_networkequipments",
        model_table="glpi_networkequipmentmodels",
        model_fk="networkequipmentmodels_id",
        front_name="networkequipment",
        has_last_inventory_update=True,
    ),
    "Peripheral": InventoryItemConfig(
        itemtype="Peripheral",
        table="glpi_peripherals",
        model_table="glpi_peripheralmodels",
        model_fk="peripheralmodels_id",
        front_name="peripheral",
        has_last_inventory_update=False,
    ),
    "Phone": InventoryItemConfig(
        itemtype="Phone",
        table="glpi_phones",
        model_table="glpi_phonemodels",
        model_fk="phonemodels_id",
        front_name="phone",
        has_last_inventory_update=True,
    ),
}

ALLOWED_MUTATION_FIELDS = {
    itemtype: COMMON_MUTATION_FIELDS | {config.model_fk}
    for itemtype, config in ITEM_CONFIGS.items()
}


def _build_display_name_sql(alias: str) -> str:
    return (
        f"COALESCE("
        f"NULLIF(TRIM(CONCAT(COALESCE({alias}.firstname, ''), ' ', COALESCE({alias}.realname, ''))), ''), "
        f"NULLIF({alias}.name, ''), "
        f"NULLIF({alias}.realname, ''), "
        f"NULLIF({alias}.firstname, ''), "
        f"NULL"
        f")"
    )


class InventoryService:
    def get_supported_itemtype(self, itemtype: InventoryItemType) -> InventoryItemConfig:
        return ITEM_CONFIGS[itemtype]

    def validate_mutation_payload(self, itemtype: InventoryItemType, payload: dict[str, Any]) -> dict[str, Any]:
        allowed_fields = ALLOWED_MUTATION_FIELDS[itemtype]
        invalid_fields = sorted(set(payload.keys()) - allowed_fields)
        if invalid_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Campos nao permitidos para {itemtype}: {', '.join(invalid_fields)}.",
            )

        sanitized = {key: value for key, value in payload.items() if key in allowed_fields}
        if not sanitized:
            raise HTTPException(status_code=400, detail="Payload vazio para operacao de inventario.")

        return sanitized

    def _glpi_base_url(self, context: str) -> str:
        url = settings.get_glpi_instance(context).url.rstrip("/")
        for suffix in ("/apirest.php", "/apirest.php/"):
            if url.endswith(suffix):
                return url[: -len(suffix)]
        return url

    def _build_glpi_link(self, context: str, itemtype: InventoryItemType, asset_id: int) -> str:
        config = self.get_supported_itemtype(itemtype)
        return f"{self._glpi_base_url(context)}/front/{config.front_name}.form.php?id={asset_id}"

    def _nullable_int(self, value: Any) -> int | None:
        if value in (None, "", 0, "0"):
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    def _serialize_asset(self, context: str, row: dict[str, Any]) -> InventoryAssetRecord:
        itemtype = row["itemtype"]
        return InventoryAssetRecord(
            itemtype=itemtype,
            id=int(row["id"]),
            name=row.get("name") or f"{itemtype} {row['id']}",
            serial=row.get("serial") or None,
            asset_tag=row.get("asset_tag") or None,
            state_id=self._nullable_int(row.get("state_id")),
            state_name=row.get("state_name") or None,
            location_id=self._nullable_int(row.get("location_id")),
            location_name=row.get("location_name") or None,
            responsible_user_id=self._nullable_int(row.get("responsible_user_id")),
            responsible_user_name=row.get("responsible_user_name") or None,
            responsible_group_id=self._nullable_int(row.get("responsible_group_id")),
            responsible_group_name=row.get("responsible_group_name") or None,
            tech_user_id=self._nullable_int(row.get("tech_user_id")),
            tech_user_name=row.get("tech_user_name") or None,
            tech_group_id=self._nullable_int(row.get("tech_group_id")),
            tech_group_name=row.get("tech_group_name") or None,
            manufacturer_id=self._nullable_int(row.get("manufacturer_id")),
            manufacturer_name=row.get("manufacturer_name") or None,
            model_id=self._nullable_int(row.get("model_id")),
            model_name=row.get("model_name") or None,
            is_dynamic=bool(row.get("is_dynamic")),
            date_mod=serialize_datetime(row.get("date_mod")),
            last_inventory_update=serialize_datetime(row.get("last_inventory_update")),
            inventory_stale=bool(row.get("inventory_stale")),
            links={"glpi": self._build_glpi_link(context, itemtype, int(row["id"]))},
        )

    def _asset_select_sql(self, config: InventoryItemConfig) -> str:
        last_inventory_expr = "asset.last_inventory_update" if config.has_last_inventory_update else "NULL"
        return f"""
            SELECT
                '{config.itemtype}' AS itemtype,
                asset.id,
                asset.name,
                asset.serial,
                asset.otherserial AS asset_tag,
                asset.states_id AS state_id,
                state.name AS state_name,
                asset.locations_id AS location_id,
                COALESCE(location.completename, location.name) AS location_name,
                asset.users_id AS responsible_user_id,
                {_build_display_name_sql('responsible_user')} AS responsible_user_name,
                asset.groups_id AS responsible_group_id,
                COALESCE(responsible_group.completename, responsible_group.name) AS responsible_group_name,
                asset.users_id_tech AS tech_user_id,
                {_build_display_name_sql('tech_user')} AS tech_user_name,
                asset.groups_id_tech AS tech_group_id,
                COALESCE(tech_group.completename, tech_group.name) AS tech_group_name,
                asset.manufacturers_id AS manufacturer_id,
                manufacturer.name AS manufacturer_name,
                asset.{config.model_fk} AS model_id,
                model.name AS model_name,
                COALESCE(asset.is_dynamic, 0) AS is_dynamic,
                asset.date_mod,
                {last_inventory_expr} AS last_inventory_update
            FROM {config.table} asset
            LEFT JOIN glpi_states state ON state.id = asset.states_id
            LEFT JOIN glpi_locations location ON location.id = asset.locations_id
            LEFT JOIN glpi_users responsible_user ON responsible_user.id = asset.users_id
            LEFT JOIN glpi_groups responsible_group ON responsible_group.id = asset.groups_id
            LEFT JOIN glpi_users tech_user ON tech_user.id = asset.users_id_tech
            LEFT JOIN glpi_groups tech_group ON tech_group.id = asset.groups_id_tech
            LEFT JOIN glpi_manufacturers manufacturer ON manufacturer.id = asset.manufacturers_id
            LEFT JOIN {config.model_table} model ON model.id = asset.{config.model_fk}
            WHERE COALESCE(asset.is_deleted, 0) = 0
        """

    def _build_union_sql(self) -> str:
        return "\nUNION ALL\n".join(self._asset_select_sql(config) for config in ITEM_CONFIGS.values())

    def _build_where_clause(
        self,
        *,
        itemtypes: list[InventoryItemType] | None = None,
        states_id: list[int] | None = None,
        locations_id: list[int] | None = None,
        groups_id: list[int] | None = None,
        q: str | None = None,
        only_missing_owner: bool = False,
        only_missing_location: bool = False,
        only_missing_tech_group: bool = False,
        only_stale_inventory: bool = False,
    ) -> tuple[str, dict[str, Any]]:
        clauses: list[str] = []
        params: dict[str, Any] = {
            "stale_cutoff": (now_in_app_timezone() - timedelta(days=STALE_INVENTORY_DAYS)).replace(tzinfo=None),
        }

        if itemtypes:
            itemtype_placeholders = []
            for index, itemtype in enumerate(itemtypes):
                key = f"itemtype_{index}"
                itemtype_placeholders.append(f":{key}")
                params[key] = itemtype
            clauses.append(f"assets.itemtype IN ({', '.join(itemtype_placeholders)})")

        if states_id:
            state_placeholders = []
            for index, state_id in enumerate(states_id):
                key = f"state_{index}"
                state_placeholders.append(f":{key}")
                params[key] = state_id
            clauses.append(f"assets.state_id IN ({', '.join(state_placeholders)})")

        if locations_id:
            location_placeholders = []
            for index, location_id in enumerate(locations_id):
                key = f"location_{index}"
                location_placeholders.append(f":{key}")
                params[key] = location_id
            clauses.append(f"assets.location_id IN ({', '.join(location_placeholders)})")

        if groups_id:
            group_placeholders = []
            for index, group_id in enumerate(groups_id):
                key = f"group_{index}"
                group_placeholders.append(f":{key}")
                params[key] = group_id
            groups_sql = ", ".join(group_placeholders)
            clauses.append(
                f"(assets.responsible_group_id IN ({groups_sql}) OR assets.tech_group_id IN ({groups_sql}))"
            )

        if q:
            q_term = q.strip()
            if q_term:
                params["q"] = f"%{q_term}%"
                clauses.append("(assets.name LIKE :q OR assets.serial LIKE :q OR assets.asset_tag LIKE :q)")

        if only_missing_owner:
            clauses.append(
                "(COALESCE(assets.responsible_user_id, 0) = 0 AND COALESCE(assets.responsible_group_id, 0) = 0)"
            )

        if only_missing_location:
            clauses.append("COALESCE(assets.location_id, 0) = 0")

        if only_missing_tech_group:
            clauses.append("COALESCE(assets.tech_group_id, 0) = 0")

        if only_stale_inventory:
            clauses.append(
                "("
                "COALESCE(assets.last_inventory_update, assets.date_mod) IS NULL "
                "OR COALESCE(assets.last_inventory_update, assets.date_mod) < :stale_cutoff"
                ")"
            )

        if not clauses:
            return "", params

        return "WHERE " + " AND ".join(clauses), params

    async def list_assets(
        self,
        db: AsyncSession,
        *,
        context: str,
        itemtypes: list[InventoryItemType] | None = None,
        states_id: list[int] | None = None,
        locations_id: list[int] | None = None,
        groups_id: list[int] | None = None,
        q: str | None = None,
        only_missing_owner: bool = False,
        only_missing_location: bool = False,
        only_missing_tech_group: bool = False,
        only_stale_inventory: bool = False,
        limit: int = 50,
        offset: int = 0,
        sort: str = "name",
        order: str = "asc",
    ) -> InventoryAssetListResponse:
        sort_column = SORT_COLUMNS.get(sort, SORT_COLUMNS["name"])
        normalized_order = "DESC" if str(order).lower() == "desc" else "ASC"
        where_clause, params = self._build_where_clause(
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

        union_sql = self._build_union_sql()
        count_sql = text(f"SELECT COUNT(*) AS total FROM ({union_sql}) assets {where_clause}")
        total_result = await db.execute(count_sql, params)
        total = int(total_result.scalar() or 0)

        list_params = {
            **params,
            "limit": limit,
            "offset": offset,
        }
        list_sql = text(
            f"""
            SELECT
                assets.*,
                CASE
                    WHEN COALESCE(assets.last_inventory_update, assets.date_mod) IS NULL THEN 1
                    WHEN COALESCE(assets.last_inventory_update, assets.date_mod) < :stale_cutoff THEN 1
                    ELSE 0
                END AS inventory_stale
            FROM ({union_sql}) assets
            {where_clause}
            ORDER BY {sort_column} {normalized_order}, assets.itemtype ASC, assets.id ASC
            LIMIT :limit OFFSET :offset
            """
        )
        rows = (await db.execute(list_sql, list_params)).mappings().all()

        return InventoryAssetListResponse(
            context=context,
            total=total,
            limit=limit,
            offset=offset,
            sort=sort,
            order=normalized_order.lower(),
            data=[self._serialize_asset(context, dict(row)) for row in rows],
        )

    async def get_summary(
        self,
        db: AsyncSession,
        *,
        context: str,
        itemtypes: list[InventoryItemType] | None = None,
        states_id: list[int] | None = None,
        locations_id: list[int] | None = None,
        groups_id: list[int] | None = None,
        q: str | None = None,
        only_missing_owner: bool = False,
        only_missing_location: bool = False,
        only_missing_tech_group: bool = False,
        only_stale_inventory: bool = False,
    ) -> InventorySummaryResponse:
        where_clause, params = self._build_where_clause(
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
        union_sql = self._build_union_sql()

        totals_sql = text(
            f"""
            SELECT
                COUNT(*) AS total_assets,
                SUM(
                    CASE
                        WHEN COALESCE(assets.responsible_user_id, 0) = 0
                         AND COALESCE(assets.responsible_group_id, 0) = 0
                        THEN 1 ELSE 0
                    END
                ) AS missing_owner,
                SUM(CASE WHEN COALESCE(assets.location_id, 0) = 0 THEN 1 ELSE 0 END) AS missing_location,
                SUM(CASE WHEN COALESCE(assets.tech_group_id, 0) = 0 THEN 1 ELSE 0 END) AS missing_tech_group,
                SUM(
                    CASE
                        WHEN COALESCE(assets.last_inventory_update, assets.date_mod) IS NULL THEN 1
                        WHEN COALESCE(assets.last_inventory_update, assets.date_mod) < :stale_cutoff THEN 1
                        ELSE 0
                    END
                ) AS stale_inventory
            FROM ({union_sql}) assets
            {where_clause}
            """
        )
        totals_row = (await db.execute(totals_sql, params)).mappings().first() or {}

        by_type_sql = text(
            f"""
            SELECT assets.itemtype AS key_name, assets.itemtype AS label_name, COUNT(*) AS total
            FROM ({union_sql}) assets
            {where_clause}
            GROUP BY assets.itemtype
            ORDER BY assets.itemtype ASC
            """
        )
        by_type_rows = (await db.execute(by_type_sql, params)).mappings().all()

        by_state_sql = text(
            f"""
            SELECT
                COALESCE(CAST(assets.state_id AS CHAR), 'none') AS key_name,
                COALESCE(NULLIF(assets.state_name, ''), 'Sem estado') AS label_name,
                COUNT(*) AS total
            FROM ({union_sql}) assets
            {where_clause}
            GROUP BY key_name, label_name
            ORDER BY label_name ASC
            """
        )
        by_state_rows = (await db.execute(by_state_sql, params)).mappings().all()

        label_counts: dict[str, int] = {}
        for row in by_state_rows:
            label_key = str(row["label_name"])
            label_counts[label_key] = label_counts.get(label_key, 0) + 1

        normalized_state_buckets: list[InventoryBucket] = []
        for row in by_state_rows:
            key = str(row["key_name"])
            label = str(row["label_name"])
            if key != "none" and label_counts.get(label, 0) > 1:
                label = f"{label} (#{key})"
            normalized_state_buckets.append(
                InventoryBucket(
                    key=key,
                    label=label,
                    total=int(row["total"] or 0),
                )
            )

        return InventorySummaryResponse(
            context=context,
            total_assets=int(totals_row.get("total_assets") or 0),
            totals_by_itemtype=[
                InventoryBucket(
                    key=str(row["key_name"]),
                    label=str(row["label_name"]),
                    total=int(row["total"] or 0),
                )
                for row in by_type_rows
            ],
            totals_by_state=normalized_state_buckets,
            missing_owner=int(totals_row.get("missing_owner") or 0),
            missing_location=int(totals_row.get("missing_location") or 0),
            missing_tech_group=int(totals_row.get("missing_tech_group") or 0),
            stale_inventory=int(totals_row.get("stale_inventory") or 0),
        )

    def _extract_item_id(self, fallback_id: int | None, payload: Any) -> int:
        candidates: list[Any] = []
        if isinstance(payload, dict):
            candidates.extend([payload.get("id"), payload.get("ids")])
        elif isinstance(payload, list):
            candidates.extend(payload)

        if fallback_id is not None:
            candidates.insert(0, fallback_id)

        for candidate in candidates:
            if isinstance(candidate, list):
                for nested in candidate:
                    try:
                        return int(nested)
                    except (TypeError, ValueError):
                        continue
            try:
                if candidate is not None:
                    return int(candidate)
            except (TypeError, ValueError):
                continue

        raise HTTPException(status_code=502, detail="Resposta GLPI sem identificador do ativo.")

    async def create_asset(
        self,
        client: GLPIClient,
        *,
        context: str,
        itemtype: InventoryItemType,
        payload: dict[str, Any],
    ) -> InventoryMutationResponse:
        data = self.validate_mutation_payload(itemtype, payload)
        try:
            result = await client.create_item(itemtype, data)
        except GLPIClientError as error:
            detail = error.detail if error.detail is not None else str(error)
            raise HTTPException(status_code=error.status_code or 502, detail=detail)

        asset_id = self._extract_item_id(None, result)
        return InventoryMutationResponse(
            context=context,
            itemtype=itemtype,
            id=asset_id,
            success=True,
            message="Ativo criado com sucesso.",
            result=result,
        )

    async def update_asset(
        self,
        client: GLPIClient,
        *,
        context: str,
        itemtype: InventoryItemType,
        asset_id: int,
        payload: dict[str, Any],
    ) -> InventoryMutationResponse:
        data = self.validate_mutation_payload(itemtype, payload)
        try:
            result = await client.update_item(itemtype, asset_id, data)
        except GLPIClientError as error:
            detail = error.detail if error.detail is not None else str(error)
            raise HTTPException(status_code=error.status_code or 502, detail=detail)

        return InventoryMutationResponse(
            context=context,
            itemtype=itemtype,
            id=self._extract_item_id(asset_id, result),
            success=True,
            message="Ativo atualizado com sucesso.",
            result=result,
        )

    async def delete_asset(
        self,
        client: GLPIClient,
        *,
        context: str,
        itemtype: InventoryItemType,
        asset_id: int,
    ) -> InventoryMutationResponse:
        try:
            result = await client.delete_item(itemtype, asset_id, force_purge=False)
        except GLPIClientError as error:
            detail = error.detail if error.detail is not None else str(error)
            raise HTTPException(status_code=error.status_code or 502, detail=detail)

        return InventoryMutationResponse(
            context=context,
            itemtype=itemtype,
            id=self._extract_item_id(asset_id, result),
            success=True,
            message="Ativo movido para exclusao logica com sucesso.",
            result=result,
        )

    async def get_asset_detail(
        self,
        db: AsyncSession,
        *,
        context: str,
        itemtype: InventoryItemType,
        asset_id: int,
    ) -> InventoryAssetDetailResponse:
        params = {
            "itemtype": itemtype,
            "asset_id": asset_id,
            "stale_cutoff": (now_in_app_timezone() - timedelta(days=STALE_INVENTORY_DAYS)).replace(tzinfo=None),
        }
        union_sql = self._build_union_sql()
        detail_sql = text(
            f"""
            SELECT
                assets.*,
                CASE
                    WHEN COALESCE(assets.last_inventory_update, assets.date_mod) IS NULL THEN 1
                    WHEN COALESCE(assets.last_inventory_update, assets.date_mod) < :stale_cutoff THEN 1
                    ELSE 0
                END AS inventory_stale
            FROM ({union_sql}) assets
            WHERE assets.itemtype = :itemtype AND assets.id = :asset_id
            LIMIT 1
            """
        )
        row = (await db.execute(detail_sql, params)).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Ativo nao encontrado.")

        logs = await self._get_logs(db, itemtype=itemtype, asset_id=asset_id)
        disks: list[InventoryDiskEntry] = []
        network_ports: list[InventoryNetworkPortEntry] = []
        software_installations: list[InventorySoftwareInstallationEntry] = []
        connections: list[InventoryConnectionEntry] = []

        if itemtype == "Computer":
            disks = await self._get_disks(db, asset_id=asset_id)
            network_ports = await self._get_network_ports(db, asset_id=asset_id)
            software_installations = await self._get_software_installations(db, asset_id=asset_id)
            connections = await self._get_connections(db, asset_id=asset_id)

        return InventoryAssetDetailResponse(
            context=context,
            asset=self._serialize_asset(context, dict(row)),
            logs=logs,
            disks=disks,
            network_ports=network_ports,
            software_installations=software_installations,
            connections=connections,
        )

    async def export_assets_csv(
        self,
        db: AsyncSession,
        *,
        context: str,
        itemtypes: list[InventoryItemType] | None = None,
        states_id: list[int] | None = None,
        locations_id: list[int] | None = None,
        groups_id: list[int] | None = None,
        q: str | None = None,
        only_missing_owner: bool = False,
        only_missing_location: bool = False,
        only_missing_tech_group: bool = False,
        only_stale_inventory: bool = False,
        sort: str = "name",
        order: str = "asc",
    ) -> str:
        result = await self.list_assets(
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
            limit=EXPORT_LIMIT,
            offset=0,
            sort=sort,
            order=order,
        )

        if result.total > EXPORT_LIMIT:
            raise HTTPException(
                status_code=400,
                detail=f"Exportacao limitada a {EXPORT_LIMIT} registros por seguranca.",
            )

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "itemtype",
                "id",
                "name",
                "serial",
                "asset_tag",
                "state_name",
                "location_name",
                "responsible_user_name",
                "responsible_group_name",
                "tech_user_name",
                "tech_group_name",
                "manufacturer_name",
                "model_name",
                "is_dynamic",
                "date_mod",
                "last_inventory_update",
                "inventory_stale",
                "glpi_link",
            ]
        )

        for asset in result.data:
            writer.writerow(
                [
                    asset.itemtype,
                    asset.id,
                    asset.name,
                    asset.serial or "",
                    asset.asset_tag or "",
                    asset.state_name or "",
                    asset.location_name or "",
                    asset.responsible_user_name or "",
                    asset.responsible_group_name or "",
                    asset.tech_user_name or "",
                    asset.tech_group_name or "",
                    asset.manufacturer_name or "",
                    asset.model_name or "",
                    int(asset.is_dynamic),
                    asset.date_mod or "",
                    asset.last_inventory_update or "",
                    int(asset.inventory_stale),
                    asset.links.glpi,
                ]
            )

        return output.getvalue()

    async def _get_logs(
        self,
        db: AsyncSession,
        *,
        itemtype: str,
        asset_id: int,
    ) -> list[InventoryLogEntry]:
        rows = (
            await db.execute(
                text(
                    """
                    SELECT id, linked_action, user_name, date_mod, old_value, new_value
                    FROM glpi_logs
                    WHERE itemtype = :itemtype AND items_id = :asset_id
                    ORDER BY date_mod DESC, id DESC
                    LIMIT :limit
                    """
                ),
                {"itemtype": itemtype, "asset_id": asset_id, "limit": DETAIL_LOG_LIMIT},
            )
        ).mappings().all()
        return [
            InventoryLogEntry(
                id=int(row["id"]),
                action=str(row.get("linked_action") or ""),
                user_name=row.get("user_name") or None,
                date_mod=serialize_datetime(row.get("date_mod")),
                old_value=row.get("old_value") or None,
                new_value=row.get("new_value") or None,
            )
            for row in rows
        ]

    async def _get_disks(self, db: AsyncSession, *, asset_id: int) -> list[InventoryDiskEntry]:
        rows = (
            await db.execute(
                text(
                    """
                    SELECT id, name, device, mountpoint, totalsize, freesize, is_dynamic, date_mod
                    FROM glpi_items_disks
                    WHERE itemtype = 'Computer' AND items_id = :asset_id
                    ORDER BY name ASC, id ASC
                    """
                ),
                {"asset_id": asset_id},
            )
        ).mappings().all()
        return [
            InventoryDiskEntry(
                id=int(row["id"]),
                name=row.get("name") or None,
                device=row.get("device") or None,
                mountpoint=row.get("mountpoint") or None,
                total_size=self._nullable_int(row.get("totalsize")),
                free_size=self._nullable_int(row.get("freesize")),
                is_dynamic=bool(row.get("is_dynamic")),
                date_mod=serialize_datetime(row.get("date_mod")),
            )
            for row in rows
        ]

    async def _get_network_ports(
        self,
        db: AsyncSession,
        *,
        asset_id: int,
    ) -> list[InventoryNetworkPortEntry]:
        rows = (
            await db.execute(
                text(
                    """
                    SELECT id, name, mac, ifdescr, ifalias, ifspeed, ifstatus, ifconnectionstatus, lastup, date_mod
                    FROM glpi_networkports
                    WHERE itemtype = 'Computer'
                      AND items_id = :asset_id
                      AND COALESCE(is_deleted, 0) = 0
                    ORDER BY name ASC, id ASC
                    """
                ),
                {"asset_id": asset_id},
            )
        ).mappings().all()
        return [
            InventoryNetworkPortEntry(
                id=int(row["id"]),
                name=row.get("name") or None,
                mac=row.get("mac") or None,
                ifdescr=row.get("ifdescr") or None,
                ifalias=row.get("ifalias") or None,
                ifspeed=str(row.get("ifspeed")) if row.get("ifspeed") is not None else None,
                ifstatus=row.get("ifstatus") or None,
                ifconnectionstatus=row.get("ifconnectionstatus") or None,
                lastup=serialize_datetime(row.get("lastup")),
                date_mod=serialize_datetime(row.get("date_mod")),
            )
            for row in rows
        ]

    async def _get_software_installations(
        self,
        db: AsyncSession,
        *,
        asset_id: int,
    ) -> list[InventorySoftwareInstallationEntry]:
        rows = (
            await db.execute(
                text(
                    """
                    SELECT
                        item_sw.id,
                        item_sw.softwareversions_id,
                        item_sw.date_install,
                        item_sw.is_dynamic,
                        software_version.name AS version_name,
                        software_version.arch,
                        software.id AS software_id,
                        software.name AS software_name
                    FROM glpi_items_softwareversions item_sw
                    LEFT JOIN glpi_softwareversions software_version
                        ON software_version.id = item_sw.softwareversions_id
                    LEFT JOIN glpi_softwares software
                        ON software.id = software_version.softwares_id
                    WHERE item_sw.itemtype = 'Computer'
                      AND item_sw.items_id = :asset_id
                      AND COALESCE(item_sw.is_deleted, 0) = 0
                    ORDER BY software.name ASC, software_version.name ASC, item_sw.id ASC
                    LIMIT :limit
                    """
                ),
                {"asset_id": asset_id, "limit": DETAIL_SOFTWARE_LIMIT},
            )
        ).mappings().all()
        return [
            InventorySoftwareInstallationEntry(
                id=int(row["id"]),
                software_id=self._nullable_int(row.get("software_id")),
                software_name=row.get("software_name") or None,
                version_id=self._nullable_int(row.get("softwareversions_id")),
                version_name=row.get("version_name") or None,
                arch=row.get("arch") or None,
                date_install=serialize_datetime(row.get("date_install")),
                is_dynamic=bool(row.get("is_dynamic")),
            )
            for row in rows
        ]

    async def _get_connections(
        self,
        db: AsyncSession,
        *,
        asset_id: int,
    ) -> list[InventoryConnectionEntry]:
        rows = (
            await db.execute(
                text(
                    """
                    SELECT
                        relation.itemtype,
                        relation.items_id AS id,
                        monitor.name,
                        monitor.serial,
                        monitor.otherserial AS asset_tag
                    FROM glpi_computers_items relation
                    INNER JOIN glpi_monitors monitor
                        ON relation.itemtype = 'Monitor'
                       AND monitor.id = relation.items_id
                    WHERE relation.computers_id = :asset_id
                      AND COALESCE(relation.is_deleted, 0) = 0

                    UNION ALL

                    SELECT
                        relation.itemtype,
                        relation.items_id AS id,
                        peripheral.name,
                        peripheral.serial,
                        peripheral.otherserial AS asset_tag
                    FROM glpi_computers_items relation
                    INNER JOIN glpi_peripherals peripheral
                        ON relation.itemtype = 'Peripheral'
                       AND peripheral.id = relation.items_id
                    WHERE relation.computers_id = :asset_id
                      AND COALESCE(relation.is_deleted, 0) = 0

                    UNION ALL

                    SELECT
                        relation.itemtype,
                        relation.items_id AS id,
                        printer.name,
                        printer.serial,
                        printer.otherserial AS asset_tag
                    FROM glpi_computers_items relation
                    INNER JOIN glpi_printers printer
                        ON relation.itemtype = 'Printer'
                       AND printer.id = relation.items_id
                    WHERE relation.computers_id = :asset_id
                      AND COALESCE(relation.is_deleted, 0) = 0
                    """
                ),
                {"asset_id": asset_id},
            )
        ).mappings().all()
        return [
            InventoryConnectionEntry(
                itemtype=str(row["itemtype"]),
                id=int(row["id"]),
                name=row.get("name") or None,
                serial=row.get("serial") or None,
                asset_tag=row.get("asset_tag") or None,
            )
            for row in rows
        ]


service = InventoryService()
