"""
Router: DB Read Engine - MVP CQRS.
Mantem apenas as leituras realmente usadas pelo hub operacional canônico.
"""

import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth_guard import verify_session
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.schemas.search import TicketListResponse
from app.services import stats_service, ticket_list_service

router = APIRouter(
    prefix="/api/v1/{context}/db",
    tags=["DB Read Engine (CQRS)"],
    dependencies=[Depends(verify_session)],
)


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
    Contagem real de tickets por status via SQL direto.
    Sem filtros: retorna totais globais do contexto.
    """
    gids = [int(g.strip()) for g in group_ids.split(",") if g.strip()] if group_ids else None

    try:
        result = await stats_service.get_core_stats(db, group_ids=gids, department=department)
        result["context"] = context
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stats error: {str(e)}")


@router.get("/tickets", response_model=TicketListResponse, operation_id="listTickets")
@limiter.limit("100/minute")
async def list_tickets_endpoint(
    request: Request,
    context: str,
    group_ids: Optional[str] = Query(None, description="IDs de grupo: '17' ou '21,22'"),
    department: Optional[str] = Query(None, description="Departamento SIS: 'manutencao' ou 'conservacao'"),
    status: Optional[str] = Query(None, description="Status filter: '1,2,3,4' (abertos)"),
    requester_id: Optional[int] = Query(None, description="Id do Usuario solicitante"),
    date_from: Optional[str] = Query(None, description="Data inicial YYYY-MM-DD (filtro opcional por t.date)"),
    date_to: Optional[str] = Query(None, description="Data final YYYY-MM-DD (filtro opcional por t.date)"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    Listagem de tickets com JOINs (requester, technician, category).
    Paginacao real via SQL LIMIT/OFFSET.
    """
    gids = [int(g.strip()) for g in group_ids.split(",") if g.strip()] if group_ids else None
    status_list = [int(s.strip()) for s in status.split(",") if s.strip()] if status else None

    if date_from and not re.match(r"^\d{4}-\d{2}-\d{2}$", date_from):
        raise HTTPException(status_code=400, detail="date_from deve estar no formato YYYY-MM-DD.")
    if date_to and not re.match(r"^\d{4}-\d{2}-\d{2}$", date_to):
        raise HTTPException(status_code=400, detail="date_to deve estar no formato YYYY-MM-DD.")

    try:
        result = await ticket_list_service.list_tickets(
            db,
            group_ids=gids,
            department=department,
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
