import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.charger_schemas import ScheduleUpdate, OfflineUpdate
from app.core.glpi_client import GLPIClient

logger = logging.getLogger(__name__)

# ItemTypes usados no GLPI para carregadores e seus fields customizados.
FIELDS_ITEMTYPE = "PluginFieldsPlugingenericobjectcarregadorcarregador"
CHARGER_ITEMTYPE = "PluginGenericobjectCarregador"


def _parse_hhmm(value: Optional[str], fallback: str) -> tuple[int, int]:
    source = (value or fallback).strip()
    try:
        hour_raw, minute_raw = source.split(":", 1)
        hour = int(hour_raw)
        minute = int(minute_raw)
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return hour, minute
    except Exception:
        pass
    fallback_hour, fallback_minute = fallback.split(":", 1)
    return int(fallback_hour), int(fallback_minute)


def _is_within_schedule_now(business_start: Optional[str], business_end: Optional[str]) -> bool:
    now = datetime.now()
    now_minutes = now.hour * 60 + now.minute
    start_hour, start_minute = _parse_hhmm(business_start, "08:00")
    end_hour, end_minute = _parse_hhmm(business_end, "18:00")
    start_minutes = start_hour * 60 + start_minute
    end_minutes = end_hour * 60 + end_minute

    if start_minutes == end_minutes:
        return True
    if end_minutes > start_minutes:
        return start_minutes <= now_minutes < end_minutes
    return now_minutes >= start_minutes or now_minutes < end_minutes


async def _get_field_id_for_charger(
    client: GLPIClient,
    charger_id: int,
    db: Optional[AsyncSession] = None,
) -> Optional[int]:
    """
    Busca o ID do registro de Fields associado a este carregador.
    Prioriza SQL direto para reduzir custo da API de busca.
    """
    if db:
        try:
            sql = text(
                """
                SELECT id
                FROM glpi_plugin_fields_plugingenericobjectcarregadorcarregadors
                WHERE items_id = :cid
                LIMIT 1
                """
            )
            res = await db.execute(sql, {"cid": charger_id})
            row = res.fetchone()
            if row:
                return int(row.id)
        except Exception as error:
            logger.warning("Erro ao buscar field_id para %s via SQL: %s", charger_id, error)

    try:
        fields_list = await client.get_all_items(FIELDS_ITEMTYPE, range_start=0, range_end=100)
        for record in fields_list:
            if int(record.get("items_id", -1)) == charger_id:
                return int(record["id"])
    except Exception as error:
        logger.warning("Erro ao buscar field_id para %s via API: %s", charger_id, error)
    return None


async def update_charger_schedule_glpi(
    client: GLPIClient,
    charger_id: int,
    schedule: ScheduleUpdate,
    db: Optional[AsyncSession] = None,
) -> dict:
    field_id = await _get_field_id_for_charger(client, charger_id, db=db)

    payload = {
        "items_id": charger_id,
        "itemtype": CHARGER_ITEMTYPE,
        "inciodoexpedientefield": schedule.business_start,
        "fimdoexpedientefield": schedule.business_end,
    }

    if field_id:
        return await client.update_item(FIELDS_ITEMTYPE, field_id, payload)
    return await client.create_item(FIELDS_ITEMTYPE, payload)


async def update_charger_offline_glpi(
    client: GLPIClient,
    charger_id: int,
    offline_data: OfflineUpdate,
    db: Optional[AsyncSession] = None,
) -> dict:
    field_id = await _get_field_id_for_charger(client, charger_id, db=db)

    payload = {
        "items_id": charger_id,
        "itemtype": CHARGER_ITEMTYPE,
        "statusofflinefield": 1 if offline_data.is_offline else 0,
        "motivodainatividadefield": offline_data.reason if offline_data.is_offline else "",
        "expectativaderetornofield": offline_data.expected_return if offline_data.is_offline else None,
    }

    if field_id:
        return await client.update_item(FIELDS_ITEMTYPE, field_id, payload)
    return await client.create_item(FIELDS_ITEMTYPE, payload)


async def assign_charger_to_ticket(
    client: GLPIClient,
    charger_id: int,
    ticket_id: int,
    glpi_db: AsyncSession = None,
) -> dict:
    """
    Cria vinculo Item_Ticket respeitando regras P0:
    - nao atribuir carregador inativo/offline/fora de expediente
    - evitar duplicidade de vinculo
    - ao atribuir ticket status=1, promover para status=2
    """
    ticket_status: Optional[int] = None

    if glpi_db:
        guard_sql = text(
            """
            SELECT
                ch.is_deleted,
                COALESCE(NULLIF(f.statusofflinefield, ''), '0') AS is_offline_raw,
                COALESCE(NULLIF(f.inciodoexpedientefield, ''), '08:00') AS b_start,
                COALESCE(NULLIF(f.fimdoexpedientefield, ''), '18:00') AS b_end
            FROM glpi_plugin_genericobject_carregadors ch
            LEFT JOIN glpi_plugin_fields_plugingenericobjectcarregadorcarregadors f
                ON f.items_id = ch.id
                AND f.itemtype = :itemtype
            WHERE ch.id = :cid
            LIMIT 1
            """
        )
        guard_row = (
            await glpi_db.execute(
                guard_sql,
                {"cid": charger_id, "itemtype": CHARGER_ITEMTYPE},
            )
        ).fetchone()
        if not guard_row:
            raise ValueError("Carregador nao encontrado para atribuicao.")
        if int(guard_row.is_deleted or 0) == 1:
            raise ValueError("Carregador inativo/deletado nao pode receber atribuicao.")
        if str(guard_row.is_offline_raw) == "1":
            raise ValueError("Carregador offline nao pode receber atribuicao.")
        if not _is_within_schedule_now(guard_row.b_start, guard_row.b_end):
            raise ValueError("Carregador fora do expediente nao pode receber atribuicao.")

        ticket_sql = text(
            """
            SELECT status
            FROM glpi_tickets
            WHERE id = :tid
              AND is_deleted = 0
            LIMIT 1
            """
        )
        ticket_row = (await glpi_db.execute(ticket_sql, {"tid": ticket_id})).fetchone()
        ticket_status = int(ticket_row.status) if ticket_row else None

        duplicate_sql = text(
            """
            SELECT id
            FROM glpi_items_tickets
            WHERE items_id = :cid
              AND tickets_id = :tid
              AND itemtype = :itype
            LIMIT 1
            """
        )
        duplicate_row = (
            await glpi_db.execute(
                duplicate_sql,
                {"cid": charger_id, "tid": ticket_id, "itype": CHARGER_ITEMTYPE},
            )
        ).fetchone()
        if duplicate_row:
            return {"status": "already_assigned", "id": duplicate_row.id}

    payload = {
        "itemtype": CHARGER_ITEMTYPE,
        "items_id": charger_id,
        "tickets_id": ticket_id,
    }
    result = await client.create_item("Item_Ticket", payload)

    if ticket_status == 1:
        try:
            await client.update_item("Ticket", ticket_id, {"status": 2})
        except Exception as error:
            logger.warning("Falha ao promover ticket %s para status 2: %s", ticket_id, error)

    return {"status": "success", "result": result}


async def remove_charger_from_ticket(
    client: GLPIClient,
    charger_id: int,
    ticket_id: int,
    glpi_db: AsyncSession = None,
) -> dict:
    link_id = None

    if glpi_db:
        sql = text(
            """
            SELECT id
            FROM glpi_items_tickets
            WHERE items_id = :cid
              AND tickets_id = :tid
              AND itemtype = :itype
            LIMIT 1
            """
        )
        res = await glpi_db.execute(
            sql,
            {"cid": charger_id, "tid": ticket_id, "itype": CHARGER_ITEMTYPE},
        )
        row = res.fetchone()
        if row:
            link_id = row.id

    if link_id:
        return await client.delete_item("Item_Ticket", link_id, force_purge=True)

    return {"message": "Vinculo nao encontrado ou ja deletado."}


async def create_charger(client: GLPIClient, name: str, locations_id: int = 0) -> dict:
    payload = {
        "name": name,
        "is_deleted": 0,
        "is_recursive": 1,
        "is_helpdesk_visible": 1,
    }
    if locations_id:
        payload["locations_id"] = locations_id

    res = await client.create_item(CHARGER_ITEMTYPE, payload)
    new_id = res.get("id")

    if new_id:
        await client.create_item(
            FIELDS_ITEMTYPE,
            {
                "items_id": new_id,
                "itemtype": CHARGER_ITEMTYPE,
                "inciodoexpedientefield": "08:00",
                "fimdoexpedientefield": "18:00",
                "statusofflinefield": 0,
            },
        )
    return res


async def update_charger(client: GLPIClient, charger_id: int, name: str, locations_id: int = 0) -> dict:
    payload = {"name": name}
    if locations_id:
        payload["locations_id"] = locations_id
    return await client.update_item(CHARGER_ITEMTYPE, charger_id, payload)


async def delete_charger(client: GLPIClient, charger_id: int) -> dict:
    return await client.update_item(CHARGER_ITEMTYPE, charger_id, {"is_deleted": 1})


async def reactivate_charger(client: GLPIClient, charger_id: int) -> dict:
    return await client.update_item(CHARGER_ITEMTYPE, charger_id, {"is_deleted": 0})
