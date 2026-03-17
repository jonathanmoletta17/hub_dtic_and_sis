"""
Router: DB Read Engine — CQRS Dinâmico
Leituras SQL parametrizadas com whitelist de segurança.
Zero hardcode. Zero acoplamento com domínio.
"""
import re
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.services import kpis_service, stats_service, ticket_list_service, query_engine_service
from app.core.auth_guard import verify_session
from app.schemas.search import TicketListResponse
# Falta de arquivo no repositório local: import inconsistency_service removido para compilação.

# NOTA (Fase 0): Auth guard removido deste router porque o frontend (ticketService.ts)
# faz requests de leitura SQL sem session token — design atual é "service token no backend".
# Na Fase 1, ao refatorar o fluxo de auth, adicionar: dependencies=[Depends(verify_session)]
router = APIRouter(prefix="/api/v1/{context}/db", tags=["DB Read Engine (CQRS)"], dependencies=[Depends(verify_session)])


# ─── Endpoint: Agregação Dinâmica ────────────────────────────────────────

@router.get("/aggregate", operation_id="dbAggregate")
@limiter.limit("200/minute")
async def aggregate(
    request: Request,
    context: str,
    table: str = Query(..., description="Tabela GLPI (whitelist)"),
    group_by: str = Query(..., description="Coluna para GROUP BY"),
    agg_function: str = Query("count", pattern="^(count|sum|avg|min|max)$"),
    agg_column: str = Query("id", description="Coluna alvo da agregação"),
    # Filtros dinâmicos via query string
    status: Optional[str] = Query(None, description="Status filter: '1' ou '2,3,4'"),
    is_deleted: int = Query(0, description="Filtro is_deleted"),
    group_ids: Optional[str] = Query(None, description="IDs de grupo: '89,90,91'"),
    date_field: Optional[str] = Query(None, description="Coluna de data para filtro temporal"),
    date_from: Optional[str] = Query(None, description="Data início YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="Data fim YYYY-MM-DD"),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """
    [CQRS] Agregação SQL dinâmica. O Frontend define tabela, agrupamento e filtros.
    Substitui /dashboard/summary, /dashboard/backlog-by-technician e qualquer contagem fixa.
    """
    try:
        rows = await query_engine_service.run_aggregate(
            db=db,
            table=table,
            group_by=group_by,
            agg_function=agg_function,
            agg_column=agg_column,
            status=status,
            is_deleted=is_deleted,
            group_ids=group_ids,
            date_field=date_field,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
        )
        return {
            "context": context,
            "table": table,
            "group_by": group_by,
            "aggregation": agg_function,
            "data": rows,
        }
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=f"Aggregation error: {str(e)}")


# ─── Endpoint: Query Parametrizada ───────────────────────────────────────

@router.get("/query", operation_id="dbQuery")
@limiter.limit("200/minute")
async def query_table(
    request: Request,
    context: str,
    table: str = Query(..., description="Tabela principal (whitelist)"),
    columns: str = Query("*", description="Colunas separadas por vírgula"),
    join_table: Optional[str] = Query(None, description="Tabela para LEFT JOIN"),
    join_on: Optional[str] = Query(None, description="Condição ON (ex: items_id=id,itemtype=X)"),
    join_table2: Optional[str] = Query(None, description="Segunda tabela para LEFT JOIN"),
    join_on2: Optional[str] = Query(None, description="Segunda condição ON"),
    status: Optional[str] = Query(None, description="Filtro status"),
    is_deleted: Optional[int] = Query(None, description="Filtro is_deleted"),
    group_by: Optional[str] = Query(None),
    order_by: Optional[str] = Query(None, description="Coluna ASC|DESC"),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    """
    [CQRS] Query SQL parametrizada com JOINs opcionais.
    Substitui /domain/chargers/kanban e qualquer listagem SQL específica.
    """
    try:
        rows = await query_engine_service.run_dynamic_query(
            db=db,
            table=table,
            columns=columns,
            join_table=join_table,
            join_on=join_on,
            join_table2=join_table2,
            join_on2=join_on2,
            status=status,
            is_deleted=is_deleted,
            group_by=group_by,
            order_by=order_by,
            limit=limit,
        )
        return {
            "context": context,
            "table": table,
            "count": len(rows),
            "data": rows,
        }
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=f"Query error: {str(e)}")


# ─── Endpoint: KPIs (Parametrizado) ─────────────────────────────────────

@router.get("/kpis", operation_id="getKpis")
@limiter.limit("50/minute")
async def get_kpis(
    request: Request,
    context: str,
    group_ids: str = Query(..., description="IDs de grupo separados por vírgula: '89,90,91,92'"),
    period: Optional[str] = Query("current_month", description="current_month|last_month|YYYY-MM"),
    db: AsyncSession = Depends(get_db),
):
    """
    [CQRS] KPIs de governança. group_ids e period são OBRIGATORIAMENTE enviados pelo Frontend.
    Zero fallback, zero hardcode. O Frontend conhece os grupos do usuário logado.
    """
    gids = [int(g.strip()) for g in group_ids.split(",") if g.strip()]
    if not gids:
        raise HTTPException(status_code=400, detail="group_ids é obrigatório e não pode ser vazio.")

    try:
        result = await kpis_service.get_all_governance_kpis(db, gids, period)
        result["context"] = context
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"KPI calculation error: {str(e)}")


# ─── Endpoint: QA Inconsistências (Parametrizado) ────────────────────────
# Endpoint temporariamente comentado: `inconsistency_service.py` não existe mais/ainda na base de código
# @router.get("/qa", operation_id="getQaInconsistencies")
# @limiter.limit("50/minute")
# async def get_qa(
#     request: Request,
#     context: str,
#     group_ids: Optional[str] = Query(None, description="IDs de grupo para filtro: '21,22'"),
#     category_patterns: Optional[str] = Query(None, description="Padrões de categoria: 'Manutenção%%,CC-Manutenção%%'"),
#     limit_per_rule: int = Query(50, ge=1, le=200),
#     db: AsyncSession = Depends(get_db),
# ):
#     """
#     [CQRS] Inconsistências de qualidade. Filtros OPCIONAIS via query params.
#     Sem filtros = retorna todas as inconsistências. O Frontend decide o escopo.
#     """
#     gids = [int(g.strip()) for g in group_ids.split(",") if g.strip()] if group_ids else None
#     patterns = [p.strip() for p in category_patterns.split(",") if p.strip()] if category_patterns else None
# 
#     try:
#         # result = await inconsistency_service.get_inconsistencies(
#         #     db, group_ids=gids, category_patterns=patterns, limit_per_rule=limit_per_rule
#         # )
#         # result["context"] = context
#         # return result
#         raise HTTPException(status_code=501, detail="QA engine is currently offline")
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"QA engine error: {str(e)}")


# ─── Endpoint: Core Stats (Contagem por Status) ─────────────────────────

@router.get("/stats", operation_id="getCoreStats")
@limiter.limit("100/minute")
async def get_stats(
    request: Request,
    context: str,
    group_ids: Optional[str] = Query(None, description="IDs de grupo: '17' ou '89,90,91,92'"),
    department: Optional[str] = Query(None, description="Departamento SIS: 'manutencao' ou 'conservacao'"),
    db: AsyncSession = Depends(get_db),
):
    """
    [CQRS] Contagem real de tickets por status via SQL direto.
    Substitui o computeStats() do frontend que contava apenas 50 tickets.

    Sem filtros: retorna totais globais do contexto.
    group_ids: filtra por grupo(s) técnico(s).
    department: atalho SIS (resolve para group_id internamente).
    """
    gids = [int(g.strip()) for g in group_ids.split(",") if g.strip()] if group_ids else None

    try:
        result = await stats_service.get_core_stats(db, group_ids=gids, department=department)
        result["context"] = context
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stats error: {str(e)}")


# ─── Endpoint: Ticket Listing (Paginado com JOINs) ──────────────────────

@router.get("/tickets", response_model=TicketListResponse, operation_id="listTickets")
@limiter.limit("100/minute")
async def list_tickets_endpoint(
    request: Request,
    context: str,
    group_ids: Optional[str] = Query(None, description="IDs de grupo: '17' ou '21,22'"),
    department: Optional[str] = Query(None, description="Departamento SIS: 'manutencao' ou 'conservacao'"),
    status: Optional[str] = Query(None, description="Status filter: '1,2,3,4' (abertos)"),
    requester_id: Optional[int] = Query(None, description="Id do Usuário solicitante"),
    date_from: Optional[str] = Query(None, description="Data inicial YYYY-MM-DD (filtro opcional por t.date)"),
    date_to: Optional[str] = Query(None, description="Data final YYYY-MM-DD (filtro opcional por t.date)"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    [CQRS] Listagem de tickets com JOINs (requester, technician, category).
    Paginação real via SQL LIMIT/OFFSET. Substitui fetchTicketsByGroup/fetchAllTickets.
    """
    gids = [int(g.strip()) for g in group_ids.split(",") if g.strip()] if group_ids else None
    status_list = [int(s.strip()) for s in status.split(",") if s.strip()] if status else None
    if date_from and not re.match(r"^\d{4}-\d{2}-\d{2}$", date_from):
        raise HTTPException(status_code=400, detail="date_from deve estar no formato YYYY-MM-DD.")
    if date_to and not re.match(r"^\d{4}-\d{2}-\d{2}$", date_to):
        raise HTTPException(status_code=400, detail="date_to deve estar no formato YYYY-MM-DD.")

    try:
        result = await ticket_list_service.list_tickets(
            db, group_ids=gids, department=department,
            status_filter=status_list,
            requester_id=requester_id,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
            offset=offset,
        )
        result["context"] = context
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ticket list error: {str(e)}")
