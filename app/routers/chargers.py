import logging
import asyncio
from datetime import datetime
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings

from sqlalchemy import text
from app.core.authorization import require_hub_permissions
from app.core.database import get_db, get_local_db
from app.core.session_manager import session_manager
from app.core.rate_limit import limiter
from app.services.charger_service import ChargerService
from app.services.charger_settings_store import read_global_schedule, write_global_schedule
from app.core.utils.cache_utils import clear_ttl_cache
from app.services.charger_commands import (
    update_charger_schedule_glpi, update_charger_offline_glpi,
    assign_charger_to_ticket, remove_charger_from_ticket,
    create_charger, update_charger, delete_charger, reactivate_charger
)
from app.core.glpi_client import GLPIClient, GLPIClientError
from app.schemas.charger_schemas import (
    KanbanResponse, ScheduleResponse, ScheduleUpdate,
    GlobalScheduleResponse, GlobalScheduleUpdate,
    OfflineResponse, OfflineUpdate,
    ChargerCreate, ChargerUpdate,
    MultipleAssignment, BatchActionUpdate,
    ChargerScheduleReadResponse, ChargerOfflineReadResponse,
    RankingResponse, TicketDetailResponse,
)

# TODO: Idealmente centralizar em 'app.core.dependencies'
async def get_glpi_session(context: str) -> GLPIClient:
    try:
        return await session_manager.get_client(context)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

async def get_user_glpi_session(
    context: str,
    session_token: str = Header(..., alias="Session-Token")
) -> GLPIClient:
    """Retorna um client GLPI na context do próprio usuário logado para emitir Audit Trail real."""
    try:
        instance = settings.get_glpi_instance(context)
        return GLPIClient.from_session_token(instance, session_token)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

from app.core.auth_guard import verify_session

router = APIRouter(prefix="/api/v1/{context}/chargers", tags=["Chargers"], dependencies=[Depends(verify_session)])
logger = logging.getLogger(__name__)

service = ChargerService()

CHARGERS_READ_RATE_LIMIT = "240/minute"
CHARGERS_CACHE_PREFIX = "app.services.charger_service."


def _invalidate_chargers_cache(reason: str) -> None:
    removed = clear_ttl_cache(CHARGERS_CACHE_PREFIX)
    logger.info("chargers.cache.invalidate reason=%s removed_keys=%s", reason, removed)


def _extract_request_id(request: Request) -> str:
    return (
        request.headers.get("X-Request-ID")
        or request.headers.get("X-Correlation-ID")
        or request.headers.get("X-Trace-ID")
        or "-"
    )


def _raise_chargers_http_error(error: Exception, *, fallback_detail: str) -> None:
    if isinstance(error, HTTPException):
        raise error
    if isinstance(error, GLPIClientError):
        status_code = error.status_code if isinstance(error.status_code, int) and 400 <= error.status_code < 600 else 502
        detail = str(error.detail).strip() if error.detail is not None else ""
        raise HTTPException(status_code=status_code, detail=detail or fallback_detail)
    if isinstance(error, (httpx.TimeoutException, asyncio.TimeoutError, TimeoutError)):
        raise HTTPException(status_code=504, detail="Tempo limite excedido ao consultar servico externo.")
    raise HTTPException(status_code=500, detail=fallback_detail)

@router.get("/kanban", response_model=KanbanResponse, operation_id="getChargerKanban")
@limiter.limit(CHARGERS_READ_RATE_LIMIT)
async def get_kanban(
    request: Request,
    context: str,
    _identity: dict = Depends(
        require_hub_permissions(
            "tecnico",
            "gestor",
            require_app_access="carregadores",
            require_active_hub_role=True,
        )
    ),
    db: AsyncSession = Depends(get_db)
):
    """Retorna os dados completos do Kanban de Carregadores."""
    if context != "sis":
        raise HTTPException(status_code=400, detail="Módulo disponível apenas no contexto SIS.")
    
    request_id = _extract_request_id(request)
    started_at = datetime.now()
    try:
        return await service.get_kanban_data(context, db, db) # db is passed twice temporally
    except Exception as error:
        logger.warning(
            "chargers.get_kanban failed request_id=%s context=%s error_type=%s detail=%s",
            request_id,
            context,
            type(error).__name__,
            str(error),
        )
        _raise_chargers_http_error(error, fallback_detail="Falha ao carregar kanban de carregadores.")
    finally:
        elapsed_ms = (datetime.now() - started_at).total_seconds() * 1000
        logger.info(
            "chargers.get_kanban completed request_id=%s context=%s elapsed_ms=%.1f",
            request_id,
            context,
            elapsed_ms,
        )

@router.get("/{charger_id}/schedule", response_model=ChargerScheduleReadResponse, operation_id="getChargerSchedule")
async def get_schedule(
    charger_id: int,
    _identity: dict = Depends(
        require_hub_permissions(
            "tecnico",
            "gestor",
            require_app_access="carregadores",
            require_active_hub_role=True,
        )
    ),
    db: AsyncSession = Depends(get_db),
):
    """Busca o horário de expediente nativo do carregador do MySQL."""
    sql = text("""
        SELECT inciodoexpedientefield, fimdoexpedientefield
        FROM glpi_plugin_fields_plugingenericobjectcarregadorcarregadors
        WHERE items_id = :cid
    """)
    res = await db.execute(sql, {"cid": charger_id})
    row = res.fetchone()
    if not row:
        return {"business_start": "08:00", "business_end": "18:00", "work_on_weekends": False}
    b_start = row.inciodoexpedientefield if row.inciodoexpedientefield else "08:00"
    b_end = row.fimdoexpedientefield if row.fimdoexpedientefield else "18:00"
    return {"business_start": b_start, "business_end": b_end, "work_on_weekends": False}

@router.put("/{charger_id}/schedule", operation_id="updateChargerSchedule")
async def update_schedule(
    charger_id: int, 
    payload: ScheduleUpdate, 
    _identity: dict = Depends(
        require_hub_permissions(
            "tecnico",
            "gestor",
            require_app_access="carregadores",
            require_active_hub_role=True,
        )
    ),
    glpi_client: GLPIClient = Depends(get_user_glpi_session),
    db: AsyncSession = Depends(get_db)
):
    """Atualiza o horário de expediente de um carregador diretamente no GLPI."""
    try:
        await update_charger_schedule_glpi(glpi_client, charger_id, payload, db=db)
        _invalidate_chargers_cache("update-schedule")
        return {"success": True, "message": "Expediente sincronizado com o GLPI"}
    except Exception as e:
        logger.error(f"Erro ao atualizar schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/global-schedule", response_model=GlobalScheduleResponse, operation_id="getGlobalSchedule")
async def get_global_schedule(
    _identity: dict = Depends(
        require_hub_permissions(
            "tecnico",
            "gestor",
            require_app_access="carregadores",
            require_active_hub_role=True,
        )
    ),
    local_db: AsyncSession = Depends(get_local_db),
):
    """Busca o horário de expediente global persistido no SQLite local de domínio."""
    data = await read_global_schedule(local_db)
    return GlobalScheduleResponse(
        id=1,
        business_start=str(data["business_start"]),
        business_end=str(data["business_end"]),
        work_on_weekends=bool(data["work_on_weekends"]),
        updated_at=data["updated_at"],
    )

@router.put("/global-schedule", response_model=GlobalScheduleResponse, operation_id="updateGlobalSchedule")
async def update_global_schedule(
    data: GlobalScheduleUpdate,
    _identity: dict = Depends(
        require_hub_permissions(
            "tecnico",
            "gestor",
            require_app_access="carregadores",
            require_active_hub_role=True,
        )
    ),
    local_db: AsyncSession = Depends(get_local_db),
):
    """Atualiza o horário de expediente global no SQLite local de domínio."""
    payload = await write_global_schedule(
        local_db,
        business_start=data.business_start,
        business_end=data.business_end,
        work_on_weekends=data.work_on_weekends,
    )
    return GlobalScheduleResponse(
        id=1,
        business_start=str(payload["business_start"]),
        business_end=str(payload["business_end"]),
        work_on_weekends=bool(payload["work_on_weekends"]),
        updated_at=payload["updated_at"],
    )

@router.get("/{charger_id}/offline", response_model=ChargerOfflineReadResponse, operation_id="getChargerOffline")
async def get_offline(
    charger_id: int,
    _identity: dict = Depends(
        require_hub_permissions(
            "tecnico",
            "gestor",
            require_app_access="carregadores",
            require_active_hub_role=True,
        )
    ),
    db: AsyncSession = Depends(get_db),
):
    """Busca o status offline nativo do carregador."""
    sql = text("""
        SELECT statusofflinefield, motivodainatividadefield, expectativaderetornofield
        FROM glpi_plugin_fields_plugingenericobjectcarregadorcarregadors
        WHERE items_id = :cid
    """)
    res = await db.execute(sql, {"cid": charger_id})
    row = res.fetchone()
    if not row:
        return {"is_offline": False, "reason": None, "expected_return": None}
    
    return {
        "is_offline": bool(row.statusofflinefield),
        "reason": row.motivodainatividadefield,
        "expected_return": row.expectativaderetornofield
    }

@router.put("/{charger_id}/offline", operation_id="updateChargerOffline")
async def update_offline(
    charger_id: int, 
    payload: OfflineUpdate, 
    _identity: dict = Depends(
        require_hub_permissions(
            "tecnico",
            "gestor",
            require_app_access="carregadores",
            require_active_hub_role=True,
        )
    ),
    glpi_client: GLPIClient = Depends(get_user_glpi_session),
    db: AsyncSession = Depends(get_db)
):
    """Atualiza o status offline de um carregador diretamente no GLPI."""
    try:
        await update_charger_offline_glpi(glpi_client, charger_id, payload, db=db)
        _invalidate_chargers_cache("update-offline")
        return {"success": True, "message": "Inatividade sincronizada com o GLPI"}
    except Exception as e:
        logger.error(f"Erro ao atualizar offline: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════
# ATRIBUIÇÃO E CRUD DE CARREGADORES
# ═══════════════════════════════════════════

@router.post("/{charger_id}/assign/{ticket_id}", operation_id="assignChargerToTicket")
async def assign_charger(
    charger_id: int,
    ticket_id: int,
    _identity: dict = Depends(
        require_hub_permissions(
            "tecnico",
            "gestor",
            require_app_access="carregadores",
            require_active_hub_role=True,
        )
    ),
    glpi_client: GLPIClient = Depends(get_user_glpi_session),
    db: AsyncSession = Depends(get_db)
):
    """Atribui um carregador a um ticket nativamente no GLPI."""
    try:
        res = await assign_charger_to_ticket(glpi_client, charger_id, ticket_id, glpi_db=db)
        _invalidate_chargers_cache("assign")
        return {"success": True, "data": res}
    except Exception as e:
        logger.error(f"Erro ao atribuir: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tickets/{ticket_id}/assign-multiple", operation_id="assignMultipleChargersToTicket")
async def assign_multiple(
    ticket_id: int,
    payload: MultipleAssignment,
    _identity: dict = Depends(
        require_hub_permissions(
            "tecnico",
            "gestor",
            require_app_access="carregadores",
            require_active_hub_role=True,
        )
    ),
    glpi_client: GLPIClient = Depends(get_user_glpi_session),
    db: AsyncSession = Depends(get_db)
):
    """Atribui múltiplos carregadores a um único ticket."""
    try:
        results = []
        for cid in payload.charger_ids:
            res = await assign_charger_to_ticket(glpi_client, cid, ticket_id, glpi_db=db)
            results.append(res)
        _invalidate_chargers_cache("assign-multiple")
        return {"success": True, "data": results}
    except Exception as e:
        logger.error(f"Erro ao atribuir multiplos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{charger_id}/assign/{ticket_id}", operation_id="removeChargerFromTicket")
async def unassign_charger(
    charger_id: int,
    ticket_id: int,
    _identity: dict = Depends(
        require_hub_permissions(
            "tecnico",
            "gestor",
            require_app_access="carregadores",
            require_active_hub_role=True,
        )
    ),
    glpi_client: GLPIClient = Depends(get_user_glpi_session),
    db: AsyncSession = Depends(get_db)
):
    """Remove a atribuição de um carregador a um ticket."""
    try:
        res = await remove_charger_from_ticket(glpi_client, charger_id, ticket_id, glpi_db=db)
        _invalidate_chargers_cache("unassign")
        return {"success": True, "data": res}
    except Exception as e:
        logger.error(f"Erro ao remover: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", operation_id="createCharger")
async def create_new_charger(
    payload: ChargerCreate,
    _identity: dict = Depends(
        require_hub_permissions(
            "tecnico",
            "gestor",
            require_app_access="carregadores",
            require_active_hub_role=True,
        )
    ),
    glpi_client: GLPIClient = Depends(get_user_glpi_session)
):
    """Cria um novo carregador (Asset) no GLPI."""
    try:
        res = await create_charger(glpi_client, payload.name, payload.locations_id)
        _invalidate_chargers_cache("create")
        return {"success": True, "data": res}
    except Exception as e:
        logger.error(f"Erro ao criar: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{charger_id}", operation_id="updateCharger")
async def edit_charger(
    charger_id: int,
    payload: ChargerUpdate,
    _identity: dict = Depends(
        require_hub_permissions(
            "tecnico",
            "gestor",
            require_app_access="carregadores",
            require_active_hub_role=True,
        )
    ),
    glpi_client: GLPIClient = Depends(get_user_glpi_session)
):
    """Edita (Renomeia / Realoca) um carregador existente."""
    try:
        res = await update_charger(glpi_client, charger_id, payload.name, payload.locations_id)
        _invalidate_chargers_cache("update")
        return {"success": True, "data": res}
    except Exception as e:
        logger.error(f"Erro ao editar: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{charger_id}", operation_id="deleteCharger")
async def remove_charger(
    charger_id: int,
    _identity: dict = Depends(
        require_hub_permissions(
            "tecnico",
            "gestor",
            require_app_access="carregadores",
            require_active_hub_role=True,
        )
    ),
    glpi_client: GLPIClient = Depends(get_user_glpi_session)
):
    """Envia o carregador ativo para a lixeira (Soft Delete) no GLPI."""
    try:
        res = await delete_charger(glpi_client, charger_id)
        _invalidate_chargers_cache("delete")
        return {"success": True, "data": res}
    except Exception as e:
        logger.error(f"Erro ao remover: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{charger_id}/reactivate", operation_id="reactivateCharger")
async def restore_charger(
    charger_id: int,
    _identity: dict = Depends(
        require_hub_permissions(
            "tecnico",
            "gestor",
            require_app_access="carregadores",
            require_active_hub_role=True,
        )
    ),
    glpi_client: GLPIClient = Depends(get_user_glpi_session)
):
    """Restaura o carregador da lixeira (is_deleted=0) no GLPI."""
    try:
        res = await reactivate_charger(glpi_client, charger_id)
        _invalidate_chargers_cache("reactivate")
        return {"success": True, "data": res}
    except Exception as e:
        logger.error(f"Erro ao reativar: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch-action", operation_id="batchUpdateChargers")
async def batch_update(
    payload: BatchActionUpdate,
    _identity: dict = Depends(
        require_hub_permissions(
            "tecnico",
            "gestor",
            require_app_access="carregadores",
            require_active_hub_role=True,
        )
    ),
    glpi_client: GLPIClient = Depends(get_user_glpi_session),
    db: AsyncSession = Depends(get_db)
):
    """Processa atualizações de expediente e/ou status offline para múltiplos carregadores."""
    results = []
    try:
        for cid in payload.charger_ids:
            item_result = {"charger_id": cid, "updates": []}
            
            # 1. Update Schedule if requested
            if payload.update_schedule and payload.schedule:
                try:
                    res = await update_charger_schedule_glpi(glpi_client, cid, payload.schedule, db=db)
                    item_result["updates"].append({"type": "schedule", "success": True, "res": res})
                except Exception as e:
                    item_result["updates"].append({"type": "schedule", "success": False, "error": str(e)})

            # 2. Update Offline if requested
            if payload.update_offline and payload.offline:
                try:
                    res = await update_charger_offline_glpi(glpi_client, cid, payload.offline, db=db)
                    item_result["updates"].append({"type": "offline", "success": True, "res": res})
                except Exception as e:
                    item_result["updates"].append({"type": "offline", "success": False, "error": str(e)})
            
            results.append(item_result)
        _invalidate_chargers_cache("batch-update")
        return {"success": True, "results": results}
    except Exception as e:
        logger.error(f"Erro no batch action: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════
# DETALHES DO TICKET (MODAL)
# ═══════════════════════════════════════════

@router.get("/tickets/{ticket_id}/detail", response_model=TicketDetailResponse, operation_id="getTicketDetail")
@limiter.limit("30/minute")
async def get_ticket_detail(
    request: Request,
    context: str,
    ticket_id: int,
    _identity: dict = Depends(
        require_hub_permissions(
            "tecnico",
            "gestor",
            require_app_access="carregadores",
            require_active_hub_role=True,
        )
    ),
    db: AsyncSession = Depends(get_db)
):
    """Retorna detalhes completos de um ticket para o modal de detalhes."""
    if context != "sis":
        raise HTTPException(status_code=400, detail="Módulo disponível apenas no contexto SIS.")
    try:
        result = await service.get_ticket_detail(ticket_id, db)
        if not result:
            raise HTTPException(status_code=404, detail="Ticket não encontrado.")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar detalhes do ticket: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════
# Metrics Router — /api/v1/{context}/metrics/chargers
# Alinhado com contrato do legado
# ═══════════════════════════════════════════

metrics_router = APIRouter(prefix="/api/v1/{context}/metrics", tags=["Charger Metrics"])

@metrics_router.get("/chargers", response_model=RankingResponse, operation_id="getChargersMetrics")
@limiter.limit(CHARGERS_READ_RATE_LIMIT)
async def get_chargers_metrics(
    request: Request,
    context: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    _identity: dict = Depends(
        require_hub_permissions(
            "tecnico",
            "gestor",
            require_app_access="carregadores",
            require_active_hub_role=True,
        )
    ),
    db: AsyncSession = Depends(get_db)
):
    """Retorna dados agregados de carregadores com métricas de ranking."""
    if context != "sis":
        raise HTTPException(status_code=400, detail="Módulo disponível apenas no contexto SIS.")
    
    request_id = _extract_request_id(request)
    started_at = datetime.now()
    try:
        return await service.get_ranking(context, db, start_date=start_date, end_date=end_date)
    except Exception as error:
        logger.warning(
            "chargers.get_chargers_metrics failed request_id=%s context=%s error_type=%s detail=%s",
            request_id,
            context,
            type(error).__name__,
            str(error),
        )
        _raise_chargers_http_error(error, fallback_detail="Falha ao carregar metricas de carregadores.")
    finally:
        elapsed_ms = (datetime.now() - started_at).total_seconds() * 1000
        logger.info(
            "chargers.get_chargers_metrics completed request_id=%s context=%s elapsed_ms=%.1f",
            request_id,
            context,
            elapsed_ms,
        )

@metrics_router.get("/chargers/kanban", response_model=KanbanResponse, operation_id="getChargerKanbanMetrics")
@limiter.limit(CHARGERS_READ_RATE_LIMIT)
async def get_kanban_metrics(
    request: Request,
    context: str,
    _identity: dict = Depends(
        require_hub_permissions(
            "tecnico",
            "gestor",
            require_app_access="carregadores",
            require_active_hub_role=True,
        )
    ),
    db: AsyncSession = Depends(get_db)
):
    """Alias do kanban endpoint sob /metrics/ (legado compat)."""
    if context != "sis":
        raise HTTPException(status_code=400, detail="Módulo disponível apenas no contexto SIS.")
    
    request_id = _extract_request_id(request)
    started_at = datetime.now()
    try:
        return await service.get_kanban_data(context, db, db)
    except Exception as error:
        logger.warning(
            "chargers.get_kanban_metrics failed request_id=%s context=%s error_type=%s detail=%s",
            request_id,
            context,
            type(error).__name__,
            str(error),
        )
        _raise_chargers_http_error(error, fallback_detail="Falha ao carregar kanban de metricas.")
    finally:
        elapsed_ms = (datetime.now() - started_at).total_seconds() * 1000
        logger.info(
            "chargers.get_kanban_metrics completed request_id=%s context=%s elapsed_ms=%.1f",
            request_id,
            context,
            elapsed_ms,
        )
