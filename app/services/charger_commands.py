import logging
from typing import Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.charger_schemas import ScheduleUpdate, OfflineUpdate
from app.core.glpi_client import GLPIClient

logger = logging.getLogger(__name__)

# O ItemType dinâmico gerado pelo plugin Fields correspondente ao bloco criado na interface
FIELDS_ITEMTYPE = "PluginFieldsPlugingenericobjectcarregadorcarregador"
CHARGER_ITEMTYPE = "PluginGenericobjectCarregador"

async def _get_field_id_for_charger(client: GLPIClient, charger_id: int, db: Optional[AsyncSession] = None) -> Optional[int]:
    """
    Busca o ID do registro de Fields associado a este carregador.
    Prioriza busca via SQL direto por performance e precisão.
    """
    if db:
        try:
            sql = text("SELECT id FROM glpi_plugin_fields_plugingenericobjectcarregadorcarregadors WHERE items_id = :cid LIMIT 1")
            res = await db.execute(sql, {"cid": charger_id})
            row = res.fetchone()
            if row:
                return int(row.id)
        except Exception as e:
            logger.warning(f"Erro ao buscar field_id para {charger_id} via SQL: {e}")

    # Fallback via API REST (Lento/Paginado)
    try:
        fields_list = await client.get_all_items(FIELDS_ITEMTYPE, range_start=0, range_end=100)
        for record in fields_list:
            if int(record.get("items_id", -1)) == charger_id:
                return int(record["id"])
    except Exception as e:
        logger.warning(f"Erro ao buscar field_id para {charger_id} via listagem: {e}")
    return None

async def update_charger_schedule_glpi(client: GLPIClient, charger_id: int, schedule: ScheduleUpdate, db: Optional[AsyncSession] = None) -> dict:
    """
    Atualiza o expediente diretamente no GLPI via Fields API.
    """
    field_id = await _get_field_id_for_charger(client, charger_id, db=db)
    
    payload = {
        "items_id": charger_id,
        "itemtype": CHARGER_ITEMTYPE,
        "inciodoexpedientefield": schedule.business_start,
        "fimdoexpedientefield": schedule.business_end
    }
    
    if field_id:
        # Atualiza o existente
        return await client.update_item(FIELDS_ITEMTYPE, field_id, payload)
    else:
        # Cria novo
        return await client.create_item(FIELDS_ITEMTYPE, payload)

async def update_charger_offline_glpi(client: GLPIClient, charger_id: int, offline_data: OfflineUpdate, db: Optional[AsyncSession] = None) -> dict:
    """
    Atualiza o status de inatividade diretamente no GLPI via Fields API.
    A etiqueta Sim/Não do GLPI espera Inteiro: 1 (Sim) ou 0 (Não).
    """
    field_id = await _get_field_id_for_charger(client, charger_id, db=db)
    
    payload = {
        "items_id": charger_id,
        "itemtype": CHARGER_ITEMTYPE,
        "statusofflinefield": 1 if offline_data.is_offline else 0,
        "motivodainatividadefield": offline_data.reason if offline_data.is_offline else "",
        "expectativaderetornofield": offline_data.expected_return if offline_data.is_offline else None
    }
    
    if field_id:
        return await client.update_item(FIELDS_ITEMTYPE, field_id, payload)
    else:
        return await client.create_item(FIELDS_ITEMTYPE, payload)

# ═════════════════════════════════════════════════════
# ATRIBUIÇÃO (LINK GLPI ITEM_TICKET) E CRUD CARREGADORES
# ═════════════════════════════════════════════════════

async def assign_charger_to_ticket(client: GLPIClient, charger_id: int, ticket_id: int, glpi_db: AsyncSession = None) -> dict:
    """
    Designa um carregador a um ticket criando o Link (Item_Ticket) no GLPI REST API.
    Guard: verifica se já existe o vínculo via MySQL (evita duplicatas e erro 400 da Search API).
    """
    # Guard: verificar duplicata via MySQL direto
    if glpi_db:
        try:
            sql = text("""
                SELECT id FROM glpi_items_tickets
                WHERE items_id = :cid AND tickets_id = :tid
                  AND itemtype = :itype
                LIMIT 1
            """)
            res = await glpi_db.execute(sql, {"cid": charger_id, "tid": ticket_id, "itype": CHARGER_ITEMTYPE})
            row = res.fetchone()
            if row:
                return {"status": "already_assigned", "id": row.id}
        except Exception as e:
            logger.warning(f"Guard de duplicidade (MySQL) falhou (continuando): {e}")

    payload = {
        "itemtype": CHARGER_ITEMTYPE,
        "items_id": charger_id,
        "tickets_id": ticket_id
    }
    result = await client.create_item("Item_Ticket", payload)
    return {"status": "success", "result": result}

async def remove_charger_from_ticket(client: GLPIClient, charger_id: int, ticket_id: int, glpi_db: AsyncSession = None) -> dict:
    """
    Busca o vínculo Item_Ticket via MySQL (evita erro 400 da GLPI Search API) e remove via REST API.
    """
    link_id = None

    if glpi_db:
        sql = text("""
            SELECT id FROM glpi_items_tickets
            WHERE items_id = :cid AND tickets_id = :tid
              AND itemtype = :itype
            LIMIT 1
        """)
        res = await glpi_db.execute(sql, {"cid": charger_id, "tid": ticket_id, "itype": CHARGER_ITEMTYPE})
        row = res.fetchone()
        if row:
            link_id = row.id

    if link_id:
        return await client.delete_item("Item_Ticket", link_id, force_purge=True)

    return {"message": "Vínculo não encontrado ou já deletado."}

async def create_charger(client: GLPIClient, name: str, locations_id: int = 0) -> dict:
    """Cadastra um novo carregador (PluginGenericobjectCarregador) e seu bloco Fields Padrão."""
    payload = {
        "name": name,
        "is_deleted": 0,
        "is_recursive": 1,          # Entidades filhas: Sim
        "is_helpdesk_visible": 1,    # Associável a um chamado: Sim
    }
    if locations_id:
        payload["locations_id"] = locations_id
        
    res = await client.create_item(CHARGER_ITEMTYPE, payload)
    new_id = res.get("id")
    
    if new_id:
        # Injeta logo após criado para não ficar orfão de fields
        await client.create_item(FIELDS_ITEMTYPE, {
            "items_id": new_id,
            "itemtype": CHARGER_ITEMTYPE,
            "inciodoexpedientefield": "08:00",
            "fimdoexpedientefield": "18:00",
            "statusofflinefield": 0
        })
    return res

async def update_charger(client: GLPIClient, charger_id: int, name: str, locations_id: int = 0) -> dict:
    """Atualiza o nome (ou dados essenciais) de um Carregador ativo."""
    payload = {"name": name}
    if locations_id:
        payload["locations_id"] = locations_id
    return await client.update_item(CHARGER_ITEMTYPE, charger_id, payload)

async def delete_charger(client: GLPIClient, charger_id: int) -> dict:
    """Faz um Soft Delete (manda p/ lixeira is_deleted=1) num Carregador."""
    return await client.update_item(CHARGER_ITEMTYPE, charger_id, {"is_deleted": 1})

async def reactivate_charger(client: GLPIClient, charger_id: int) -> dict:
    """Restaura (is_deleted=0) um Carregador desativado."""
    return await client.update_item(CHARGER_ITEMTYPE, charger_id, {"is_deleted": 0})

